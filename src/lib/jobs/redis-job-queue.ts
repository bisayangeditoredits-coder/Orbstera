import { redis } from '@/lib/redis';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type JobRecord = {
  id: string;
  userId: string;
  status: JobStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  /** Optional payload for clients polling `/api/jobs/[id]` */
  result?: unknown;
  error?: string;
  progress?: number;
  /** Billing metadata for cancellation refunds */
  billingRequestId?: string;
  estimatedCredits?: number;
  /** Free-tier deck slot reserved at request start */
  freeDeckReserved?: boolean;
};

const PREFIX = 'job:v1:';
const CANCEL_PREFIX = 'job:cancel:v1:';
const QUEUE_KEY = 'queue:generate:v1';
const TTL_SEC = 86_400;

/**
 * Lightweight job metadata in Redis for async pipelines (enhance/generate).
 * Returns null when Redis is not configured.
 */
export async function createJobRecord(
  partial: Pick<JobRecord, 'id' | 'type' | 'status' | 'userId'> &
    Partial<Pick<JobRecord, 'result' | 'error' | 'progress' | 'billingRequestId' | 'estimatedCredits' | 'freeDeckReserved'>>,
): Promise<JobRecord | null> {
  if (!redis) return null;
  const now = new Date().toISOString();
  const rec: JobRecord = {
    id: partial.id,
    userId: partial.userId,
    type: partial.type,
    status: partial.status,
    createdAt: now,
    updatedAt: now,
    result: partial.result,
    error: partial.error,
    progress: partial.progress,
    billingRequestId: partial.billingRequestId,
    estimatedCredits: partial.estimatedCredits,
    freeDeckReserved: partial.freeDeckReserved,
  };
  await redis.set(`${PREFIX}${partial.id}`, rec, { ex: TTL_SEC });
  return rec;
}

export async function getJobRecord(id: string): Promise<JobRecord | null> {
  if (!redis) return null;
  const v = await redis.get<JobRecord>(`${PREFIX}${id}`);
  return v ?? null;
}

function mergeJobRecord(cur: JobRecord, patch: Partial<JobRecord>): JobRecord {
  // Prevent late progress updates from reverting a terminal state back to 'running'
  // and prevent clobbering the error/result of a terminal state.
  let newStatus = patch.status ?? cur.status;
  let newError = patch.error !== undefined ? patch.error : cur.error;
  let newResult = patch.result !== undefined ? patch.result : cur.result;

  if (cur.status === 'completed' || cur.status === 'failed' || cur.status === 'cancelled') {
    if (newStatus === 'running' || newStatus === 'queued') {
      newStatus = cur.status; // keep terminal status
      newError = cur.error; // preserve existing error
      newResult = cur.result; // preserve existing result
    }
  }

  if (cur.status === 'cancelled') {
    newStatus = 'cancelled';
    newError = cur.error ?? patch.error;
  }

  return {
    ...cur,
    ...patch,
    status: newStatus,
    error: newError,
    result: newResult,
    id: cur.id,
    userId: cur.userId,
    type: patch.type ?? cur.type,
    updatedAt: new Date().toISOString(),
  };
}

/** Optimistic read-merge-write with retries to reduce lost progress updates under concurrent workers. */
export async function updateJobRecord(
  id: string,
  patch: Partial<JobRecord>,
): Promise<JobRecord | null> {
  if (!redis) return null;

  const key = `${PREFIX}${id}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const cur = await getJobRecord(id);
    if (!cur) return null;
    const next = mergeJobRecord(cur, patch);
    await redis.set(key, next, { ex: TTL_SEC });
    const verify = await redis.get<JobRecord>(key);
    if (
      verify &&
      verify.updatedAt === next.updatedAt &&
      verify.status === next.status &&
      (verify.progress ?? null) === (next.progress ?? null)
    ) {
      return verify;
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 15 * (attempt + 1)));
    }
  }

  return getJobRecord(id);
}

/** Push generate payload for an external worker (see docs/SCALING.md). */
export async function enqueueGenerateJob(payload: {
  jobId: string;
  userId: string;
  body: Record<string, unknown>;
  billingRequestId?: string;
  estimatedCredits?: number;
  freeDeckReserved?: boolean;
}): Promise<boolean> {
  if (!redis) return false;
  await createJobRecord({
    id: payload.jobId,
    userId: payload.userId,
    type: 'deck_generate',
    status: 'queued',
    billingRequestId: payload.billingRequestId,
    estimatedCredits: payload.estimatedCredits,
    freeDeckReserved: payload.freeDeckReserved,
  });

  try {
    const { enqueueBullGenerateJob } = await import('@/lib/jobs/bullmq-generate');
    const bullOk = await enqueueBullGenerateJob({
      jobId: payload.jobId,
      userId: payload.userId,
      body: payload.body as import('@/lib/ai/run-deck-generation-batch').DeckGenerationJobBody,
    });
    if (bullOk) return true;
  } catch {
    /* fall through to legacy list */
  }

  await redis.lpush(QUEUE_KEY, JSON.stringify(payload));
  return true;
}

export async function claimNextGenerateJob(): Promise<{
  jobId: string;
  userId: string;
  body: Record<string, unknown>;
} | null> {
  if (!redis) return null;
  const raw = await redis.rpop<string>(QUEUE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { jobId: string; userId: string; body: Record<string, unknown> };
  } catch {
    return null;
  }
}

export class JobCancelledError extends Error {
  constructor(message = 'Generation cancelled') {
    super(message);
    this.name = 'JobCancelledError';
  }
}

export async function signalJobCancellation(jobId: string): Promise<void> {
  if (!redis) return;
  await redis.set(`${CANCEL_PREFIX}${jobId}`, '1', { ex: TTL_SEC });
}

export async function isJobCancellationRequested(jobId: string): Promise<boolean> {
  if (!redis) return false;
  const v = await redis.get<string | number>(`${CANCEL_PREFIX}${jobId}`);
  return v === '1' || v === 1;
}

export async function clearJobCancellation(jobId: string): Promise<void> {
  if (!redis) return;
  await redis.del(`${CANCEL_PREFIX}${jobId}`);
}
