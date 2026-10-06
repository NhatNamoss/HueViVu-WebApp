import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRoles } from '@/lib/auth';
import { findPlaceDuplicates } from '@/lib/place-duplicates';

export async function POST(req: NextRequest) {
  const access = requireRoles(req, ['admin', 'reviewer', 'collector']);
  if (access instanceof Response) return access;
  const input = await req.json();
  return Response.json({ duplicates: findPlaceDuplicates(getDb(), input, input.id) });
}
