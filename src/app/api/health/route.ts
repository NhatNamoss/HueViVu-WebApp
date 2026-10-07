import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = { database: 'ok' };
  try {
    const secret = process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32 || secret === 'huevivu_dev_secret_do_not_use_in_prod')) {
      throw new Error('Authentication configuration missing');
    }
    const db = getDb();
    db.prepare('SELECT 1').get();
    const row = db.prepare("SELECT COUNT(*) AS count FROM places WHERE publication_status = 'published'").get() as { count: number };
    if (!row.count) throw new Error('No published places');

    checks.redis = process.env.REDIS_URL ? 'configured' : 'not-configured';
    checks.aiService = process.env.AI_SERVICE_URL ? 'configured' : 'not-configured';
    return Response.json({ status: 'ok', service: 'huevivu-web', checks }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    checks.database = 'unavailable';
    logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ status: 'unavailable', service: 'huevivu-web', checks }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
