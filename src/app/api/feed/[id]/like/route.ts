import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// POST /api/feed/[id]/like  
export async function POST(req: NextRequest, { params }: { params: { id: string; action: string } }) {
  const db = getDb();
  const userId = getAuthUserId(req) || 'guest_' + Math.random().toString(36).slice(2, 9);
  const tripId = params.id;

  const existing = db.prepare('SELECT 1 FROM trip_likes WHERE trip_id = ? AND user_id = ?').get(tripId, userId);
  if (existing) {
    db.prepare('DELETE FROM trip_likes WHERE trip_id = ? AND user_id = ?').run(tripId, userId);
    db.prepare('UPDATE trips SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(tripId);
    return Response.json({ liked: false });
  } else {
    db.prepare('INSERT INTO trip_likes (trip_id, user_id) VALUES (?, ?)').run(tripId, userId);
    db.prepare('UPDATE trips SET like_count = like_count + 1 WHERE id = ?').run(tripId);
    return Response.json({ liked: true });
  }
}
