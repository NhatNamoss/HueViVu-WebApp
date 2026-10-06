import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { validateItinerary } from '@/lib/itinerary-validator';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req);
  const trip = getDb().prepare('SELECT itinerary, start_date, user_id, is_shared FROM trips WHERE id = ?').get(params.id) as any;
  if (!trip || (!trip.is_shared && trip.user_id !== userId)) return Response.json({ error: 'Trip not found' }, { status: 404 });
  return Response.json(validateItinerary(JSON.parse(trip.itinerary || '{}'), trip.start_date));
}
