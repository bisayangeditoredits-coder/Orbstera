import type { DeckGenerationJobBody } from '@/lib/ai/run-deck-generation-batch';
import { runDeckGenerationBatch } from '@/lib/ai/run-deck-generation-batch';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';
import { updateJobRecord } from '@/lib/jobs/redis-job-queue';

export type ProcessGenerateJobPayload = {
  jobId: string;
  userId: string;
  body: DeckGenerationJobBody;
};

/**
 * Runs deck generation on the worker process (no Vercel HTTP callback).
 * Updates Redis job records for client polling.
 */
export async function processGenerateJobInline(payload: ProcessGenerateJobPayload): Promise<void> {
  const { jobId, userId, body } = payload;
  if (!jobId?.trim() || !userId?.trim() || !body?.prompt?.trim()) {
    throw new Error('Invalid generate job payload');
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    throw new Error('Supabase not configured (SUPABASE_SERVICE_ROLE_KEY)');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  await updateJobRecord(jobId, { status: 'running', progress: 0, error: undefined });

  try {
    const result = await runDeckGenerationBatch({
      appUrl,
      supabase,
      userId,
      body,
      onProgress: (progress) => {
        void updateJobRecord(jobId, { status: 'running', progress, error: undefined });
      },
    });

    await updateJobRecord(jobId, {
      status: 'completed',
      progress: 100,
      result,
      error: undefined,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Generation failed';
    await updateJobRecord(jobId, {
      status: 'failed',
      error: message,
    });
    throw e;
  }
}

/** Legacy HTTP callback to Vercel (opt-in via GENERATE_WORKER_USE_HTTP_CALLBACK=true). */
export async function processGenerateJobViaHttp(payload: ProcessGenerateJobPayload): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const secret = process.env.WORKER_INTERNAL_SECRET?.trim();
  if (!appUrl || !secret) {
    throw new Error('NEXT_PUBLIC_APP_URL and WORKER_INTERNAL_SECRET required for HTTP callback mode');
  }

  const res = await fetch(`${appUrl.replace(/\/$/, '')}/api/internal/process-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(280_000),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Internal process-generate ${res.status}: ${t}`);
  }
}

export function shouldUseGenerateWorkerHttpCallback(): boolean {
  return process.env.GENERATE_WORKER_USE_HTTP_CALLBACK === 'true';
}

export async function processGenerateJob(payload: ProcessGenerateJobPayload): Promise<void> {
  if (shouldUseGenerateWorkerHttpCallback()) {
    return processGenerateJobViaHttp(payload);
  }
  return processGenerateJobInline(payload);
}
