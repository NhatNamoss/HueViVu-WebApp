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

// PUT /api/places/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const data = await req.json();

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
      UPDATE places SET 
        name = ?, category = ?, description = ?, address = ?, price = ?, lat = ?, lng = ?, img = ?, ai_insight = ?,
        highlights = ?, tips = ?, tags = ?, vibe = ?, taste_profile = ?, accessibility = ?, best_time_of_day = ?, specialties = ?,
        crowd_level = ?, physical_level = ?, best_time = ?, authenticity = ?, walking_distance = ?, ideal_pacing = ?, noise_level = ?, dining_style = ?, weather_dependent = ?
      WHERE id = ?
    `);

    stmt.run(
      name, category, description, address, price, lat, lng, img, ai_insight,
      highlights, tips, tags, vibe, taste_profile, accessibility, best_time_of_day, specialties,
      crowd_level, physical_level, best_time, authenticity, walking_distance, ideal_pacing, noise_level, dining_style, weather_dependent,
      params.id
    );

    return Response.json({ message: 'Updated successfully' });
  } catch (error: any) {
    console.error('Error updating place:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/places/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM places WHERE id = ?').run(params.id);
    return Response.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting place:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
