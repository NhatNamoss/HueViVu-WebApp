import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { customizeTrip } from '@/lib/ai';
import { validateItinerary } from '@/lib/itinerary-validator';

// POST /api/trips/[id]/customize
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return Response.json({ error: 'Cần đăng nhập hoặc phiên khách hợp lệ' }, { status: 401 });
    const { instruction, proposal } = await req.json();
    if (!instruction && !proposal) return Response.json({ error: 'Thiếu chỉ dẫn điều chỉnh' }, { status: 400 });

    const db = getDb();
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id) as any;
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    if (trip.user_id !== userId) {
      return Response.json({ error: 'Không có quyền chỉnh sửa' }, { status: 403 });
    }

    const newItinerary = proposal || await customizeTrip(trip, instruction);
    if (!Array.isArray(newItinerary?.days)) return Response.json({ error: 'Phương án điều chỉnh không hợp lệ' }, { status: 400 });

    const knownPlaces = new Set((db.prepare('SELECT name FROM places').all() as any[]).map(row => row.name));
    const unknown = newItinerary.days.flatMap((day: any) => day.activities || [])
      .filter((activity: any) => activity.type !== 'rest' && !knownPlaces.has(activity.name))
      .map((activity: any) => activity.name);
    if (unknown.length) {
      return Response.json({ error: `AI đề xuất địa điểm chưa được kiểm chứng: ${Array.from(new Set(unknown)).join(', ')}` }, { status: 422 });
    }

    db.prepare(`UPDATE trips SET title = ?, summary = ?, itinerary = ?, highlights = ?, ai_insight = ?, total_cost_estimate = ? WHERE id = ?`).run(
      newItinerary.title || trip.title,
      newItinerary.summary || trip.summary,
      JSON.stringify(newItinerary),
      JSON.stringify(newItinerary.highlights || []),
      newItinerary.ai_insight || trip.ai_insight,
      newItinerary.total_cost_estimate || trip.total_cost_estimate,
      params.id
    );

    return Response.json({
      tripId: params.id,
      trip: { id: params.id, ...newItinerary },
      feasibility: validateItinerary({ days: newItinerary.days }, trip.start_date),
    });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi điều chỉnh lịch trình: ' + err.message }, { status: 500 });
  }
}
