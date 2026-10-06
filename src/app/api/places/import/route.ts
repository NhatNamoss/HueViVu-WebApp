import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRoles } from '@/lib/auth';
import { preparePlacePayload } from '@/lib/place-data';
import { findPlaceDuplicates } from '@/lib/place-duplicates';
import { writeAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'collector']);
  if (access instanceof Response) return access;
  const { rows } = await req.json();
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) return Response.json({ error: 'File cần có 1–500 dòng dữ liệu' }, { status: 400 });
  const db = getDb(); const results: any[] = [];
  const insert = db.prepare(`INSERT INTO places
    (id,name,category,description,address,price,lat,lng,img,ai_insight,rating,popularity,avg_visit_min,meal_type,indoor,hours,hours_time,hours_note,opening_hours,phone,website,highlights,tips,tags,vibe,taste_profile,accessibility,best_time_of_day,specialties,crowd_level,physical_level,best_time,authenticity,walking_distance,ideal_pacing,noise_level,dining_style,weather_dependent,source_name,source_url,verification_status,verified_by,verified_at,verification_notes,publication_status,reverify_after_days)
    VALUES (${Array.from({length:46},()=>'?').join(',')})`);
  for (let index = 0; index < rows.length; index++) {
    try {
      const p = preparePlacePayload({ ...rows[index], verification_status: 'draft', publication_status: 'draft' });
      const duplicates = findPlaceDuplicates(db, p);
      if (duplicates.some((item: any) => item.reasons.includes('Trùng tên'))) { results.push({ row: index + 2, status: 'skipped', reason: 'Trùng tên địa điểm' }); continue; }
      const id = crypto.randomUUID();
      insert.run(id,p.name,p.category,p.description,p.address,p.price,p.lat,p.lng,p.img,p.ai_insight,p.rating,p.popularity,p.avg_visit_min,p.meal_type,p.indoor,p.hours,p.hours_time,p.hours_note,p.opening_hours,p.phone,p.website,p.highlights,p.tips,p.tags,p.vibe,p.taste_profile,p.accessibility,p.best_time_of_day,p.specialties,p.crowd_level,p.physical_level,p.best_time,p.authenticity,p.walking_distance,p.ideal_pacing,p.noise_level,p.dining_style,p.weather_dependent,p.source_name,p.source_url,'draft',p.verified_by,null,p.verification_notes,'draft',p.reverify_after_days);
      writeAudit(db,{actorId:access.userId,action:'import',entityType:'place',entityId:id,after:p,note:`Import CSV dòng ${index+2}`});
      results.push({ row: index + 2, status: 'created', id });
    } catch (error: any) { results.push({ row: index + 2, status: 'error', reason: error.message }); }
  }
  return Response.json({ results, created: results.filter(item=>item.status==='created').length, skipped: results.filter(item=>item.status==='skipped').length, errors: results.filter(item=>item.status==='error').length });
}
