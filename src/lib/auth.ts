import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getDb } from './db';
import { randomBytes } from 'crypto';

const authGlobal = globalThis as typeof globalThis & { huevivuDevSecret?: string };
function getSecret(): string {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 32 && configured !== 'huevivu_dev_secret_do_not_use_in_prod') return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must contain at least 32 characters');
  return authGlobal.huevivuDevSecret ??= randomBytes(48).toString('hex');
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, getSecret(), { expiresIn: '30d', algorithm: 'HS256' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.userId === 'string' ? { userId: payload.userId } : null;
  } catch {
    return null;
  }
}

export function getAuthUserId(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const payload = verifyToken(auth.slice(7));
  if (!payload?.userId || payload.userId === 'user_demo001') return null;
  return getDb().prepare('SELECT id FROM users WHERE id = ?').get(payload.userId) ? payload.userId : null;
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
