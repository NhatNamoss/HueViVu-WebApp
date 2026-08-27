import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?').get(params.id, userId) as any;
  if (!entry) return Response.json({ error: 'Entry not found' }, { status: 404 });

  const { content, mood, is_private } = await req.json();
  db.prepare('UPDATE journal_entries SET content = ?, mood = ?, is_private = ? WHERE id = ?').run(
    content ?? entry.content, mood ?? entry.mood,
    is_private !== undefined ? (is_private ? 1 : 0) : entry.is_private,
    params.id
  );
  return Response.json(db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(params.id));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const result = db.prepare('DELETE FROM journal_entries WHERE id = ? AND user_id = ?').run(params.id, userId) as any;
  if (!result.changes) return Response.json({ error: 'Entry not found' }, { status: 404 });
  return Response.json({ success: true });
}
