import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getAuthUserId(req);
    const { itinerary } = await req.json();
    if (!itinerary?.days) return Response.json({ error: 'Invalid itinerary' }, { status: 400 });

    const db = getDb();
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id) as any;
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    if (userId && trip.user_id !== userId && trip.user_id !== 'user_demo001') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    db.prepare('UPDATE trips SET itinerary = ? WHERE id = ?')
      .run(JSON.stringify(itinerary), params.id);

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

