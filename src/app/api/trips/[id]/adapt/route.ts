import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { adaptTrip } from '@/lib/trip-adapter';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const userId = getAuthUserId(req);
    if (!userId) return Response.json({ error: 'Cần đăng nhập hoặc phiên khách hợp lệ' }, { status: 401 });
    const input = await req.json();
    if (!['late', 'rain', 'hungry', 'tired', 'closed'].includes(input.scenario)) {
      return Response.json({ error: 'Tình huống không hợp lệ' }, { status: 400 });
    }
    const db = getDb();
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(params.id, userId) as any;
    if (!trip) return Response.json({ error: 'Không tìm thấy lịch trình hoặc bạn không có quyền sửa' }, { status: 404 });
    const current = JSON.parse(trip.itinerary || '{}');
    if (!Number.isInteger(input.dayIndex) || !current.days?.[input.dayIndex] || (input.currentTime !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.currentTime))) return Response.json({ error: 'Hãy chọn ngày và giờ hợp lệ.' }, { status: 400 });
    if (input.preview !== true && typeof input.expectedItinerary === 'string' && input.expectedItinerary !== trip.itinerary) return Response.json({ error: 'Lịch trình vừa thay đổi. Hãy xem lại phương án trước khi áp dụng.' }, { status: 409 });
    const result = adaptTrip(current, input);
    const changed = JSON.stringify(current.days.map((day: any) => day.activities)) !== JSON.stringify(result.itinerary.days.map((day: any) => day.activities));
    if (!changed) return Response.json({ preview: input.preview === true, changed: false, itinerary: current, changes: [], message: 'Không có thay đổi phù hợp lúc này. Các hoạt động có thể đã qua giờ hoặc chưa có điểm thay thế; lịch hiện tại vẫn được giữ.' });
    if (input.preview === true) return Response.json({ preview: true, itinerary: result.itinerary, changes: result.changes, expectedItinerary: trip.itinerary });
    db.prepare('UPDATE trips SET itinerary = ?, ai_insight = ? WHERE id = ?').run(
      JSON.stringify(result.itinerary), `⚡ ${result.changes.join('. ')}`, params.id,
    );
    return Response.json({ success: true, itinerary: result.itinerary, changes: result.changes });
  } catch (error: any) {
    return Response.json({ error: 'Không thể thích nghi lịch trình: ' + error.message }, { status: 500 });
  }
}
