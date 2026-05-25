/**
 * In-process export worker: runs PPTX generation locally (no HTTP callback to Vercel).
 * Requires: UPSTASH_REDIS_REST_*, WORKER_INTERNAL_SECRET, Supabase + R2 + public/ assets.
 */
import './load-env-local';
import ws from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = ws;
}
import { Redis } from '@upstash/redis';
import { runPptxExport, type PptxExportBody } from '../src/lib/export/run-pptx-export';
import { updateJobRecord } from '../src/lib/jobs/redis-job-queue';

const QUEUE_KEY = 'queue:export:v1';
const CONCURRENCY = Math.max(1, parseInt(process.env.EXPORT_WORKER_CONCURRENCY || '2', 10) || 2);
const DRAIN_TIMEOUT_MS = Math.max(
  30_000,
  parseInt(process.env.EXPORT_WORKER_DRAIN_TIMEOUT_MS || '300000', 10) || 300_000,
);

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

let shuttingDown = false;
const active = new Set<Promise<void>>();

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

function trackJob(p: Promise<void>): void {
  active.add(p);
  void p.finally(() => {
    active.delete(p);
  });
}

async function drainActiveJobs(): Promise<boolean> {
  const deadline = Date.now() + DRAIN_TIMEOUT_MS;
  while (active.size > 0 && Date.now() < deadline) {
    await Promise.race([Promise.allSettled([...active]), new Promise((r) => setTimeout(r, 500))]);
  }
  return active.size === 0;
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(
    `[export-worker] ${signal} received — stopping dequeue, draining ${active.size} active job(s)…`,
  );

  const drained = await drainActiveJobs();
  if (!drained) {
    console.warn(`[export-worker] drain timeout — ${active.size} job(s) still running`);
    process.exit(1);
    return;
  }

  console.log('[export-worker] shutdown complete');
  process.exit(0);
}

function onSignal(signal: string): void {
  void gracefulShutdown(signal);
}

async function loop(): Promise<void> {
  if (!redis) {
    console.error('Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));

  console.log(`[export-worker] started (concurrency=${CONCURRENCY})`);

  for (;;) {
    if (shuttingDown) {
      if (active.size === 0) return;
      await drainActiveJobs();
      return;
    }

    while (!shuttingDown && active.size < CONCURRENCY) {
      const raw = await redis.rpop<string>(QUEUE_KEY);
      if (!raw) break;

      trackJob(processOne(typeof raw === 'string' ? raw : JSON.stringify(raw)));
    }

    if (shuttingDown) continue;

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
