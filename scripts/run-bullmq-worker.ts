/**
 * BullMQ worker — runs deck generation inline (no Vercel callback).
 *
 * Requires: REDIS_URL, NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY
 * Optional: GENERATE_WORKER_CONCURRENCY (default 2)
 * Legacy: GENERATE_WORKER_USE_HTTP_CALLBACK=true + WORKER_INTERNAL_SECRET
 *
 * Usage: npx tsx scripts/run-bullmq-worker.ts
 */
import './load-env-local';
import ws from 'ws';
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = ws;
}
import type { BullWorkerHandle } from '../src/lib/jobs/bullmq-generate';
import { createBullWorker } from '../src/lib/jobs/bullmq-generate';

let handle: BullWorkerHandle | null = null;
let shuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bullmq-worker] ${signal} received — pausing queue and draining active jobs…`);

  if (!handle) {
    process.exit(0);
    return;
  }

  try {
    await handle.worker.pause(true);
    await handle.shutdown();
    console.log('[bullmq-worker] shutdown complete');
    process.exit(0);
  } catch (e) {
    console.error('[bullmq-worker] shutdown error', e);
    process.exit(1);
  }
}

function onSignal(signal: string): void {
  void gracefulShutdown(signal);
}

async function main() {
  handle = await createBullWorker();
  if (!handle) {
    console.error(
      'BullMQ worker not started. Set REDIS_URL (or UPSTASH_REDIS_URL), NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY.',
    );
    process.exit(1);
  }

  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));

  console.log('[bullmq-worker] listening on queue generate-deck');
  handle.worker.on('failed', (job, err) => {
    console.error('[bullmq-worker] job failed', job?.id, err?.message);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
