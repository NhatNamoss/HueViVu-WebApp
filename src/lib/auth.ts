import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getDb } from './db';

const SECRET = process.env.JWT_SECRET || 'huevivu_dev_secret_do_not_use_in_prod';

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function getAuthUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const payload = verifyToken(auth.slice(7));
  return payload?.userId || null;
}

export function requireAuth(req: NextRequest): { userId: string } | Response {
  const userId = getAuthUserId(req);
  if (!userId) {
    return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });
  }
  return { userId };
}

export function requireAdmin(req: NextRequest): { userId: string } | Response {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập quản trị' }, { status: 401 });
  const user = getDb().prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role?: string } | undefined;
  if (user?.role !== 'admin') return Response.json({ error: 'Không có quyền quản trị' }, { status: 403 });
  return { userId };
}

export function requireRoles(req: NextRequest, roles: string[]): { userId: string; role: string } | Response {
  const userId = getAuthUserId(req);
  if (!userId) return Response.json({ error: 'Cần đăng nhập' }, { status: 401 });
  const user = getDb().prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role?: string } | undefined;
  if (!user?.role || !roles.includes(user.role)) return Response.json({ error: 'Không có quyền thực hiện thao tác này' }, { status: 403 });
  return { userId, role: user.role };
}
