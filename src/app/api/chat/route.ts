import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { chat } from '@/lib/ai';
import { customizeTrip } from '@/lib/ai';
import { v4 as uuidv4 } from 'uuid';
import { suggestTripInsertion } from '@/lib/trip-insertion';

function fold(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
}

function deterministicProposal(message: string, trip: any, db: any) {
  const candidate = JSON.parse(JSON.stringify({
    title: trip.title, summary: trip.summary, total_cost_estimate: trip.total_cost_estimate,
    highlights: trip.highlights || [], ai_insight: trip.ai_insight || '',
    days: trip.itinerary?.days || [],
  }));
  const text = fold(message);
  const dayMatch = text.match(/ngay\s+(\d+)/);
  const dayIndex = Math.max(0, Math.min(candidate.days.length - 1, Number(dayMatch?.[1] || 1) - 1));
  const day = candidate.days[dayIndex];
  if (!day) return null;
  const times = Array.from(message.matchAll(/\b([01]?\d|2[0-3]):[0-5]\d\b/g)).map(match => match[0].padStart(5, '0'));
  const activities = day.activities || [];
  const mentioned = activities.find((activity: any) => text.includes(fold(activity.name)));

  if (/\b(bo|xoa|loai)\b/.test(text)) {
    const index = mentioned ? activities.indexOf(mentioned) : times[0] ? activities.findIndex((activity: any) => activity.time === times[0]) : -1;
    if (index < 0) return null;
    activities.splice(index, 1);
    candidate.ai_insight = `Đã bỏ ${mentioned?.name || 'hoạt động đã chọn'} theo yêu cầu của bạn.`;
    return candidate;
  }

  if (/\b(doi|doi gio|chuyen|dời|doi lich)\b/.test(text) && times.length) {
    const activity = mentioned || (times.length > 1 ? activities.find((item: any) => item.time === times[0]) : null);
    if (!activity) return null;
    activity.time = times[times.length - 1];
    activities.sort((a: any, b: any) => a.time.localeCompare(b.time));
    candidate.ai_insight = `Đã dời ${activity.name} sang ${activity.time}.`;
    return candidate;
  }

  if (/\b(them|chen)\b/.test(text)) {
    const allPlaces = db.prepare('SELECT * FROM places ORDER BY popularity DESC, rating DESC').all() as any[];
    const existingIds = new Set(candidate.days.flatMap((item: any) => item.activities || []).map((item: any) => item.place_id));
    const exact = allPlaces.filter(place => text.includes(fold(place.name))).sort((a, b) => b.name.length - a.name.length)[0];
    const category = text.includes('ca phe') ? 'cafe' : text.includes('quan an') || text.includes('an uong') || text.includes('mon an') ? 'food' : null;
    const pool = (exact ? [exact] : allPlaces.filter(place => !category || place.category === category)).filter(place => !existingIds.has(place.id));
    const options = pool.map(place => ({ place, suggestion: suggestTripInsertion(activities, place) })).filter(item => item.suggestion.feasible)
      .sort((a, b) => a.suggestion.detourKm - b.suggestion.detourKm);
    const best = options[0];
    if (!best) return null;
    const place = best.place;
    activities.push({
      time: best.suggestion.time, name: place.name, type: place.category, duration: place.duration || '1 giờ',
      cost: place.price || 'Miễn phí', description: place.description || '', location: place.address || 'Huế',
      ai_tip: best.suggestion.reason, lat: place.lat, lng: place.lng, place_id: place.id,
    });
    activities.sort((a: any, b: any) => a.time.localeCompare(b.time));
    candidate.ai_insight = `Đã chọn ${place.name} vì phù hợp với khoảng trống và gần tuyến hiện tại.`;
    return candidate;
  }
  return null;
}

function summarizeChanges(before: any, after: any) {
  const flatten = (itinerary: any) => (itinerary?.days || []).flatMap((day: any) =>
    (day.activities || []).map((activity: any) => ({ day: day.day, name: activity.name, time: activity.time }))
  );
  const previous = flatten(before);
  const next = flatten(after);
  const previousKeys = new Set(previous.map((item: any) => `${item.day}|${item.name}`));
  const nextKeys = new Set(next.map((item: any) => `${item.day}|${item.name}`));
  const added = next.filter((item: any) => !previousKeys.has(`${item.day}|${item.name}`));
  const removed = previous.filter((item: any) => !nextKeys.has(`${item.day}|${item.name}`));
  const moved = next.filter((item: any) => {
    const old = previous.find((candidate: any) => candidate.day === item.day && candidate.name === item.name);
    return old && old.time !== item.time;
  });
  return [
    ...added.slice(0, 3).map((item: any) => `Thêm ${item.name} vào ngày ${item.day}, lúc ${item.time}`),
    ...removed.slice(0, 3).map((item: any) => `Bỏ ${item.name} khỏi ngày ${item.day}`),
    ...moved.slice(0, 3).map((item: any) => `Dời ${item.name} sang ${item.time} ngày ${item.day}`),
  ];
}

// POST /api/chat
export async function POST(req: NextRequest) {
  try {
    const { message, tripId, history = [] } = await req.json();
    if (!message) return Response.json({ error: 'Tin nhắn không được để trống' }, { status: 400 });

    const userId = getAuthUserId(req);
    const db = getDb();
    let tripContext: any = null;

    if (tripId) {
      const trip = db.prepare('SELECT title, summary, duration, style, companion, total_cost_estimate, itinerary, highlights, ai_insight, user_id, is_shared FROM trips WHERE id = ?').get(tripId) as any;
      if (trip && (trip.is_shared || trip.user_id === userId)) {
        try { trip.itinerary = JSON.parse(trip.itinerary || '{}'); } catch { trip.itinerary = null; }
        try { trip.highlights = JSON.parse(trip.highlights || '[]'); } catch { trip.highlights = []; }
        tripContext = trip;
      }
    }

    const messages = [
      ...history.slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const mutationIntent = /(^|\s)(thêm|bỏ|xóa|xoá|đổi|thay|dời|chuyển|sắp xếp|chỉnh|rút ngắn)(\s|$)/i.test(message);
    let reply: string;
    let proposal = null;
    if (mutationIntent && tripContext && tripContext.user_id === userId) {
      const candidate = deterministicProposal(message, tripContext, db) || await customizeTrip(tripContext, message);
      const candidateItinerary = candidate?.days ? { days: candidate.days } : candidate;
      const summary = summarizeChanges(tripContext.itinerary, candidateItinerary);
      if (summary.length) {
        reply = 'Mình đã chuẩn bị một phương án chỉnh lịch. Hãy xem các thay đổi bên dưới và xác nhận trước khi áp dụng.';
        proposal = { instruction: message, itinerary: candidate, summary };
      } else {
        reply = 'Mình đã hiểu yêu cầu nhưng chưa tạo được thay đổi lịch trình đủ rõ ràng. Bạn hãy nêu cụ thể ngày, địa điểm hoặc thời gian muốn đổi.';
      }
    } else {
      reply = await chat(messages, tripContext);
    }

    if (userId && tripId && tripContext) {
      db.prepare('INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), tripId, userId, 'user', message);
      db.prepare('INSERT INTO chat_messages (id, trip_id, user_id, role, content) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), tripId, userId, 'assistant', reply);
    }

    return Response.json({ reply, proposal });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi trợ lý AI: ' + err.message }, { status: 500 });
  }
}
