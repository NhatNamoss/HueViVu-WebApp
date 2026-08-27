import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { generateToken } from '@/lib/auth';

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
