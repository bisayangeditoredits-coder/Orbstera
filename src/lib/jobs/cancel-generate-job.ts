import { refundCreditsForUser } from '@/lib/billing/credits';
import { decrementFreeTierUsage } from '@/lib/billing/free-tier-usage';
import { cancelBullGenerateJob } from '@/lib/jobs/bullmq-generate';
import {
  getJobRecord,
  signalJobCancellation,
  updateJobRecord,
} from '@/lib/jobs/redis-job-queue';

export type CancelGenerateJobResult =
  | { ok: true; status: 'cancelled' | 'already_terminal' }
  | { ok: false; error: 'NOT_FOUND' | 'FORBIDDEN' };

/**
 * Cancel an async deck generation job: remove from queue or signal active worker,
 * mark Redis record cancelled, and refund credits when billing metadata is present.
 */
export async function cancelGenerateJob(args: {
  jobId: string;
  userId: string;
}): Promise<CancelGenerateJobResult> {
  const job = await getJobRecord(args.jobId);
  if (!job) return { ok: false, error: 'NOT_FOUND' };
  if (job.userId !== args.userId) return { ok: false, error: 'FORBIDDEN' };

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return { ok: true, status: 'already_terminal' };
  }

  await signalJobCancellation(args.jobId);
  await cancelBullGenerateJob(args.jobId);

  await updateJobRecord(args.jobId, {
    status: 'cancelled',
    error: 'Cancelled by user',
  });

  const refundCost = Math.max(0, Math.round(job.estimatedCredits ?? 0));
  const billingRequestId = job.billingRequestId?.trim();
  if (refundCost > 0 && billingRequestId) {
    await refundCreditsForUser({
      userId: args.userId,
      cost: refundCost,
      idempotencyKey: `${billingRequestId}:cancel`,
      reason: 'generate_cancelled',
    });
  }

  if (job.freeDeckReserved) {
    await decrementFreeTierUsage(args.userId, 'free_ai_deck_generations');
  }

  return { ok: true, status: 'cancelled' };
}
