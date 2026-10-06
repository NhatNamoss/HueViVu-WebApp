import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const userId = getAuthUserId(req);
    const body = await req.json();
    const { event_type, place_id, trip_id, sessionId, metadata, value } = body;

    if (!event_type) {
      return Response.json({ error: 'Thiếu event_type' }, { status: 400 });
    }

    const db = getDb();
    
    // In a real app we might track anonymous users via sessionId 
    // but for simplicity we log it either under userId or sessionId
    const resolvedSessionId = sessionId || (userId ? `user:${userId}` : null);
    if (!resolvedSessionId) return Response.json({ error: 'Thiếu sessionId' }, { status: 400 });

    db.prepare(`
      INSERT INTO user_events (id, user_id, session_id, event_type, place_id, trip_id, value, context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId || null, 
      resolvedSessionId,
      event_type,
      place_id || null,
      trip_id || null,
      Number.isFinite(Number(value)) ? Number(value) : null,
      metadata ? JSON.stringify(metadata) : null
    );

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi ghi nhận sự kiện: ' + err.message }, { status: 500 });
  }
}
