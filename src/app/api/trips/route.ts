import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId, generateToken } from '@/lib/auth';
import { generateAstarTrip } from '@/lib/astar';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { presentTripBudget, presentTripTitle } from '@/lib/trip-presentation';
import { optimizeItinerary, validateItinerary } from '@/lib/itinerary-validator';

// GET /api/trips — list user trips
export async function GET(req: NextRequest) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const trips = db.prepare(`
    SELECT id, title, summary, duration, style, companion, total_cost_estimate,
           status, created_at, start_date, is_shared, like_count, ai_match_score
    FROM trips WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId) as any[];
  return Response.json(trips.map(trip => ({
    ...trip,
    title: presentTripTitle(trip.title, trip.duration, trip.style),
    total_cost_estimate: presentTripBudget(trip.total_cost_estimate),
  })));
}

// POST /api/trips/generate — generate new trip
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { duration, styles, companion, budget, food, sessionId, startLat, startLng, startDate, pacing } = body;
    const durationDays = duration === '5+' ? 5 : Number(duration);
    const normalizedBudget = Number(budget) > 0 && Number(budget) < 10000 ? Number(budget) * 1000 : Number(budget);

    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 7 || !Array.isArray(styles) || styles.length < 1 || styles.length > 12 || styles.some(style => typeof style !== 'string' || !style.trim() || style.length > 100) || !['solo', 'couple', 'family', 'friends'].includes(companion) || !Number.isFinite(normalizedBudget) || normalizedBudget <= 0 || normalizedBudget > 100000000 || (food !== undefined && (!Array.isArray(food) || food.length > 20 || food.some(item => typeof item !== 'string' || item.length > 100))) || (pacing !== undefined && !['relaxed', 'balanced', 'packed'].includes(pacing))) {
      return Response.json({ error: 'Hãy chọn từ 1 đến 7 ngày, sở thích, người đi cùng và ngân sách hợp lệ.' }, { status: 400 });
    }
    if (startDate !== undefined && (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(Date.parse(startDate)) || new Date(startDate).toISOString().slice(0, 10) !== startDate)) return Response.json({ error: 'Hãy chọn ngày bắt đầu hợp lệ.' }, { status: 400 });
    if ((startLat !== undefined || startLng !== undefined) && (typeof startLat !== 'number' || typeof startLng !== 'number' || !Number.isFinite(startLat) || !Number.isFinite(startLng) || Math.abs(startLat) > 90 || Math.abs(startLng) > 180)) return Response.json({ error: 'Vị trí bắt đầu chưa hợp lệ. Hãy thử lại.' }, { status: 400 });
    if (req.headers.has('authorization') && !getAuthUserId(req)) return Response.json({ error: 'Phiên sử dụng đã hết hạn. Hãy đăng nhập lại hoặc bắt đầu chuyến đi mới.' }, { status: 401 });

    let userId = getAuthUserId(req);
    const db = getDb();

    let guestToken: string | null = null;
    if (!userId) {
      // A caller-supplied analytics session must never recover another guest's identity.
      userId = `guest_${uuidv4().replace(/-/g, '')}`;
      const guestEmail = `${userId}@guest.huevivu.local`;
      db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, is_guest)
        VALUES (?, ?, ?, ?, 1)`).run(userId, 'Khách HueViVu', guestEmail, bcrypt.hashSync(uuidv4(), 4));
      guestToken = generateToken(userId);
    }

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

    const draftItinerary = generateAstarTrip({
      duration: durationDays, styles, companion, budget: normalizedBudget, food: food || [], startLat, startLng, startDate, pacing,
      visitedPlaceIds: userContext?.visited_place_ids || [],
      avoidPlaceIds: userContext?.skipped_place_ids || [],
    });
    let optimized = optimizeItinerary(draftItinerary, startDate);
    // Quality gate: never return an overloaded itinerary merely because the search
    // found more places. Remove the least viable activities and re-check using the
    // same validator the user sees in the UI.
    for (let attempt = 0; attempt < 5 && optimized.feasibility.score < 70; attempt++) {
      const worstDay = [...optimized.feasibility.days].sort((a: any, b: any) => a.score - b.score)[0];
      const dayIndex = optimized.itinerary.days.findIndex((day: any) => day.day === worstDay?.day);
      const activities = optimized.itinerary.days[dayIndex]?.activities;
      if (!activities || activities.length <= 4) break;
      const issueIndex = worstDay?.issues?.find((issue: any) => Number.isInteger(issue.activityIndex))?.activityIndex;
      const removableIndex = Number.isInteger(issueIndex)
        ? issueIndex
        : activities.map((activity: any, index: number) => ({ activity, index })).reverse().find((item: any) => !['food', 'market', 'rest'].includes(item.activity.type))?.index;
      if (!Number.isInteger(removableIndex)) break;
      activities.splice(removableIndex, 1);
      optimized = optimizeItinerary(optimized.itinerary, startDate);
    }
    const itinerary = optimized.itinerary;
    const feasibility = optimized.feasibility || validateItinerary(itinerary, startDate);
    itinerary.title = draftItinerary.title;
    itinerary.summary = draftItinerary.summary;
    itinerary.highlights = draftItinerary.highlights;
    itinerary.total_cost_estimate = draftItinerary.total_cost_estimate;
    itinerary.ai_insight = feasibility.score >= 85
      ? `✓ Lịch trình đã được kiểm tra thời gian, giờ mở cửa và quãng đường. Độ hợp lý ${feasibility.score}/100.`
      : `Lịch đã được tự cân lại nhưng còn ${feasibility.issue_count} lưu ý cần kiểm tra.`;

    const tripId = 'trip_' + uuidv4().replace(/-/g, '').slice(0, 12);
    db.prepare(`INSERT INTO trips
      (id, user_id, title, summary, duration, style, companion, budget, food_prefs, start_date,
       itinerary, highlights, ai_insight, total_cost_estimate, status, ai_match_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      tripId, userId,
      itinerary.title, itinerary.summary,
      durationDays,
      Array.isArray(styles) ? styles.join(',') : styles,
      companion, normalizedBudget,
      JSON.stringify(Array.isArray(food) ? food : []),
      /^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) ? startDate : null,
      JSON.stringify(itinerary),
      JSON.stringify(itinerary.highlights || []),
      itinerary.ai_insight,
      itinerary.total_cost_estimate,
      'active',
      feasibility.score
    );

    db.prepare('UPDATE users SET total_trips = total_trips + 1 WHERE id = ?').run(userId);

    return Response.json({ tripId, token: guestToken, trip: { id: tripId, ...itinerary }, feasibility });
  } catch (err: any) {
    console.error('[generate-trip]', err);
    return Response.json({ error: 'Chưa thể tạo lịch trình. Các lựa chọn của bạn vẫn được giữ; hãy thử lại.' }, { status: err instanceof SyntaxError ? 400 : 500 });
  }
}
