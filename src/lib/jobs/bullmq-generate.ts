import type { DeckGenerationJobBody } from '@/lib/ai/run-deck-generation-batch';

const QUEUE_NAME = 'generate-deck';

let queuePromise: Promise<import('bullmq').Queue | null> | null = null;

async function getQueue(): Promise<import('bullmq').Queue | null> {
  const redisUrl = process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim();
  if (!redisUrl) return null;

  if (!queuePromise) {
    queuePromise = (async () => {
      try {
        const { Queue } = await import('bullmq');
        const IORedis = (await import('ioredis')).default;
        const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
        return new Queue(QUEUE_NAME, { connection });
      } catch (e) {
        console.warn('[bullmq] Queue init failed:', e);
        return null;
      }
    })();
  }
  return queuePromise;
}

export async function enqueueBullGenerateJob(payload: {
  jobId: string;
  userId: string;
  body: DeckGenerationJobBody;
}): Promise<boolean> {
  const queue = await getQueue();
  if (!queue) return false;
  await queue.add(
    'deck_generate',
    payload,
    {
      jobId: payload.jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  );
  return true;
}

export type BullWorkerHandle = {
  worker: import('bullmq').Worker;
  connection: import('ioredis').Redis;
  shutdown: () => Promise<void>;
};

export async function createBullWorker(): Promise<BullWorkerHandle | null> {
  const redisUrl = process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const secret = process.env.WORKER_INTERNAL_SECRET?.trim();
  if (!redisUrl || !appUrl || !secret) return null;

  const { Worker } = await import('bullmq');
  const IORedis = (await import('ioredis')).default;
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const data = job.data as { jobId: string; userId: string; body: DeckGenerationJobBody };
      const res = await fetch(`${appUrl.replace(/\/$/, '')}/api/internal/process-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': secret,
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(280_000),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Internal process-generate ${res.status}: ${t}`);
      }
    },
    { connection, concurrency: Number(process.env.GENERATE_WORKER_CONCURRENCY || 2) },
  );

  return {
    worker,
    connection,
    async shutdown() {
      await worker.close();
      try {
        await connection.quit();
      } catch {
        connection.disconnect();
      }
    },
  };
}
