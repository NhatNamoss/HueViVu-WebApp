import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRoles } from '@/lib/auth';
import { PLACE_CATEGORIES } from '@/lib/place-taxonomy';
import { parsePlaceRow } from '@/lib/place-data';
import { writeAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer']);
  if (access instanceof Response) return access;
  const db = getDb(); const places = (db.prepare('SELECT * FROM places').all() as any[]).map(parsePlaceRow); let created = 0;
  const exists = db.prepare("SELECT 1 FROM data_tasks WHERE task_type=? AND COALESCE(place_id,'')=COALESCE(?,'') AND title=? AND status IN ('open','in_progress')");
  const insert = db.prepare(`INSERT INTO data_tasks (id,place_id,task_type,title,description,priority,status,created_by) VALUES (?,?,?,?,?,?,?,?)`);
  for (const place of places) {
    const gaps: string[] = [];
    if (place.completeness_score < 80) gaps.push(`độ đầy đủ ${place.completeness_score}%`);
    if (place.needs_reverification) gaps.push('đến hạn tái xác minh');
    if (place.quality_issues?.length) gaps.push(...place.quality_issues);
    if (!gaps.length) continue;
    const title = `Rà soát dữ liệu: ${place.name}`;
    if (exists.get('quality_gap',place.id,title)) continue;
    insert.run(crypto.randomUUID(),place.id,'quality_gap',title,gaps.join(' · '),place.needs_reverification?'high':'medium','open',access.userId); created++;
  }
  for (const category of PLACE_CATEGORIES) {
    if (places.some(place => place.category === category.value)) continue;
    const title = `Bổ sung danh mục ${category.label}`;
    if (exists.get('coverage_gap',null,title)) continue;
    insert.run(crypto.randomUUID(),null,'coverage_gap',title,`Kho dữ liệu hiện chưa có địa điểm ${category.label}. Cần Collector khảo sát và nhập dữ liệu có nguồn.`, 'high','open',access.userId); created++;
  }
  writeAudit(db,{actorId:access.userId,action:'sync_tasks',entityType:'data_task',entityId:'batch',after:{created},note:'Đồng bộ nhiệm vụ từ dashboard chất lượng'});
  return Response.json({created});
}
