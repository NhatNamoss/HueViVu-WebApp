import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { customizeTrip } from '@/lib/ai';

// GET /api/trips/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const userId = getAuthUserId(req);
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id) as any;

  if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });
  if (!trip.is_shared && trip.user_id !== userId) return Response.json({ error: 'Trip not found' }, { status: 404 });

  trip.itinerary = JSON.parse(trip.itinerary || '{}');
  trip.highlights = JSON.parse(trip.highlights || '[]');
  trip.food_prefs = JSON.parse(trip.food_prefs || '[]');

  const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(trip.user_id) as any;
  trip.owner_name = owner?.name;

  if (userId) {
    trip.liked = !!db.prepare('SELECT 1 FROM trip_likes WHERE trip_id = ? AND user_id = ?').get(trip.id, userId);
    trip.saved = !!db.prepare('SELECT 1 FROM trip_saves WHERE trip_id = ? AND user_id = ?').get(trip.id, userId);
  }

  return Response.json(trip);
}

// PUT /api/trips/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const body = await req.json();

  // Handle share action
  if (body.action === 'share') {
    const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(params.id, userId);
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });
    db.prepare('UPDATE trips SET is_shared = 1 WHERE id = ?').run(params.id);
    return Response.json({ success: true });
  }

  // Handle status update
  if (body.status) {
    if (!['active', 'upcoming', 'past'].includes(body.status)) return Response.json({ error: 'Invalid status' }, { status: 400 });
    db.prepare('UPDATE trips SET status = ? WHERE id = ? AND user_id = ?').run(body.status, params.id, userId);
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/trips/[id]  
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const result = db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(params.id, userId) as any;
  if (!result.changes) return Response.json({ error: 'Trip not found' }, { status: 404 });
  return Response.json({ success: true });
}
