/**
 * BullMQ worker entry (requires REDIS_URL + WORKER_INTERNAL_SECRET + NEXT_PUBLIC_APP_URL).
 * Usage: npx tsx scripts/run-bullmq-worker.ts
 */
import { createBullWorker } from '../src/lib/jobs/bullmq-generate';

async function main() {
  const worker = await createBullWorker();
  if (!worker) {
    console.error(
      'BullMQ worker not started. Set REDIS_URL (or UPSTASH_REDIS_URL), WORKER_INTERNAL_SECRET, NEXT_PUBLIC_APP_URL.',
    );
    process.exit(1);
  }
  console.log('[bullmq-worker] listening on queue generate-deck');
  worker.on('failed', (job, err) => {
    console.error('[bullmq-worker] job failed', job?.id, err?.message);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
