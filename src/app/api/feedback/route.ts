import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { topic, message, email, rating } = await req.json();
    if (!topic || !message?.trim()) {
      return Response.json({ error: 'topic và message bắt buộc' }, { status: 400 });
    }
    const userId = getAuthUserId(req) || null;
    db.prepare(`
      INSERT INTO feedback (id, user_id, topic, message, email, rating, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(crypto.randomUUID(), userId, topic, message.trim(), email || null, rating || null);
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
