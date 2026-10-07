import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 254 || password.length > 256) return Response.json({ error: 'Hãy nhập email và mật khẩu hợp lệ.' }, { status: 400 });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(String(email).trim().toLowerCase()) as any;
    if (!user || user.id === 'user_demo001') return Response.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });

    if (!await bcrypt.compare(password, user.password_hash)) {
      return Response.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }

    const safeUser = { ...user };
    delete safeUser.password_hash;
    return Response.json({ token: generateToken(user.id), user: safeUser });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi đăng nhập: ' + err.message }, { status: 500 });
  }
}
