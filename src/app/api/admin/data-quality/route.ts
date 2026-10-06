import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRoles } from '@/lib/auth';
import { PLACE_CATEGORIES } from '@/lib/place-taxonomy';
import { parsePlaceRow } from '@/lib/place-data';

export async function GET(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer', 'collector']);
  if (access instanceof Response) return access;
  const places = (getDb().prepare('SELECT * FROM places').all() as any[]).map(parsePlaceRow);
  const coverage = PLACE_CATEGORIES.map(category => {
    const rows = places.filter(place => place.category === category.value);
    return { ...category, total: rows.length, verified: rows.filter(place => place.verification_status === 'verified').length, published: rows.filter(place => place.publication_status === 'published').length, average_quality: rows.length ? Math.round(rows.reduce((sum, place) => sum + place.completeness_score, 0) / rows.length) : 0 };
  });
  const missing = {
    hours: places.filter(place => !place.hours && !Object.values(place.opening_hours || {}).some((items: any) => items.length)).length,
    source: places.filter(place => !place.source_url).length,
    image: places.filter(place => !place.img).length,
    phone: places.filter(place => !place.phone).length,
    description: places.filter(place => !place.description || place.description.length < 60).length,
    coordinates: places.filter(place => !Number(place.lat) || !Number(place.lng)).length,
  };
  return Response.json({ total: places.length, verified: places.filter(place => place.verification_status === 'verified').length, published: places.filter(place => place.publication_status === 'published').length, waiting_review: places.filter(place => place.verification_status === 'reviewed').length, needs_reverification: places.filter(place => place.needs_reverification).length, unpublished: places.filter(place => place.publication_status !== 'published').length, coverage, missing });
}
