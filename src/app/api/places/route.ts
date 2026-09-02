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

// POST /api/places
export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const data = await req.json();

    const id = crypto.randomUUID();
    const name = data.name;
    const category = data.category;
    const description = data.description || '';
    const address = data.address || '';
    const price = data.price || 'Miễn phí';
    const lat = data.lat ? parseFloat(data.lat) : 16.4637;
    const lng = data.lng ? parseFloat(data.lng) : 107.5909;
    const img = data.img || '/assets/citadel.png';
    const ai_insight = data.ai_insight || '';
    
    // Convert arrays to JSON strings
    const highlights = JSON.stringify(data.highlights || []);
    const tips = JSON.stringify(data.tips || []);
    const tags = JSON.stringify(data.tags || []);
    const vibe = JSON.stringify(data.vibe || []);
    const taste_profile = JSON.stringify(data.taste_profile || []);
    const accessibility = JSON.stringify(data.accessibility || []);
    const best_time_of_day = JSON.stringify(data.best_time_of_day || []);
    const specialties = JSON.stringify(data.specialties || []);

    const crowd_level = data.crowd_level || 'medium';
    const physical_level = data.physical_level || 'easy';
    const best_time = data.best_time || 'all';
    const authenticity = data.authenticity || '';
    const walking_distance = data.walking_distance || '';
    const ideal_pacing = data.ideal_pacing || '';
    const noise_level = data.noise_level || '';
    const dining_style = data.dining_style || '';
    const weather_dependent = data.weather_dependent ? '1' : '0';

    const stmt = db.prepare(`
      INSERT INTO places (
        id, name, category, description, address, price, lat, lng, img, ai_insight,
        highlights, tips, tags, vibe, taste_profile, accessibility, best_time_of_day, specialties,
        crowd_level, physical_level, best_time, authenticity, walking_distance, ideal_pacing, noise_level, dining_style, weather_dependent
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      id, name, category, description, address, price, lat, lng, img, ai_insight,
      highlights, tips, tags, vibe, taste_profile, accessibility, best_time_of_day, specialties,
      crowd_level, physical_level, best_time, authenticity, walking_distance, ideal_pacing, noise_level, dining_style, weather_dependent
    );

    return Response.json({ id, message: 'Created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating place:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
