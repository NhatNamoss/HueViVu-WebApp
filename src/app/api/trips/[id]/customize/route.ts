import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { customizeTrip } from '@/lib/ai';

// POST /api/trips/[id]/customize
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getAuthUserId(req);
    const { instruction } = await req.json();
    if (!instruction) return Response.json({ error: 'Thiếu chỉ dẫn điều chỉnh' }, { status: 400 });

    const db = getDb();
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id) as any;
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    if (userId && trip.user_id !== userId && trip.user_id !== 'user_demo001') {
      return Response.json({ error: 'Không có quyền chỉnh sửa' }, { status: 403 });
    }

    const newItinerary = await customizeTrip(trip, instruction);

    db.prepare(`UPDATE trips SET title = ?, summary = ?, itinerary = ?, highlights = ?, ai_insight = ?, total_cost_estimate = ? WHERE id = ?`).run(
      newItinerary.title || trip.title,
      newItinerary.summary || trip.summary,
      JSON.stringify(newItinerary),
      JSON.stringify(newItinerary.highlights || []),
      newItinerary.ai_insight || trip.ai_insight,
      newItinerary.total_cost_estimate || trip.total_cost_estimate,
      params.id
    );

    return Response.json({ tripId: params.id, trip: { id: params.id, ...newItinerary } });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi điều chỉnh lịch trình: ' + err.message }, { status: 500 });
  }
}
