import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { adaptTrip } from '@/lib/trip-adapter';
import { detectReplanNeed } from '@/lib/dynamic-replanning';
import { normalizeTripState, getDayProgress } from '@/lib/trip-state';
import { getHueClock, tripDayIndex } from '@/lib/travel-clock';
import { logger } from '@/lib/logger';
import { fetchHueWeather, isWeatherUsable } from '@/lib/hue-weather';
import { computeRoute, googleRoutingConfigured, itineraryFingerprint, validRoutePoint } from '@/lib/navigation-route';
import { scheduledMinutes } from '@/lib/travel-clock';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập hoặc phiên khách hợp lệ' }, { status: 401 });
  try {
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return Response.json({ error: 'Thông tin kiểm tra lịch chưa hợp lệ.' }, { status: 400 });
    if ((input.trigger !== undefined && input.trigger !== 'weather') || (input.assessOnly !== undefined && typeof input.assessOnly !== 'boolean') || (input.assessOnly === true && input.trigger !== 'weather')) return Response.json({ error: 'Chế độ kiểm tra lịch chưa hợp lệ.' }, { status: 400 });
    const db = getDb();
    const trip = db.prepare('SELECT id, itinerary, start_date, status FROM trips WHERE id = ? AND user_id = ?').get(params.id, userId) as any;
    if (!trip) return Response.json({ error: 'Không tìm thấy lịch trình hoặc bạn không có quyền sửa' }, { status: 404 });
    const itinerary = JSON.parse(trip.itinerary || '{}');
    const now = new Date();
    const days = itinerary.days || [];
    if (input.dayIndex !== undefined && (!Number.isInteger(input.dayIndex) || !days[input.dayIndex])) return Response.json({ error: 'Ngày được chọn không có trong lịch.' }, { status: 400 });
    if (input.delayMinutes !== undefined && (!Number.isFinite(input.delayMinutes) || input.delayMinutes < 15 || input.delayMinutes > 180)) return Response.json({ error: 'Hãy chọn thời gian trễ từ 15 đến 180 phút.' }, { status: 400 });
    if ((input.lat !== undefined || input.lng !== undefined) && (!Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180)) return Response.json({ error: 'Vị trí chưa hợp lệ. Bạn vẫn có thể kiểm tra lịch mà không dùng vị trí.' }, { status: 400 });
    const today = tripDayIndex(trip.start_date, now);
    const dayIndex = input.dayIndex ?? (today !== null && today >= 0 && today < days.length ? today : 0);
    const selectedDay = days[dayIndex] || { activities: [] };
    if (input.routeTargetIndex !== undefined && (!Number.isInteger(input.routeTargetIndex) || !selectedDay.activities?.[input.routeTargetIndex])) return Response.json({ error: 'Điểm đang đi tới chưa hợp lệ.' }, { status: 400 });
    const stateRow = db.prepare('SELECT * FROM trip_state WHERE trip_id = ? AND user_id = ?').get(params.id, userId) as { updated_at?: string } | undefined;
    const state = normalizeTripState(stateRow, params.id, days);
    const progress = getDayProgress(state, dayIndex, selectedDay.activities || []);
    const places = db.prepare("SELECT id, indoor, weather_dependent FROM places WHERE publication_status = 'published'").all() as Array<{ id: string; indoor: number; weather_dependent: string | number }>;
    const lookup = new Map(places.map(place => [place.id, place]));
    const activities = selectedDay.activities.map((activity: any) => {
      const place = lookup.get(activity.place_id);
      return { ...activity, indoor: place?.indoor === 1, weatherDependent: place?.weather_dependent === 1 || place?.weather_dependent === '1' };
    });
    const base = { now, startDate: trip.start_date, status: trip.status, duration: days.length, startedAt: state.startedAt, activities, dayIndex, completedActivityIndexes: progress.completedActivityIndexes, fatigue: state.fatigue, weatherOnly: input.trigger === 'weather' };
    let decision = detectReplanNeed(base);
    // Do not fetch today's weather for future, finished, unstarted or completed days.
    const eligible = today === dayIndex && today !== null && today >= 0 && today < days.length && trip.status === 'active' && state.startedAt && progress.completedActivityIndexes.length < activities.length;
    const currentMinutes = getHueClock(now).minutes;
    const nextIndex = Number.isInteger(input.routeTargetIndex) ? input.routeTargetIndex : activities.findIndex((activity: any, index: number) => !progress.completedActivityIndexes.includes(index) && (scheduledMinutes(activity.time) ?? -1) >= currentMinutes - 90 && validRoutePoint(activity));
    const routeOrigin = validRoutePoint({ lat: input.lat, lng: input.lng });
    const routeDestination = validRoutePoint(activities[nextIndex]);
    const routeEligible = eligible && input.assessOnly !== true && googleRoutingConfigured() && routeOrigin && routeDestination && nextIndex >= 0 && !progress.completedActivityIndexes.includes(nextIndex);
    const [weatherData, measuredRoute] = await Promise.all([
      eligible ? fetchHueWeather() : Promise.resolve(null),
      routeEligible ? computeRoute(routeOrigin, routeDestination, nextIndex, 'WALK', itineraryFingerprint(itinerary)).catch(() => null) : Promise.resolve(null),
    ]);
    const weather = isWeatherUsable(weatherData) ? { condition: weatherData.condition, temp: weatherData.temp } : null;
    if (weather) decision = detectReplanNeed({ ...base, weather });
    if (input.assessOnly === true) return Response.json({ assessment: true, decision, weatherFresh: !!weather, weatherAt: weather ? weatherData?.data_at : null }, { headers: { 'Cache-Control': 'private, no-store' } });
    const routeEtaMinutes = measuredRoute?.provider === 'google' ? Math.ceil(measuredRoute.durationSeconds / 60) : null;
    const scheduled = scheduledMinutes(activities[nextIndex]?.time);
    const routeLateMinutes = routeEtaMinutes !== null && scheduled !== null ? currentMinutes + routeEtaMinutes - scheduled : null;
    if (!decision.scenario && routeLateMinutes !== null && routeLateMinutes > 10 && routeLateMinutes <= 180) {
      decision = { scenario: 'late', dayIndex, reason: `Theo đường đi hiện tại, cần khoảng ${routeEtaMinutes} phút để đến ${activities[nextIndex].name}; có thể trễ giờ dự kiến khoảng ${routeLateMinutes} phút. Xem phương án trước khi đổi lịch.`, confidence: 0.88, signals: ['route:late'] };
    }
    const routeImpact = measuredRoute?.provider === 'google' ? { source: 'Google Routes', computedAt: measuredRoute.computedAt, nextActivity: activities[nextIndex]?.name, distanceMeters: measuredRoute.distanceMeters, durationMinutes: routeEtaMinutes, scheduledTime: activities[nextIndex]?.time, estimatedLateMinutes: routeLateMinutes !== null ? Math.max(0, routeLateMinutes) : null } : null;
    if (!decision.scenario && routeLateMinutes !== null && routeLateMinutes > 180) return Response.json({ preview: true, changed: false, decision, routeImpact, message: 'Thời gian đi theo tuyến có thể vượt lịch hơn 3 giờ. Hãy chọn điểm gần hơn hoặc điều chỉnh chuyến đi thủ công; lịch hiện tại vẫn được giữ.' });
    if (!decision.scenario) return Response.json({ preview: true, changed: false, decision, routeImpact, message: decision.reason });
    const adaptInput = {
      scenario: decision.scenario, dayIndex: decision.dayIndex,
      activityIndex: Number.isInteger(input.activityIndex) ? input.activityIndex : undefined,
      delayMinutes: decision.signals.includes('route:late') ? Math.max(input.delayMinutes || 45, Math.min(180, (routeLateMinutes || 0) + 10)) : input.delayMinutes || 45,
      currentTime: getHueClock(now).time,
      lat: input.lat, lng: input.lng, expectedStateUpdatedAt: stateRow?.updated_at || null,
    };
    const result = adaptTrip(itinerary, { ...adaptInput, completedActivityIndexes: progress.completedActivityIndexes });
    const changed = JSON.stringify(selectedDay.activities) !== JSON.stringify(result.itinerary.days?.[decision.dayIndex]?.activities);
    if (!changed) return Response.json({ preview: true, changed: false, decision, routeImpact, changes: result.changes, message: result.changes[0] || 'Chưa tìm được phương án phù hợp hơn. Lịch của bạn vẫn được giữ nguyên. ' + decision.reason });
    let replacementRoute = null;
    let replacementName: string | null = null;
    if (routeImpact && routeOrigin && (decision.scenario === 'rain' || decision.scenario === 'closed')) {
      const replacement = result.itinerary.days?.[dayIndex]?.activities.find((activity: any) => activity.time === activities[nextIndex]?.time && activity.name !== activities[nextIndex]?.name && validRoutePoint(activity));
      const replacementPoint = validRoutePoint(replacement);
      if (replacementPoint) { replacementName = replacement.name; replacementRoute = await computeRoute(routeOrigin, replacementPoint, nextIndex, 'WALK', itineraryFingerprint(result.itinerary)).catch(() => null); }
    }
    return Response.json({ preview: true, changed: true, decision, routeImpact: routeImpact && { ...routeImpact, replacement: replacementRoute?.provider === 'google' ? { destination: replacementName, distanceMeters: replacementRoute.distanceMeters, durationMinutes: Math.ceil(replacementRoute.durationSeconds / 60) } : null }, itinerary: result.itinerary, changes: result.changes, expectedItinerary: trip.itinerary, expectedStateUpdatedAt: stateRow?.updated_at || null, input: adaptInput });
  } catch (error) {
    logger.error('Automatic replan failed', { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: 'Chưa thể kiểm tra lịch lúc này. Hãy thử lại hoặc chọn một tình huống để xem phương án thủ công.' }, { status: 500 });
  }
}
