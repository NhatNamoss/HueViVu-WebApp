import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET /api/journal
export async function GET(req: NextRequest) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get('tripId');

  let query = 'SELECT * FROM journal_entries WHERE user_id = ?';
  const params: any[] = [userId];
  if (tripId) { query += ' AND trip_id = ?'; params.push(tripId); }
  query += ' ORDER BY created_at DESC';

  return Response.json(db.prepare(query).all(...params));
}

// POST /api/journal
export async function POST(req: NextRequest) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const { tripId, time_str, place_name, content, mood, is_private } = await req.json();
  if (!content) return Response.json({ error: 'Nội dung không được để trống' }, { status: 400 });

  const id = 'je_' + uuidv4().replace(/-/g, '').slice(0, 12);
  db.prepare(`INSERT INTO journal_entries (id, user_id, trip_id, time_str, place_name, content, mood, is_private)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, userId, tripId || null, time_str || null, place_name || null,
    content, mood || 'happy', is_private ? 1 : 0
  );

  return Response.json(db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id), { status: 201 });
}
