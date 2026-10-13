import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { computeRoute, googleRoutingConfigured, valhallaEndpoint, itineraryFingerprint, validRoutePoint } from '@/lib/navigation-route';
import { tripDayIndex } from '@/lib/travel-clock';
import { evaluatePlaceTrust } from '@/lib/place-trust';
import { getOpeningStatus, parseOpeningHours } from '@/lib/opening-hours';
import { getDayProgress, normalizeTripState } from '@/lib/trip-state';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });
const routeRequests = new Map<string, { start: number; count: number }>();

function allowRouteRequest(userId: string, now = Date.now()) {
  const previous = routeRequests.get(userId);
  const current = !previous || now - previous.start >= 60_000 ? { start: now, count: 0 } : previous;
  current.count += 1;
  routeRequests.set(userId, current);
  if (routeRequests.size > 1000) for (const [key, value] of routeRequests) if (now - value.start >= 60_000) routeRequests.delete(key);
  return current.count <= 20;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = getAuthUserId(req);
  const trip = getDb().prepare('SELECT user_id, is_shared FROM trips WHERE id=?').get(id) as { user_id: string; is_shared: number } | undefined;
  if (!trip || (trip.user_id !== userId && !trip.is_shared)) return error('Không tìm thấy hành trình.', 404);
  return Response.json({ provider: googleRoutingConfigured() ? 'google' : 'valhalla', routingAvailable: googleRoutingConfigured() || Boolean(valhallaEndpoint()), modes: googleRoutingConfigured() ? ['WALK', 'DRIVE'] : ['WALK'], canNavigate: trip.user_id === userId }, { headers });
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = getAuthUserId(req);
  if (!userId) return error('Cần đăng nhập để xem tuyến của hành trình.', 401);
  const db = getDb();
  const trip = db.prepare('SELECT itinerary, status, start_date FROM trips WHERE id=? AND user_id=?').get(id, userId) as { itinerary: string; status: string; start_date: string | null } | undefined;
  if (!trip) return error('Không tìm thấy hành trình của bạn.', 404);
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !['dayIndex', 'targetIndex', 'scope', 'mode', 'origin'].includes(key))) return error('Yêu cầu chỉ đường chưa hợp lệ.', 400);
  if (!Number.isInteger(raw.dayIndex) || !Number.isInteger(raw.targetIndex) || !['WALK', 'DRIVE'].includes(raw.mode) || !['day', 'point'].includes(raw.scope) || (raw.origin !== undefined && !validRoutePoint(raw.origin))) return error('Ngày, điểm đến hoặc vị trí chưa hợp lệ.', 400);
  if (!googleRoutingConfigured() && raw.mode !== 'WALK') return error('Chế độ ô tô cần cấu hình Google Routes.', 400);
  const itinerary = JSON.parse(trip.itinerary || '{}');
  const day = itinerary.days?.[raw.dayIndex];
  const activities: any[] = Array.isArray(day?.activities) ? day.activities : [];
  if (raw.dayIndex < 0 || !day || raw.targetIndex < 0 || raw.targetIndex >= activities.length) return error('Điểm đến không có trong ngày đã chọn.', 400);
  const stateRow = db.prepare('SELECT * FROM trip_state WHERE trip_id=? AND user_id=?').get(id, userId);
  const state = normalizeTripState(stateRow, id, itinerary.days || []);
  if (raw.origin && (trip.status !== 'active' || !state.startedAt || tripDayIndex(trip.start_date) !== raw.dayIndex)) return error('Vị trí trực tiếp chỉ dùng cho ngày đang đi của chuyến đã bắt đầu.', 400);
  const completed = new Set(getDayProgress(state, raw.dayIndex, activities).completedActivityIndexes);
  if (raw.scope === 'point' && completed.has(raw.targetIndex)) return error('Điểm này đã hoàn thành. Hãy chọn điểm chưa đi.', 400);
  const destination = validRoutePoint(activities[raw.targetIndex]);
  if (!destination) return error('Điểm đến chưa có tọa độ đáng tin để chỉ đường.', 422);
  let origin = raw.origin ? validRoutePoint(raw.origin) : null;
  let intermediates: Array<{ lat: number; lng: number }> = [];
  if (raw.scope === 'day') {
    if (raw.targetIndex === 0) return error('Cần ít nhất hai điểm để xem tuyến cả ngày.', 422);
    const preceding = activities.slice(0, raw.targetIndex);
    const points = preceding.map(validRoutePoint);
    if (points.some(point => !point)) return error('Có điểm trong ngày thiếu tọa độ. Hãy chọn một chặng có vị trí rõ ràng.', 422);
    if (!origin) origin = points[0];
    intermediates = origin === points[0] ? points.slice(1) as Array<{ lat: number; lng: number }> : points as Array<{ lat: number; lng: number }>;
  }
  if (!origin) return error('Hãy bật vị trí hiện tại để chỉ đường đến điểm đã chọn.', 422);
  if (!allowRouteRequest(userId)) return error('Đã kiểm tra tuyến nhiều lần. Hãy thử lại sau một phút.', 429);
  try {
    const route = await computeRoute(origin, destination, raw.targetIndex, raw.mode, itineraryFingerprint(itinerary), intermediates);
    if (!route) return error('Chưa lấy được tuyến đường phù hợp. Bạn có thể thử lại hoặc mở Google Maps.', 503);
    if (raw.scope === 'point' && raw.origin && route.provider === 'google') {
      const place = db.prepare('SELECT * FROM places WHERE id=?').get(activities[raw.targetIndex]?.place_id) as Record<string, any> | undefined;
      if (place && evaluatePlaceTrust(place).operationalFresh) {
        const status = getOpeningStatus(parseOpeningHours(place.opening_hours, place.hours_time), new Date(Date.now() + route.durationSeconds * 1000));
        route.arrivalStatus = { status: status.status, label: status.label, checkedAt: place.verified_at };
      } else route.arrivalStatus = { status: 'unknown', label: 'Giờ mở cửa cần được xác nhận với địa điểm.' };
    }
    return Response.json({ route }, { headers });
  } catch { return error('Dịch vụ chỉ đường đang gián đoạn. Hãy thử lại.', 503); }
}
