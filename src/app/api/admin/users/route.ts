import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof Response) return admin;
  const users = getDb().prepare(`SELECT id, name, email, role, is_guest, created_at
    FROM users WHERE is_guest = 0 ORDER BY created_at DESC`).all();
  return Response.json(users);
}

export async function PUT(req: NextRequest) {
  const admin = requireAdmin(req);
  if (admin instanceof Response) return admin;
  const { userId, role } = await req.json();
  if (!['user', 'collector', 'reviewer', 'admin'].includes(role)) return Response.json({ error: 'Role không hợp lệ' }, { status: 400 });
  if (userId === admin.userId && role !== 'admin') return Response.json({ error: 'Không thể tự gỡ quyền admin của chính mình' }, { status: 400 });
  const db = getDb();
  const before = db.prepare('SELECT id, name, email, role FROM users WHERE id = ? AND is_guest = 0').get(userId) as any;
  if (!before) return Response.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  writeAudit(db, { actorId: admin.userId, action: 'role_change', entityType: 'user', entityId: userId, before, after: { ...before, role } });
  return Response.json({ ok: true, role });
}
