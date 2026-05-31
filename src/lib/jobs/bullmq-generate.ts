import type { DeckGenerationJobBody } from '@/lib/ai/run-deck-generation-batch';
import { processGenerateJob, type ProcessGenerateJobPayload } from '@/lib/jobs/process-generate-job';
import { signalJobCancellation } from '@/lib/jobs/redis-job-queue';

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

export async function cancelBullGenerateJob(jobId: string): Promise<'removed' | 'signalled' | 'not_found'> {
  const queue = await getQueue();
  if (!queue) return 'not_found';

  const job = await queue.getJob(jobId);
  if (!job) return 'not_found';

  const state = await job.getState();
  if (state === 'waiting' || state === 'delayed') {
    await job.remove();
    return 'removed';
  }

  if (state === 'active') {
    await signalJobCancellation(jobId);
    return 'signalled';
  }

  return 'not_found';
}

export async function enqueueBullGenerateJob(payload: ProcessGenerateJobPayload): Promise<boolean> {
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
  if (!redisUrl || !appUrl) return null;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && process.env.GENERATE_WORKER_USE_HTTP_CALLBACK !== 'true') {
    console.error(
      '[bullmq] SUPABASE_SERVICE_ROLE_KEY required for inline worker (or set GENERATE_WORKER_USE_HTTP_CALLBACK=true)',
    );
    return null;
  }

  const { Worker } = await import('bullmq');
  const IORedis = (await import('ioredis')).default;
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const data = job.data as ProcessGenerateJobPayload;
      await processGenerateJob(data);
    },
    { connection, concurrency: Number(process.env.GENERATE_WORKER_CONCURRENCY || 2) },
  );

  worker.on('completed', (job) => {
    console.log('[bullmq] completed', job.id);
  });

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
