import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

// POST /api/trips/[id]/add-place
// body: { dayIndex: number, activity: Activity }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getAuthUserId(req);
    const body = await req.json();
    const { dayIndex, activity } = body;

    if (dayIndex === undefined || !activity?.name) {
      return Response.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const db = getDb();
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id) as any;
    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 });

    // Allow owner or demo user
    if (userId && trip.user_id !== userId && trip.user_id !== 'user_demo001') {
      return Response.json({ error: 'Không có quyền chỉnh sửa' }, { status: 403 });
    }

    const itinerary = JSON.parse(trip.itinerary || '{}');
    const days: any[] = itinerary.days || [];

    const di = Number(dayIndex);
    if (di < 0 || di >= days.length) {
      return Response.json({ error: 'Ngày không hợp lệ' }, { status: 400 });
    }

    // Check time conflict (±30 min)
    const [nh, nm] = (activity.time || '10:00').split(':').map(Number);
    const newMin = nh * 60 + nm;
    const existing = days[di].activities || [];
    const conflict = existing.find((a: any) => {
      const [ah, am] = (a.time || '').split(':').map(Number);
      return Math.abs((ah * 60 + am) - newMin) < 30;
    });
    if (conflict) {
      return Response.json({ error: `Trùng giờ với "${conflict.name}"`, conflict: conflict.name }, { status: 409 });
    }

    // Insert and sort by time
    days[di].activities = [...existing, activity].sort((a, b) => {
      const [ah, am] = (a.time || '').split(':').map(Number);
      const [bh, bm] = (b.time || '').split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    itinerary.days = days;
    db.prepare('UPDATE trips SET itinerary = ? WHERE id = ?').run(JSON.stringify(itinerary), params.id);

    return Response.json({ success: true, trip: { ...trip, itinerary } });
  } catch (err: any) {
    console.error('[add-place]', err);
    return Response.json({ error: 'Lỗi: ' + err.message }, { status: 500 });
  }
}
