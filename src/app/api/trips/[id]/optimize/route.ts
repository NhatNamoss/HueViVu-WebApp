import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { optimizeItinerary } from '@/lib/itinerary-validator';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập hoặc phiên khách hợp lệ' }, { status: 401 });
  const db = getDb();
  let preview = false;
  try { preview = Boolean((await req.json())?.preview); } catch {}
  const trip = db.prepare('SELECT itinerary, start_date, user_id FROM trips WHERE id = ?').get(params.id) as any;
  if (!trip || trip.user_id !== userId) return Response.json({ error: 'Không tìm thấy lịch trình hoặc bạn không có quyền sửa' }, { status: 404 });
  const result = optimizeItinerary(JSON.parse(trip.itinerary || '{}'), trip.start_date);
  if (preview) return Response.json({ success: true, preview: true, ...result });
  db.prepare('UPDATE trips SET itinerary = ?, ai_insight = ? WHERE id = ?').run(
    JSON.stringify(result.itinerary),
    result.changes.length ? `Đã tối ưu: ${result.changes.slice(0, 4).join('. ')}` : 'Lịch trình chưa cần thay đổi tự động.',
    params.id,
  );
  return Response.json({ success: true, ...result });
}
