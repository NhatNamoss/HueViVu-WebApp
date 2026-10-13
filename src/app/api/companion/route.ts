import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { readPreferences } from '@/lib/travel-preferences';
import { companionAction } from '@/lib/companion-action';
import { isTravelTripActive } from '@/lib/travel-context';
import { tripDayIndex } from '@/lib/travel-clock';
import { normalizeTripState, getDayProgress } from '@/lib/trip-state';
import { GET as weatherResponse } from '../weather/route';
import { isWeatherUsable } from '@/lib/hue-weather';

async function respond(req: NextRequest, coordinates: { lat: string | null; lng: string | null }) {
  const now = new Date();
  const db = getDb();
  const userId = getAuthUserId(req);
  if (req.headers.has('authorization') && !userId) return Response.json({ error: 'Phiên đã hết hạn.' }, { status: 401 });
  const { lat, lng } = coordinates;
  if ((lat !== null || lng !== null) && (lat === null || lng === null || !lat.trim() || !lng.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180)) return Response.json({ error: 'Vị trí chưa hợp lệ.' }, { status: 400 });
  const location = lat !== null && lng !== null ? { lat: Number(lat), lng: Number(lng) } : null;
  const profile = userId ? db.prepare('SELECT preferences FROM users WHERE id = ?').get(userId) as any : null;
  const preferences = readPreferences(profile?.preferences);
  let trip: any = null; let excludedIds: string[] = [];
  const rows = userId ? db.prepare("SELECT * FROM trips WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC").all(userId) as any[] : [];
  for (const row of rows) {
    const itinerary = JSON.parse(row.itinerary || '{}');
    const stateRow = db.prepare('SELECT * FROM trip_state WHERE trip_id = ? AND user_id = ?').get(row.id, userId);
    const state = normalizeTripState(stateRow, row.id, itinerary.days || []);
    const candidate = { id: row.id, status: row.status, startDate: row.start_date, duration: row.duration, startedAt: state.startedAt, fatigue: state.fatigue };
    if (!isTravelTripActive(candidate, now)) continue;
    const dayIndex = tripDayIndex(row.start_date, now)!;
    const activities = itinerary.days?.[dayIndex]?.activities || [];
    const progress = getDayProgress(state, dayIndex, activities);
    const next = progress.currentActivityIndex !== null && !progress.completedActivityIndexes.includes(progress.currentActivityIndex) ? activities[progress.currentActivityIndex] : activities.find((_: any, i: number) => !progress.completedActivityIndexes.includes(i));
    excludedIds = (itinerary.days || []).flatMap((day: any, i: number) => { const done = getDayProgress(state, i, day.activities || []).completedActivityIndexes; return (day.activities || []).filter((_: any, index: number) => done.includes(index)).map((a: any) => a.place_id).filter(Boolean); });
    trip = { ...candidate, nextActivity: next?.name, nextActivityTime: next?.time, dayCompleted: activities.length > 0 && !next };
    break;
  }
  const weather = await (await weatherResponse()).json();
  const context = companionAction({ now, trip, location, preferences: { styles: preferences.categories, pacing: preferences.pacing, indoorPreferred: preferences.indoorPreferred }, weather: isWeatherUsable(weather) ? { condition: weather.condition, temp: weather.temp } : null }, db.prepare("SELECT * FROM places WHERE publication_status = 'published'").all() as any[], excludedIds);
  return Response.json({ context, weather, updatedAt: now.toISOString() }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });
}

export async function GET(req: NextRequest) { return respond(req, { lat: req.nextUrl.searchParams.get('lat'), lng: req.nextUrl.searchParams.get('lng') }); }
export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['lat', 'lng'].includes(key)) || typeof input.lat !== 'number' || typeof input.lng !== 'number') return Response.json({ error: 'Vị trí chưa hợp lệ.' }, { status: 400 });
  return respond(req, { lat: String(input.lat), lng: String(input.lng) });
}
