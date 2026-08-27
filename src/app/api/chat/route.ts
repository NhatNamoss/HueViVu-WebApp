import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { chat } from '@/lib/ai';
import { v4 as uuidv4 } from 'uuid';

// POST /api/chat
export async function POST(req: NextRequest) {
  try {
    const { message, tripId, history = [] } = await req.json();
    if (!message) return Response.json({ error: 'Tin nhắn không được để trống' }, { status: 400 });

    const userId = getAuthUserId(req);
    const db = getDb();
    let tripContext = null;

    if (tripId) {
      const trip = db.prepare('SELECT title, summary, duration, style, companion, total_cost_estimate, itinerary FROM trips WHERE id = ?').get(tripId) as any;
      if (trip) {
        try { trip.itinerary = JSON.parse(trip.itinerary || '{}'); } catch { trip.itinerary = null; }
        tripContext = trip;
      }
    }

    const messages = [
      ...history.slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const reply = await chat(messages, tripContext);

    if (userId && tripId) {
      db.prepare('INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), tripId, userId, 'user', message);
      db.prepare('INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), tripId, userId, 'assistant', reply);
    }

    return Response.json({ reply });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi trợ lý AI: ' + err.message }, { status: 500 });
  }
}
