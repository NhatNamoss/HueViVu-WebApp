import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/places
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const q = searchParams.get('q');

  const conditions: string[] = [];
  const params: any[] = [];

  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (q) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const places = db.prepare(`SELECT * FROM places${where} ORDER BY popularity DESC, rating DESC`).all(...params) as any[];

  places.forEach(p => {
    p.highlights = JSON.parse(p.highlights || '[]');
    p.tips = JSON.parse(p.tips || '[]');
    p.tags = JSON.parse(p.tags || '[]');
  });

  return Response.json(places);
}
