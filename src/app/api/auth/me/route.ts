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
  const user = db.prepare('SELECT id, name, email, level, total_trips, total_places, created_at FROM users WHERE id = ?').get(userId);
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
  return Response.json(user);
}
