import { redis } from '@/lib/redis';
import { getWorkerDiagnostics } from '@/lib/health/deep-checks';

const QUEUE_KEY = 'queue:generate:v1';
const QUEUE_KEY_V2 = 'bull:generate:wait';
const EXPORT_QUEUE_KEY = 'queue:export:v1';

export type QueueMetrics = {
  legacyListDepth: number;
  bullmqWaiting: number | null;
  exportQueueDepth: number;
  worker: ReturnType<typeof getWorkerDiagnostics>;
};

export async function getQueueMetrics(): Promise<QueueMetrics | null> {
  if (!redis) {
    return {
      legacyListDepth: 0,
      bullmqWaiting: null,
      exportQueueDepth: 0,
      worker: getWorkerDiagnostics(),
    };
  }
  const [legacyListDepth, bullmqWaiting, exportQueueDepth] = await Promise.all([
    redis.llen(QUEUE_KEY).catch(() => 0),
    redis.llen(QUEUE_KEY_V2).catch(() => null),
    redis.llen(EXPORT_QUEUE_KEY).catch(() => 0),
  ]);
  return {
    legacyListDepth: legacyListDepth ?? 0,
    bullmqWaiting: bullmqWaiting ?? null,
    exportQueueDepth: exportQueueDepth ?? 0,
    worker: getWorkerDiagnostics(),
  };
}
