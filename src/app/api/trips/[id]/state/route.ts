import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { normalizeTripState, TripStatePatch, getDayProgress, recordDayProgress, activityKeys } from '@/lib/trip-state';
import { getHueClock } from '@/lib/travel-clock';

function ownedTrip(db: ReturnType<typeof getDb>, tripId: string, userId: string) {
  return db.prepare('SELECT id, itinerary, start_date, status FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId) as { id: string; itinerary: string; start_date: string | null; status: string } | undefined;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const trip = ownedTrip(db, params.id, userId);
  if (!trip) return Response.json({ error: 'Không tìm thấy hành trình' }, { status: 404 });

  const row = db.prepare('SELECT * FROM trip_state WHERE trip_id = ? AND user_id = ?').get(params.id, userId);
  return Response.json({ state: normalizeTripState(row, params.id, JSON.parse(trip.itinerary || '{}').days || []) });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const trip = ownedTrip(db, params.id, userId);
  if (!trip) return Response.json({ error: 'Không tìm thấy hành trình' }, { status: 404 });

  const input: unknown = await req.json().catch(() => null);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Response.json({ error: 'Thông tin chuyến đi chưa hợp lệ. Hãy tải lại và thử lại.' }, { status: 400 });
  }
  const value = input as Record<string, unknown>;
  if (value.startTodayIfMissing !== undefined && typeof value.startTodayIfMissing !== 'boolean') return Response.json({ error: 'Lựa chọn ngày khởi hành chưa hợp lệ.' }, { status: 400 });
  if (value.startTodayIfMissing === true && trip.start_date) return Response.json({ error: 'Lịch đã có ngày khởi hành. Hãy tải lại để xem ngày hiện tại.' }, { status: 409 });
  if (value.startTodayIfMissing === true && trip.status !== 'active') return Response.json({ error: 'Chuyến này không ở trạng thái đang đi.' }, { status: 400 });
  const allowedFields = ['dayIndex', 'currentActivityIndex', 'completedActivityIndexes', 'visitedPlaceIds', 'lastLocation', 'fatigue', 'travelMode', 'lastWeather', 'startedAt'];
  const body = Object.fromEntries(Object.entries(value).filter(([key]) => allowedFields.includes(key))) as TripStatePatch;
  const requestedAt = new Date();
  const chosenStartDate = value.startTodayIfMissing === true ? getHueClock(requestedAt).date : trip.start_date;
  if (value.startTodayIfMissing === true) { body.dayIndex = 0; body.startedAt = requestedAt.toISOString(); }
  const current = db.prepare('SELECT * FROM trip_state WHERE trip_id = ? AND user_id = ?').get(params.id, userId);
  const days = JSON.parse(trip.itinerary || '{}').days || [];
  const existing = normalizeTripState(current, params.id, days);
  if (current && value.expectedUpdatedAt !== undefined && value.expectedUpdatedAt !== existing.updatedAt) {
    return Response.json({ error: 'Tiến độ đã thay đổi ở một cửa sổ khác. Hãy tải lại tiến độ trước khi lưu.' }, { status: 409 });
  }
  const targetDay = body.dayIndex ?? existing.dayIndex;
  const progress = getDayProgress(existing, targetDay, days[targetDay]?.activities || []);
  const next = { ...existing, ...progress, ...body, tripId: params.id, updatedAt: new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString() };

  if (!Number.isInteger(next.dayIndex) || next.dayIndex < 0 || next.dayIndex >= days.length) {
    return Response.json({ error: 'Ngày được chọn không có trong hành trình. Hãy tải lại lịch.' }, { status: 400 });
  }
  if (value.expectedActivityKeys !== undefined && JSON.stringify(value.expectedActivityKeys) !== JSON.stringify(activityKeys(days[next.dayIndex]?.activities || []))) {
    return Response.json({ error: 'Lịch vừa thay đổi. Hãy tải lại để đánh dấu đúng hoạt động.' }, { status: 409 });
  }
  const activityCount = days[next.dayIndex]?.activities?.length || 0;
  const validIndex = (index: unknown) => Number.isInteger(index) && Number(index) >= 0 && Number(index) < activityCount;
  if (next.currentActivityIndex !== null && !validIndex(next.currentActivityIndex)) {
    return Response.json({ error: 'Hoạt động được chọn không có trong ngày này. Hãy tải lại lịch.' }, { status: 400 });
  }
  if (!Array.isArray(next.completedActivityIndexes) || next.completedActivityIndexes.length > activityCount || !next.completedActivityIndexes.every(validIndex) ||
      !Array.isArray(next.visitedPlaceIds) || next.visitedPlaceIds.length > 1000 || !next.visitedPlaceIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 200)) {
    return Response.json({ error: 'Danh sách hoạt động đã đi chưa hợp lệ. Hãy tải lại và thử lại.' }, { status: 400 });
  }
  if (!['fresh', 'okay', 'tired'].includes(next.fatigue) || !['walking', 'bike', 'car', 'taxi', 'unknown'].includes(next.travelMode)) {
    return Response.json({ error: 'Trạng thái di chuyển chưa hợp lệ.' }, { status: 400 });
  }
  if (next.lastLocation !== null && (typeof next.lastLocation !== 'object' || Array.isArray(next.lastLocation) ||
      !Number.isFinite(next.lastLocation.lat) || Math.abs(next.lastLocation.lat) > 90 ||
      !Number.isFinite(next.lastLocation.lng) || Math.abs(next.lastLocation.lng) > 180 ||
      (next.lastLocation.accuracy !== undefined && (!Number.isFinite(next.lastLocation.accuracy) || next.lastLocation.accuracy < 0)))) {
    return Response.json({ error: 'Vị trí chưa hợp lệ. Hãy thử xác định vị trí lại.' }, { status: 400 });
  }
  if (next.lastWeather !== null && (typeof next.lastWeather !== 'object' || Array.isArray(next.lastWeather) ||
      (next.lastWeather.condition !== undefined && (typeof next.lastWeather.condition !== 'string' || next.lastWeather.condition.length > 100)) ||
      (next.lastWeather.temp !== undefined && next.lastWeather.temp !== null && (!Number.isFinite(next.lastWeather.temp) || Math.abs(next.lastWeather.temp) > 80)))) {
    return Response.json({ error: 'Thông tin thời tiết chưa hợp lệ.' }, { status: 400 });
  }
  if (next.startedAt !== null && (typeof next.startedAt !== 'string' || !Number.isFinite(Date.parse(next.startedAt)))) {
    return Response.json({ error: 'Thời gian bắt đầu chuyến đi chưa hợp lệ.' }, { status: 400 });
  }

  const completed = [...new Set(next.completedActivityIndexes.filter(Number.isInteger).filter(v => v >= 0))];
  const dayProgress = recordDayProgress({ ...next, completedActivityIndexes: completed }, days[next.dayIndex]?.activities || []);
  const trackedState = { ...next, completedActivityIndexes: completed, dayProgress };
  const visited = body.completedActivityIndexes !== undefined && body.visitedPlaceIds === undefined
    ? [...new Set(days.flatMap((day: any, index: number) => {
        const done = getDayProgress(trackedState, index, day.activities || []).completedActivityIndexes;
        return (day.activities || []).filter((_: any, i: number) => done.includes(i)).map((activity: any) => activity.place_id).filter((id: unknown) => typeof id === 'string' && id);
      }))]
    : [...new Set(next.visitedPlaceIds)];

  db.transaction(() => {
  db.prepare(`
    INSERT INTO trip_state (
      trip_id, user_id, day_index, current_activity_index, completed_activity_indexes,
      visited_place_ids, last_lat, last_lng, last_location_accuracy, fatigue,
      travel_mode, last_weather, started_at, updated_at, day_progress
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(trip_id) DO UPDATE SET
      day_index = excluded.day_index,
      current_activity_index = excluded.current_activity_index,
      completed_activity_indexes = excluded.completed_activity_indexes,
      visited_place_ids = excluded.visited_place_ids,
      last_lat = excluded.last_lat,
      last_lng = excluded.last_lng,
      last_location_accuracy = excluded.last_location_accuracy,
      fatigue = excluded.fatigue,
      travel_mode = excluded.travel_mode,
      last_weather = excluded.last_weather,
      started_at = excluded.started_at,
      updated_at = excluded.updated_at,
      day_progress = excluded.day_progress
  `).run(
    params.id, userId, next.dayIndex, next.currentActivityIndex, JSON.stringify(completed),
    JSON.stringify(visited), next.lastLocation?.lat ?? null, next.lastLocation?.lng ?? null,
    next.lastLocation?.accuracy ?? null, next.fatigue, next.travelMode,
    next.lastWeather ? JSON.stringify(next.lastWeather) : null, next.startedAt, next.updatedAt, JSON.stringify(dayProgress),
  );

    if (value.startTodayIfMissing === true) db.prepare('UPDATE trips SET start_date = ? WHERE id = ? AND user_id = ?').run(chosenStartDate, params.id, userId);
  })();

  const saved = db.prepare('SELECT * FROM trip_state WHERE trip_id = ? AND user_id = ?').get(params.id, userId);
  return Response.json({ state: normalizeTripState(saved, params.id, days), startDate: chosenStartDate });
}
