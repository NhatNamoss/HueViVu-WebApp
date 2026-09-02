import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const example = db.prepare('SELECT * FROM training_examples WHERE id = ?').get(params.id);
    if (!example) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(example);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const data = await req.json();

    const user_profile = data.user_profile || '';
    const context = data.context || '';
    const output = data.output || '';
    const reward = data.reward !== undefined ? parseFloat(data.reward) : 1.0;
    const source = data.source || 'chatbot';
    const image_url = data.image_url || null;

    const stmt = db.prepare(`
      UPDATE training_examples 
      SET user_profile = ?, context = ?, output = ?, reward = ?, source = ?, image_url = ?
      WHERE id = ?
    `);

    stmt.run(user_profile, context, output, reward, source, image_url, params.id);

    return Response.json({ message: 'Updated successfully' });
  } catch (error: any) {
    console.error('Error updating training example:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM training_examples WHERE id = ?').run(params.id);
    return Response.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting training example:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
