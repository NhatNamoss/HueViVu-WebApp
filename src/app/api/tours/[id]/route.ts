import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const JSON_FIELDS = ['gallery', 'place_ids', 'highlights', 'includes', 'excludes', 'tags'];

function parseTour(t: any) {
  JSON_FIELDS.forEach(f => { try { t[f] = JSON.parse(t[f] || '[]'); } catch { t[f] = []; } });
  return t;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(params.id) as any;
  if (!tour) return Response.json({ error: 'Not found' }, { status: 404 });

  parseTour(tour);

  // Resolve place details
  if (tour.place_ids?.length) {
    const placeholders = tour.place_ids.map(() => '?').join(',');
    const places = db.prepare(`SELECT id, name, category, rating, price, img, lat, lng, avg_visit_min, description, address FROM places WHERE id IN (${placeholders})`).all(...tour.place_ids) as any[];
    // Maintain order
    const map = new Map(places.map((p: any) => [p.id, p]));
    tour.places = tour.place_ids.map((id: string) => map.get(id)).filter(Boolean);
  } else {
    tour.places = [];
  }

  return Response.json(tour);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const d = await req.json();

    db.prepare(`UPDATE tours SET
      title=?, slug=?, description=?, short_desc=?, theme=?, duration_hours=?, price=?, original_price=?,
      cover_img=?, gallery=?, place_ids=?, highlights=?, includes=?, excludes=?,
      difficulty=?, max_people=?, rating=?, review_count=?, tags=?, is_featured=?, is_active=?, sort_order=?
      WHERE id=?`).run(
      d.title || '', d.slug || '', d.description || '', d.short_desc || '',
      d.theme || 'classic', d.duration_hours ?? 8, d.price ?? 0, d.original_price ?? 0,
      d.cover_img || '/assets/citadel.png',
      JSON.stringify(d.gallery || []), JSON.stringify(d.place_ids || []),
      JSON.stringify(d.highlights || []), JSON.stringify(d.includes || []),
      JSON.stringify(d.excludes || []),
      d.difficulty || 'easy', d.max_people ?? 10, d.rating ?? 4.8, d.review_count ?? 0,
      JSON.stringify(d.tags || []), d.is_featured ? 1 : 0, d.is_active !== false ? 1 : 0, d.sort_order ?? 0,
      params.id
    );

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare('DELETE FROM tours WHERE id = ?').run(params.id);
  return Response.json({ ok: true });
}
