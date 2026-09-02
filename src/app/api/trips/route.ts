import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId, generateToken } from '@/lib/auth';
import { generateTrip } from '@/lib/ai';
import { generateAstarTrip } from '@/lib/astar';
import { v4 as uuidv4 } from 'uuid';

// GET /api/trips — list user trips
export async function GET(req: NextRequest) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const trips = db.prepare(`
    SELECT id, title, summary, duration, style, companion, total_cost_estimate,
           status, created_at, is_shared, like_count, ai_match_score
    FROM trips WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId);
  return Response.json(trips);
}

// POST /api/trips/generate — generate new trip
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { duration, styles, companion, budget, food, sessionId } = body;

    if (!duration || !styles || !companion || !budget) {
      return Response.json({ error: 'Thiếu thông tin để tạo lịch trình' }, { status: 400 });
    }

    const userId = getAuthUserId(req) || 'user_demo';
    const db = getDb();

    // Build user context for personalization
    let userContext = null;
    if (userId || sessionId) {
      const clause = userId !== 'user_demo' ? 'user_id = ?' : 'session_id = ?';
      const param = userId !== 'user_demo' ? userId : sessionId;

      if (param) {
        const visitedRows = db.prepare(`SELECT DISTINCT place_id FROM user_events WHERE ${clause} AND place_id IS NOT NULL AND event_type IN ('view','add_trip') LIMIT 30`).all(param) as any[];
        const skippedRows = db.prepare(`SELECT DISTINCT place_id FROM user_events WHERE ${clause} AND place_id IS NOT NULL AND event_type = 'skip' LIMIT 20`).all(param) as any[];
        userContext = {
          personalized: visitedRows.length > 0,
          visited_place_ids: visitedRows.map(r => r.place_id),
          skipped_place_ids: skippedRows.map(r => r.place_id),
        };
      }
    }

    const itinerary = generateAstarTrip({ duration, styles, companion, budget, food: food || [] });

    const tripId = 'trip_' + uuidv4().replace(/-/g, '').slice(0, 12);
    db.prepare(`INSERT INTO trips
      (id, user_id, title, summary, duration, style, companion, budget, food_prefs,
       itinerary, highlights, ai_insight, total_cost_estimate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      tripId, userId,
      itinerary.title, itinerary.summary,
      Number(duration),
      Array.isArray(styles) ? styles.join(',') : styles,
      companion, Number(budget),
      JSON.stringify(Array.isArray(food) ? food : []),
      JSON.stringify(itinerary),
      JSON.stringify(itinerary.highlights || []),
      itinerary.ai_insight,
      itinerary.total_cost_estimate,
      'active'
    );

    db.prepare('UPDATE users SET total_trips = total_trips + 1 WHERE id = ?').run(userId);

    return Response.json({ tripId, trip: { id: tripId, ...itinerary } });
  } catch (err: any) {
    console.error('[generate-trip]', err);
    return Response.json({ error: 'Lỗi tạo lịch trình: ' + err.message }, { status: 500 });
  }
}
