import { NextRequest } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { suggestTripInsertion } from '@/lib/trip-insertion';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const dayIndex = Number(searchParams.get('dayIndex') || 0);
  if (!placeId || !Number.isInteger(dayIndex)) return Response.json({ error: 'Thiếu địa điểm hoặc ngày' }, { status: 400 });

  const db = getDb();
  const trip = db.prepare('SELECT itinerary, user_id FROM trips WHERE id = ?').get(params.id) as any;
  if (!trip || trip.user_id !== userId) return Response.json({ error: 'Không có quyền chỉnh sửa' }, { status: 403 });
  const place = db.prepare('SELECT id, name, category, duration, avg_visit_min, lat, lng FROM places WHERE id = ?').get(placeId) as any;
  if (!place) return Response.json({ error: 'Không tìm thấy địa điểm' }, { status: 404 });

  const itinerary = JSON.parse(trip.itinerary || '{}');
  const day = itinerary.days?.[dayIndex];
  if (!day) return Response.json({ error: 'Ngày không hợp lệ' }, { status: 400 });
  if ((day.activities || []).some((activity: any) => activity.place_id === placeId || activity.name === place.name)) {
    return Response.json({ feasible: false, reason: 'Địa điểm này đã có trong ngày đã chọn.' });
  }

  return Response.json(suggestTripInsertion(day.activities || [], place));
}
