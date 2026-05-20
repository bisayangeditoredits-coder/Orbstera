import { redis } from '@/lib/redis';

const QUEUE_KEY = 'queue:generate:v1';
const QUEUE_KEY_V2 = 'bull:generate:wait';

export type QueueMetrics = {
  legacyListDepth: number;
  bullmqWaiting: number | null;
};

export async function getQueueMetrics(): Promise<QueueMetrics | null> {
  if (!redis) return null;
  const [legacyListDepth, bullmqWaiting] = await Promise.all([
    redis.llen(QUEUE_KEY).catch(() => 0),
    redis.llen(QUEUE_KEY_V2).catch(() => null),
  ]);
  return {
    legacyListDepth: legacyListDepth ?? 0,
    bullmqWaiting: bullmqWaiting ?? null,
  };
}
