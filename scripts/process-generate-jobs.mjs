/**
 * Generate worker: BullMQ (REDIS_URL) or legacy Redis list (Upstash REST).
 *
 * Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (legacy)
 *      REDIS_URL or UPSTASH_REDIS_URL (BullMQ / ioredis)
 *      NEXT_PUBLIC_APP_URL, WORKER_INTERNAL_SECRET
 */
import { Redis } from '@upstash/redis';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const QUEUE_KEY = 'queue:generate:v1';
const PREFIX = 'job:v1:';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const WORKER_SECRET = process.env.WORKER_INTERNAL_SECRET?.trim();

async function processLegacyJob(job) {
  const { jobId, userId, body } = job;
  console.log('[worker] legacy claimed', jobId, 'user', userId);
  if (!WORKER_SECRET) {
    console.error('[worker] Set WORKER_INTERNAL_SECRET and deploy /api/internal/process-generate');
    await updateLegacyJob(jobId, userId, 'failed', 'WORKER_INTERNAL_SECRET not configured');
    return;
  }
  await updateLegacyJob(jobId, userId, 'running');
  try {
    const res = await fetch(`${APP_URL}/api/internal/process-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': WORKER_SECRET,
      },
      body: JSON.stringify({ jobId, userId, body }),
      signal: AbortSignal.timeout(280_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`${res.status} ${t}`);
    }
    console.log('[worker] completed', jobId);
  } catch (e) {
    console.error('[worker] failed', jobId, e);
    await updateLegacyJob(
      jobId,
      userId,
      'failed',
      e instanceof Error ? e.message : 'Generation failed',
    );
  }
}

async function updateLegacyJob(jobId, userId, status, error) {
  if (!redis) return;
  const patch = {
    id: jobId,
    userId,
    type: 'deck_generate',
    status,
    updatedAt: new Date().toISOString(),
  };
  if (error) patch.error = error;
  await redis.set(`${PREFIX}${jobId}`, patch, { ex: 86400 });
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function legacyLoop() {
  if (!redis) {
    console.error('Missing UPSTASH_REDIS_REST_URL for legacy queue');
    return;
  }
  for (;;) {
    const raw = await redis.rpop(QUEUE_KEY);
    if (!raw) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    const job = typeof raw === 'string' ? JSON.parse(raw) : raw;
    await processLegacyJob(job);
  }
}

async function main() {
  const redisUrl = process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim();
  if (redisUrl && WORKER_SECRET) {
    try {
      const { createBullWorker } = await import('../dist/lib/jobs/bullmq-generate.js').catch(() =>
        import('../src/lib/jobs/bullmq-generate.ts').catch(() => null),
      );
      if (!createBullWorker) {
        const bullPath = require.resolve('bullmq');
        void bullPath;
        const mod = await import('tsx/esm').catch(() => null);
        if (mod) {
          console.log('[worker] Start BullMQ via: npx tsx scripts/run-bullmq-worker.ts');
        }
      }
    } catch {
      /* use dedicated tsx script */
    }
    console.log('[worker] BullMQ mode: run `npx tsx scripts/run-bullmq-worker.ts` when REDIS_URL is set');
  }

  if (redis) {
    console.log('[worker] Legacy Upstash list consumer started');
    await legacyLoop();
  } else {
    console.error('No queue backend configured');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
