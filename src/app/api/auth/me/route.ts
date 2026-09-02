import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { generateToken, getAuthUserId } from '@/lib/auth';

// POST /api/auth/demo — auto-login as demo user
export async function POST() {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, level, total_trips, total_places FROM users WHERE email = ?').get('demo@huevivu.app') as any;
    if (!user) return Response.json({ error: 'Demo user not found' }, { status: 404 });
    return Response.json({ token: generateToken(user.id), user });
  } catch (err: any) {
    return Response.json({ error: 'Demo login error: ' + err.message }, { status: 500 });
  }
}

// GET /api/auth/me
export async function GET(req: NextRequest) {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });

  const db = getDb();
  const user = db.prepare('SELECT id, name, email, level, created_at FROM users WHERE id = ?').get(userId) as any;
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  // Live counts — accurate
  const { total_trips } = db.prepare('SELECT COUNT(*) as total_trips FROM trips WHERE user_id = ?').get(userId) as any;
  // Count unique place names across all user trip activities
  const tripsRaw = db.prepare('SELECT itinerary FROM trips WHERE user_id = ?').all(userId) as any[];
  const placeSet = new Set<string>();
  let food_count = 0;
  for (const t of tripsRaw) {
    try {
      const it = JSON.parse(t.itinerary || '{}');
      const days: any[] = it.days || [];
      for (const d of days) {
        for (const a of (d.activities || [])) {
          if (a.name) placeSet.add(a.name);
          if (a.type === 'food') food_count++;
        }
      }
    } catch {}
  }
  const total_places = placeSet.size;

  return Response.json({ ...user, total_trips, total_places, food_count });
}
