import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { topic, message, email, rating, placeId } = await req.json();
    if (!topic || !message?.trim()) {
      return Response.json({ error: 'topic và message bắt buộc' }, { status: 400 });
    }
    const userId = getAuthUserId(req) || null;
    db.prepare(`
      INSERT INTO feedback (id, user_id, topic, message, email, rating, place_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(crypto.randomUUID(), userId, topic, message.trim(), email || null, rating || null, placeId || null);
    if (topic === 'content' && placeId) {
      const place = db.prepare('SELECT name FROM places WHERE id=?').get(placeId) as any;
      if (place) db.prepare(`INSERT INTO data_tasks (id,place_id,task_type,title,description,priority,status,created_by) VALUES (?,?,?,?,?,?,?,?)`).run(crypto.randomUUID(),placeId,'user_feedback',`Kiểm tra phản hồi về ${place.name}`,message.trim(),rating && rating <= 2 ? 'high' : 'medium','open',userId);
    }
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (admin instanceof Response) return admin;
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM feedback ORDER BY created_at DESC`).all();
    return Response.json({ feedback: rows });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
