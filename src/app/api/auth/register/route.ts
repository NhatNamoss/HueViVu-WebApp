import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) return Response.json({ error: 'Thiếu thông tin đăng ký' }, { status: 400 });

    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
      return Response.json({ error: 'Email đã được sử dụng' }, { status: 409 });
    }

    const id = 'user_' + uuidv4().replace(/-/g, '').slice(0, 12);
    const hash = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(id, name, email, hash);

    const user = db.prepare('SELECT id, name, email, level, total_trips FROM users WHERE id = ?').get(id);
    return Response.json({ token: generateToken(id), user });
  } catch (err: any) {
    return Response.json({ error: 'Lỗi đăng ký: ' + err.message }, { status: 500 });
  }
}
