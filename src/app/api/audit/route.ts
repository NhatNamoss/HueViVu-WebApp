import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRoles } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer']);
  if (access instanceof Response) return access;
  const db = getDb();
  const rows = db.prepare(`SELECT a.*, u.name AS actor_name
    FROM audit_logs a LEFT JOIN users u ON a.actor_id = u.id
    ORDER BY a.created_at DESC LIMIT 200`).all() as any[];
  for (const row of rows) {
    try { row.before_data = row.before_data ? JSON.parse(row.before_data) : null; } catch {}
    try { row.after_data = row.after_data ? JSON.parse(row.after_data) : null; } catch {}
  }
  return Response.json(rows);
}
