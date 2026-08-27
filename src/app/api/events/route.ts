import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const userId = getAuthUserId(req);
    const body = await req.json();
    const { event_type, place_id, sessionId, metadata } = body;

    if (!event_type) {
      return Response.json({ error: 'Thiếu event_type' }, { status: 400 });
    }

    const db = getDb();
    
    // In a real app we might track anonymous users via sessionId 
    // but for simplicity we log it either under userId or sessionId
    db.prepare(`
      INSERT INTO user_events (user_id, session_id, event_type, place_id, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      userId || null, 
      sessionId || null,
      event_type,
      place_id || null,
      metadata ? JSON.stringify(metadata) : null
    );

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi ghi nhận sự kiện: ' + err.message }, { status: 500 });
  }
}
