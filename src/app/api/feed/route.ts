import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

// GET /api/feed
export async function GET(req: NextRequest) {
  const db = getDb();
  const userId = getAuthUserId(req);

  const trips = db.prepare(`
    SELECT t.*, u.name as owner_name
    FROM trips t JOIN users u ON t.user_id = u.id
    WHERE t.is_shared = 1
    ORDER BY t.like_count DESC, t.created_at DESC
    LIMIT 20
  `).all() as any[];

  trips.forEach(t => {
    t.highlights = JSON.parse(t.highlights || '[]');
    t.food_prefs = JSON.parse(t.food_prefs || '[]');
    try { t.itinerary = JSON.parse(t.itinerary || '{}'); } catch { t.itinerary = {}; }
    if (userId) {
      t.liked = !!db.prepare('SELECT 1 FROM trip_likes WHERE trip_id = ? AND user_id = ?').get(t.id, userId);
      t.saved = !!db.prepare('SELECT 1 FROM trip_saves WHERE trip_id = ? AND user_id = ?').get(t.id, userId);
    }
  });

  return Response.json(trips);
}
