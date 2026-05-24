export type JobPollRecord = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
};

export type PollJobOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onProgress?: (job: JobPollRecord) => void;
  /** Force HTTP polling even when SSE is available */
  preferPolling?: boolean;
};

const DEFAULT_TIMEOUT_MS = 600_000;

/** Aggressive exponential backoff with jitter (HTTP fallback). */
function pollIntervalMs(attempt: number, baseMs: number): number {
  const exp = Math.min(baseMs * Math.pow(1.55, attempt), 30_000);
  const jitter = Math.floor(Math.random() * 400);
  return Math.round(exp + jitter);
}

function parseSseEvents(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  return { events: parts.filter(Boolean), rest };
}

function parseSseDataLine(block: string): JobPollRecord | null {
  for (const line of block.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const raw = line.slice(5).trim();
    if (!raw) continue;
    try {
      return JSON.parse(raw) as JobPollRecord;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Single SSE connection; server polls Redis every 2s.
 */
async function watchJobViaSse(jobId: string, options?: PollJobOptions): Promise<JobPollRecord> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (options?.signal) {
    if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    options.signal.addEventListener('abort', onAbort, { once: true });
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/stream`, {
      method: 'GET',
      credentials: 'include',
      signal: controller.signal,
      headers: { Accept: 'text/event-stream' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof (err as { message?: string }).message === 'string'
          ? (err as { message: string }).message
          : `Job stream failed (${res.status})`,
      );
    }

    if (!res.body) {
      throw new Error('Job stream unavailable');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseEvents(buffer);
      buffer = rest;

      for (const block of events) {
        const job = parseSseDataLine(block);
        if (!job?.status) continue;
        options?.onProgress?.(job);
        if (job.status === 'completed') return job;
        if (job.status === 'failed') {
          throw new Error(job.error || 'Generation failed');
        }
      }
    }

    throw new Error('Job stream ended unexpectedly');
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw e;
  } finally {
    clearTimeout(timeoutId);
    if (options?.signal) options.signal.removeEventListener('abort', onAbort);
  }
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

async function pollJobViaHttp(jobId: string, options?: PollJobOptions): Promise<JobPollRecord> {
  const baseIntervalMs = options?.intervalMs ?? 2_000;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
        typeof (err as { message?: string }).message === 'string'
          ? (err as { message: string }).message
          : `Job poll failed (${res.status})`,
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

/**
 * Prefer SSE (one connection); fall back to HTTP polling with aggressive backoff.
 */
export async function pollJobUntilDone(
  jobId: string,
  options?: PollJobOptions,
): Promise<JobPollRecord> {
  if (!options?.preferPolling && typeof fetch !== 'undefined') {
    try {
      return await watchJobViaSse(jobId, options);
    } catch (e) {
      if (isAbortError(e)) throw e;
      console.warn('[poll-job] SSE unavailable, falling back to HTTP poll:', e);
    }
  }
  return pollJobViaHttp(jobId, options);
}
