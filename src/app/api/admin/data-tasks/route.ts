import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRoles } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer', 'collector']);
  if (access instanceof Response) return access;
  const status = req.nextUrl.searchParams.get('status') || 'open';
  const rows = getDb().prepare(`SELECT t.*, p.name AS place_name, u.name AS assignee_name FROM data_tasks t LEFT JOIN places p ON t.place_id=p.id LEFT JOIN users u ON t.assigned_to=u.id WHERE (?='all' OR t.status=?) ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at DESC`).all(status,status);
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer', 'collector']);
  if (access instanceof Response) return access;
  const data = await req.json();
  if (!data.title?.trim()) return Response.json({ error: 'Cần tiêu đề nhiệm vụ' }, { status: 400 });
  const id = crypto.randomUUID(); const db = getDb();
  db.prepare(`INSERT INTO data_tasks (id,place_id,task_type,title,description,priority,status,assigned_to,created_by,due_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,data.place_id||null,data.task_type||'manual',data.title.trim(),data.description||'',data.priority||'medium','open',data.assigned_to||null,access.userId,data.due_at||null);
  writeAudit(db,{actorId:access.userId,action:'create_task',entityType:'data_task',entityId:id,after:data});
  return Response.json({id},{status:201});
}

export async function PUT(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer', 'collector']);
  if (access instanceof Response) return access;
  const data = await req.json(); const db = getDb();
  const before = db.prepare('SELECT * FROM data_tasks WHERE id=?').get(data.id) as any;
  if (!before) return Response.json({error:'Không tìm thấy nhiệm vụ'},{status:404});
  const status = ['open','in_progress','resolved','dismissed'].includes(data.status) ? data.status : before.status;
  db.prepare(`UPDATE data_tasks SET status=?,assigned_to=?,evidence=?,resolution_note=?,updated_at=datetime('now') WHERE id=?`).run(status,data.assigned_to??before.assigned_to,data.evidence??before.evidence,data.resolution_note??before.resolution_note,data.id);
  writeAudit(db,{actorId:access.userId,action:'update_task',entityType:'data_task',entityId:data.id,before,after:{...before,...data,status}});
  return Response.json({ok:true});
}
