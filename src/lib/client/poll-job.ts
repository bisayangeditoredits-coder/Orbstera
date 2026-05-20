export type JobPollRecord = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
};

/** Exponential backoff capped at 8s to reduce poll amplification under load. */
function pollIntervalMs(attempt: number, baseMs: number): number {
  const exp = Math.min(baseMs * Math.pow(1.35, attempt), 8_000);
  return Math.round(exp);
}

export async function pollJobUntilDone(
  jobId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    onProgress?: (job: JobPollRecord) => void;
  },
): Promise<JobPollRecord> {
  const baseIntervalMs = options?.intervalMs ?? 1500;
  const timeoutMs = options?.timeoutMs ?? 600_000;
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      credentials: 'include',
      signal: options?.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err.message === 'string' ? err.message : `Job poll failed (${res.status})`,
      );
    }
    const job = (await res.json()) as JobPollRecord;
    options?.onProgress?.(job);

    if (job.status === 'completed') return job;
    if (job.status === 'failed') {
      throw new Error(job.error || 'Generation failed');
    }

    const waitMs = pollIntervalMs(attempt, baseIntervalMs);
    attempt += 1;
    await new Promise((r) => setTimeout(r, waitMs));
  }

  throw new Error('Job timed out');
}
