import { Queue } from 'bullmq';

let queue: Queue | null = null;

export function getJobQueue() {
  if (queue) return queue;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  queue = new Queue('huevivu', {
    connection: { url: redisUrl },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    },
  });
  return queue;
}

export async function enqueueJob<T extends Record<string, unknown>>(name: string, data: T) {
  const queue = getJobQueue();
  if (!queue) throw new Error('REDIS_URL is not configured; background jobs are unavailable');
  return queue.add(name, data);
}
