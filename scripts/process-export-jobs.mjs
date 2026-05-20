/**
 * Export worker: claims queue:export:v1 and calls /api/export/pptx with worker headers.
 */
import { Redis } from '@upstash/redis';

const QUEUE_KEY = 'queue:export:v1';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const WORKER_SECRET = process.env.WORKER_INTERNAL_SECRET?.trim();

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function loop() {
  if (!redis || !WORKER_SECRET) {
    console.error('Missing Upstash Redis or WORKER_INTERNAL_SECRET');
    process.exit(1);
  }
  for (;;) {
    const raw = await redis.rpop(QUEUE_KEY);
    if (!raw) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    const job = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const { jobId, userId, body } = job;
    console.log('[export-worker] processing', jobId);
    try {
      const res = await fetch(`${APP_URL}/api/export/pptx?jobId=${encodeURIComponent(jobId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': WORKER_SECRET,
          'x-user-id': userId,
          'x-export-job-id': jobId,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`${res.status} ${t}`);
      }
      console.log('[export-worker] completed', jobId);
    } catch (e) {
      console.error('[export-worker] failed', jobId, e);
      await redis.set(`job:v1:${jobId}`, {
        id: jobId,
        userId,
        type: 'export_pptx',
        status: 'failed',
        error: e instanceof Error ? e.message : 'Export failed',
        updatedAt: new Date().toISOString(),
      }, { ex: 86400 });
    }
  }
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
