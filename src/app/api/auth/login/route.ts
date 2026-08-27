import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return Response.json({ error: 'Thiếu email hoặc mật khẩu' }, { status: 400 });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return Response.json({ error: 'Email không tồn tại' }, { status: 401 });

    if (!await bcrypt.compare(password, user.password_hash)) {
      return Response.json({ error: 'Mật khẩu không đúng' }, { status: 401 });
    }

    const { password_hash, ...safeUser } = user;
    return Response.json({ token: generateToken(user.id), user: safeUser });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi đăng nhập: ' + err.message }, { status: 500 });
  }
}
