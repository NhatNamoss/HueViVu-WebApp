import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { readPreferences, validatePreferences } from '@/lib/travel-preferences';

export async function GET(req: NextRequest) {
  const access = requireAuth(req);
  if (access instanceof Response) return access;
  const row = getDb().prepare('SELECT preferences FROM users WHERE id = ?').get(access.userId) as { preferences: string };
  return Response.json(readPreferences(row.preferences), { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PUT(req: NextRequest) {
  const access = requireAuth(req);
  if (access instanceof Response) return access;
  let preferences;
  try { preferences = validatePreferences(await req.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Sở thích chưa hợp lệ.' }, { status: 400 }); }
  getDb().prepare('UPDATE users SET preferences = ? WHERE id = ?').run(JSON.stringify(preferences), access.userId);
  return Response.json(preferences, { headers: { 'Cache-Control': 'private, no-store' } });
}
