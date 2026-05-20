/**
 * In-process export worker: runs PPTX generation locally (no HTTP callback to Vercel).
 * Requires: UPSTASH_REDIS_REST_*, WORKER_INTERNAL_SECRET, Supabase + R2 + public/ assets.
 */
import './load-env-local';
import { Redis } from '@upstash/redis';
import { runPptxExport, type PptxExportBody } from '../src/lib/export/run-pptx-export';
import { updateJobRecord } from '../src/lib/jobs/redis-job-queue';

const QUEUE_KEY = 'queue:export:v1';
const CONCURRENCY = Math.max(1, parseInt(process.env.EXPORT_WORKER_CONCURRENCY || '2', 10) || 2);

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function processOne(raw: string): Promise<void> {
  const job = JSON.parse(raw) as { jobId: string; userId: string; body: PptxExportBody };
  const { jobId, userId, body } = job;
  console.log('[export-worker] processing', jobId);

  await updateJobRecord(jobId, { status: 'running', progress: 5 });

  try {
    await runPptxExport({ userId, body, jobId });
    console.log('[export-worker] completed', jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Export failed';
    console.error('[export-worker] failed', jobId, e);
    await updateJobRecord(jobId, {
      status: 'failed',
      error: message,
    });
  }
}

async function loop(): Promise<void> {
  if (!redis) {
    console.error('Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  console.log(`[export-worker] started (concurrency=${CONCURRENCY})`);

  const active = new Set<Promise<void>>();

  for (;;) {
    while (active.size < CONCURRENCY) {
      const raw = await redis.rpop<string>(QUEUE_KEY);
      if (!raw) break;

      const p = processOne(typeof raw === 'string' ? raw : JSON.stringify(raw)).finally(() => {
        active.delete(p);
      });
      active.add(p);
    }

    if (active.size === 0) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    await Promise.race([...active, new Promise((r) => setTimeout(r, 500))]);
  }
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
