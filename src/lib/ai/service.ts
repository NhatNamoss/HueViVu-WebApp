import { logger } from '@/lib/logger';

export type AiServiceRequest = { path: string; body: unknown };

export async function callAiService<T>(request: AiServiceRequest): Promise<T> {
  const baseUrl = process.env.AI_SERVICE_URL;
  if (!baseUrl) throw new Error('AI_SERVICE_URL is not configured');
  const started = Date.now();
  const response = await fetch(new URL(request.path, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(Number(process.env.AI_SERVICE_TIMEOUT_MS || 15000)),
    cache: 'no-store',
  });
  const durationMs = Date.now() - started;
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error('AI service request failed', { path: request.path, status: response.status, durationMs });
    throw new Error('AI service returned ' + response.status + ': ' + detail.slice(0, 300));
  }
  logger.info('AI service request completed', { path: request.path, status: response.status, durationMs });
  return response.json() as Promise<T>;
}
