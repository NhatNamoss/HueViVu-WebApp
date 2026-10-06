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
  const user = db.prepare('SELECT id, name, email, level, role, is_guest, created_at FROM users WHERE id = ?').get(userId) as any;
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  // Live counts — accurate
  const { total_trips } = db.prepare('SELECT COUNT(*) as total_trips FROM trips WHERE user_id = ?').get(userId) as any;
  // Count unique place names across all user trip activities
  const tripsRaw = db.prepare('SELECT itinerary, style, companion, budget FROM trips WHERE user_id = ?').all(userId) as any[];
  const placeSet = new Set<string>();
  let food_count = 0;
  const categoryCounts = new Map<string, number>();
  const companionCounts = new Map<string, number>();
  let totalBudget = 0;
  for (const t of tripsRaw) {
    try {
      const it = JSON.parse(t.itinerary || '{}');
      const days: any[] = it.days || [];
      for (const d of days) {
        for (const a of (d.activities || [])) {
          if (a.name) placeSet.add(a.name);
          if (a.type === 'food') food_count++;
          if (a.type && a.type !== 'rest') categoryCounts.set(a.type, (categoryCounts.get(a.type) || 0) + 1);
        }
      }
    } catch {}
    if (t.companion) companionCounts.set(t.companion, (companionCounts.get(t.companion) || 0) + 1);
    totalBudget += Number(t.budget) > 0 && Number(t.budget) < 10000 ? Number(t.budget) * 1000 : Number(t.budget) || 0;
  }
  const total_places = placeSet.size;

  const eventCategories = db.prepare(`
    SELECT p.category, COUNT(*) as count
    FROM user_events e JOIN places p ON p.id = e.place_id
    WHERE e.user_id = ? AND e.event_type IN ('view','add_trip','favorite','save')
    GROUP BY p.category
  `).all(userId) as any[];
  for (const row of eventCategories) categoryCounts.set(row.category, (categoryCounts.get(row.category) || 0) + Number(row.count) * 2);

  const categoryLabels: Record<string, { label: string; emoji: string }> = {
    food: { label: 'Ưa ẩm thực địa phương', emoji: '🍜' }, cafe: { label: 'Thích cà phê & nghỉ chân', emoji: '☕' },
    heritage: { label: 'Quan tâm di sản', emoji: '🏛️' }, temple: { label: 'Thích không gian tâm linh', emoji: '🛕' },
    nature: { label: 'Ưa thiên nhiên', emoji: '🌿' }, market: { label: 'Thích chợ địa phương', emoji: '🛍️' },
    craft_village: { label: 'Quan tâm làng nghề', emoji: '🎨' },
  };
  const memoryItems = Array.from(categoryCounts.entries())
    .filter(([category]) => categoryLabels[category])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, evidence]) => ({ key: category, ...categoryLabels[category], evidence, source: 'Lịch trình và tương tác' }));
  const topCompanion = Array.from(companionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const companionLabels: Record<string, string> = { solo: 'Thường đi một mình', couple: 'Thường đi cặp đôi', family: 'Thường đi gia đình', friends: 'Thường đi nhóm bạn' };
  if (topCompanion && companionLabels[topCompanion[0]]) memoryItems.push({ key: 'companion', label: companionLabels[topCompanion[0]], emoji: '🧭', evidence: topCompanion[1], source: 'Các chuyến đã tạo' });
  if (tripsRaw.length && totalBudget) {
    const averageBudget = Math.round(totalBudget / tripsRaw.length / 50000) * 50000;
    memoryItems.push({ key: 'budget', label: `Ngân sách thường chọn ~${averageBudget.toLocaleString('vi-VN')}đ`, emoji: '💰', evidence: tripsRaw.length, source: 'Các chuyến đã tạo' });
  }

  return Response.json({
    ...user, total_trips, total_places, food_count,
    ai_memory: {
      items: memoryItems.slice(0, 5),
      signal_count: Array.from(categoryCounts.values()).reduce((sum, value) => sum + value, 0) + tripsRaw.length,
      personalized: memoryItems.length > 0,
    },
  });
}
