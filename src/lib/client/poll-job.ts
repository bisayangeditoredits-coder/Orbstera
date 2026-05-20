export type JobPollRecord = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
};

export async function pollJobUntilDone(
  jobId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    onProgress?: (job: JobPollRecord) => void;
  },
): Promise<JobPollRecord> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 600_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      credentials: 'include',
      signal: options?.signal,
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

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error('Job timed out');
}
