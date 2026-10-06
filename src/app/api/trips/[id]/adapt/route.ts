import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { adaptTrip } from '@/lib/trip-adapter';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    const result = adaptTrip(current, input);
    db.prepare('UPDATE trips SET itinerary = ?, ai_insight = ? WHERE id = ?').run(
      JSON.stringify(result.itinerary), `⚡ ${result.changes.join('. ')}`, params.id,
    );
    return Response.json({ success: true, itinerary: result.itinerary, changes: result.changes });
  } catch (error: any) {
    return Response.json({ error: 'Không thể thích nghi lịch trình: ' + error.message }, { status: 500 });
  }
}
