import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRoles } from '@/lib/auth';

const FIELDS = ['id','name','category','description','address','price','lat','lng','phone','website','hours','hours_note','source_name','source_url','verification_status','publication_status','verified_by','verified_at','reverify_after_days'];
const csv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer', 'collector']);
  if (access instanceof Response) return access;
  const rows = getDb().prepare(`SELECT ${FIELDS.join(',')} FROM places ORDER BY name`).all() as Record<string, unknown>[];
  const body = [FIELDS.map(csv).join(','), ...rows.map(row => FIELDS.map(field => csv(row[field])).join(','))].join('\r\n');
  return new Response('\uFEFF' + body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="huevivu-places-${new Date().toISOString().slice(0,10)}.csv"` } });
}
