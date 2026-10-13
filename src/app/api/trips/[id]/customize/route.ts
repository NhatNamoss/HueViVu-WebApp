import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { customizeTrip } from '@/lib/ai';
import { validateItinerary } from '@/lib/itinerary-validator';
import { normalizeTripState } from '@/lib/trip-state';
import { validateTripChange } from '@/lib/trip-change-guard';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const userId = getAuthUserId(req);
    if (!userId) return Response.json({ error: 'Cần đăng nhập hoặc phiên khách hợp lệ' }, { status: 401 });
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== 'object' || Array.isArray(input) || (input.instruction !== undefined && (typeof input.instruction !== 'string' || input.instruction.length > 2000)) || (!input.proposal && !input.instruction?.trim())) return Response.json({ error: 'Chỉ dẫn chưa hợp lệ.' }, { status: 400 });
    const db = getDb();
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!trip) return Response.json({ error: 'Không tìm thấy lịch trình của bạn.' }, { status: 404 });
    const before = JSON.parse(trip.itinerary || '{}');
    const stateRow = db.prepare('SELECT * FROM trip_state WHERE trip_id = ? AND user_id = ?').get(id, userId) as any;
    const candidate = input.proposal || await customizeTrip(trip, input.instruction);
    const published = db.prepare("SELECT id, name FROM places WHERE publication_status = 'published'").all() as any[];
    const error = validateTripChange(before, candidate, normalizeTripState(stateRow, id, before.days || []), published);
    if (error) return Response.json({ error }, { status: 422 });
    if (input.preview === true || !input.proposal) return Response.json({ preview: true, proposal: candidate, expectedItinerary: trip.itinerary, expectedStateUpdatedAt: stateRow?.updated_at || null, feasibility: validateItinerary(candidate, trip.start_date) });
    if (typeof input.expectedItinerary !== 'string' || !Object.prototype.hasOwnProperty.call(input, 'expectedStateUpdatedAt')) return Response.json({ error: 'Hãy xem trước phương án rồi xác nhận thay đổi.' }, { status: 400 });
    const saved = db.transaction(() => {
      const latest = db.prepare('SELECT itinerary FROM trips WHERE id = ? AND user_id = ?').get(id, userId) as any;
      const latestState = db.prepare('SELECT updated_at FROM trip_state WHERE trip_id = ? AND user_id = ?').get(id, userId) as any;
      if (!latest || latest.itinerary !== input.expectedItinerary || (latestState?.updated_at || null) !== input.expectedStateUpdatedAt) return false;
      db.prepare('UPDATE trips SET title = ?, summary = ?, itinerary = ?, highlights = ?, ai_insight = ?, total_cost_estimate = ? WHERE id = ?').run(candidate.title || trip.title, candidate.summary || trip.summary, JSON.stringify(candidate), JSON.stringify(candidate.highlights || []), candidate.ai_insight || trip.ai_insight, candidate.total_cost_estimate || trip.total_cost_estimate, id);
      if (stateRow) db.prepare('UPDATE trip_state SET day_progress = ?, updated_at = ? WHERE trip_id = ? AND user_id = ?').run(JSON.stringify(normalizeTripState(stateRow, id, before.days || []).dayProgress), new Date().toISOString(), id, userId);
      return true;
    })();
    if (!saved) return Response.json({ error: 'Lịch hoặc tiến độ vừa thay đổi. Hãy tạo lại phương án để giữ các điểm đã đi.' }, { status: 409 });
    return Response.json({ tripId: id, trip: { ...candidate, id }, feasibility: validateItinerary(candidate, trip.start_date) });
  } catch {
    return Response.json({ error: 'Chưa điều chỉnh được lịch trình. Lịch hiện tại vẫn được giữ.' }, { status: 500 });
  }
}
