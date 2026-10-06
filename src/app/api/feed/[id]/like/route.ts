import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

// POST /api/feed/[id]/like  
export async function POST(req: NextRequest, { params }: { params: { id: string; action: string } }) {
  const db = getDb();
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập để thích hành trình' }, { status: 401 });
  const tripId = params.id;
  const trip = db.prepare('SELECT id FROM trips WHERE id = ? AND is_shared = 1').get(tripId);
  if (!trip) return Response.json({ error: 'Không tìm thấy hành trình công khai' }, { status: 404 });

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
