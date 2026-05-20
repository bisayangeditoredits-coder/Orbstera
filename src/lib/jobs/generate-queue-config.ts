import { asyncGenerateSlideThreshold } from '@/lib/infra/scaling-flags';

/**
 * Async deck generation requires both the feature flag and a live worker deployment.
 * Without GENERATE_WORKER_ENABLED, queued jobs would fail (see scripts/process-generate-jobs.mjs).
 */
export function isGenerateQueueEnabled(): boolean {
  if (process.env.GENERATE_WORKER_ENABLED !== 'true') return false;
  return (
    process.env.GENERATE_USE_JOB_QUEUE === 'true' ||
    process.env.GENERATE_ASYNC_DEFAULT === 'true'
  );
}

export function isGenerateAsyncDefault(): boolean {
  return process.env.GENERATE_ASYNC_DEFAULT === 'true' && isGenerateQueueEnabled();
}

/** Prefer async queue for large decks when workers are available (reduces serverless SSE load). */
export function shouldPreferAsyncGenerate(slideCount: number): boolean {
  if (!isGenerateQueueEnabled()) return false;
  if (isGenerateAsyncDefault()) return true;
  return slideCount >= asyncGenerateSlideThreshold();
}
