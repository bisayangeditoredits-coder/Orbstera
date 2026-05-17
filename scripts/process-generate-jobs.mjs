/**
 * Optional worker: claims generate jobs from Redis queue:generate:v1.
 * Requires UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, and app env.
 *
 * Usage: node scripts/process-generate-jobs.mjs
 */
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const QUEUE_KEY = 'queue:generate:v1';
const PREFIX = 'job:v1:';

async function loop() {
  const raw = await redis.rpop(QUEUE_KEY);
  if (!raw) {
    await new Promise((r) => setTimeout(r, 2000));
    return loop();
  }
  const job = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const { jobId, userId } = job;
  console.log('[worker] claimed', jobId, 'user', userId);
  await redis.set(`${PREFIX}${jobId}`, {
    id: jobId,
    userId,
    type: 'deck_generate',
    status: 'running',
    updatedAt: new Date().toISOString(),
  }, { ex: 86400 });
  // Full generation should call the same orchestration as POST /api/generate.
  // Wire your deployment to hit an internal route or shared module here.
  console.warn('[worker] Implement generation handler for payload:', job.body?.prompt?.slice?.(0, 80));
  await redis.set(`${PREFIX}${jobId}`, {
    id: jobId,
    userId,
    type: 'deck_generate',
    status: 'failed',
    error: 'Worker not fully configured — run sync generate or implement handler',
    updatedAt: new Date().toISOString(),
  }, { ex: 86400 });
  return loop();
}

if (!process.env.UPSTASH_REDIS_REST_URL) {
  console.error('Missing UPSTASH_REDIS_REST_URL');
  process.exit(1);
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
