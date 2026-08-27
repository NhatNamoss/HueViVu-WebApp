import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(params.id) as any;
  if (!place) return Response.json({ error: 'Place not found' }, { status: 404 });

  place.highlights = JSON.parse(place.highlights || '[]');
  place.tips = JSON.parse(place.tips || '[]');
  place.tags = JSON.parse(place.tags || '[]');

  return Response.json(place);
}
