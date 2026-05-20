import { redis } from '@/lib/redis';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

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
};

const PREFIX = 'job:v1:';
const QUEUE_KEY = 'queue:generate:v1';
const TTL_SEC = 86_400;

/**
 * Lightweight job metadata in Redis for async pipelines (enhance/generate).
 * Returns null when Redis is not configured.
 */
export async function createJobRecord(
  partial: Pick<JobRecord, 'id' | 'type' | 'status' | 'userId'> &
    Partial<Pick<JobRecord, 'result' | 'error' | 'progress'>>,
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
  };
  await redis.set(`${PREFIX}${partial.id}`, rec, { ex: TTL_SEC });
  return rec;
}

export async function getJobRecord(id: string): Promise<JobRecord | null> {
  if (!redis) return null;
  const v = await redis.get<JobRecord>(`${PREFIX}${id}`);
  return v ?? null;
}

export async function updateJobRecord(
  id: string,
  patch: Partial<JobRecord>,
): Promise<JobRecord | null> {
  if (!redis) return null;
  const cur = await getJobRecord(id);
  if (!cur) return null;
  const next: JobRecord = {
    ...cur,
    ...patch,
    id: cur.id,
    userId: cur.userId,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(`${PREFIX}${id}`, next, { ex: TTL_SEC });
  return next;
}

/** Push generate payload for an external worker (see docs/SCALING.md). */
export async function enqueueGenerateJob(payload: {
  jobId: string;
  userId: string;
  body: Record<string, unknown>;
}): Promise<boolean> {
  if (!redis) return false;
  await createJobRecord({
    id: payload.jobId,
    userId: payload.userId,
    type: 'deck_generate',
    status: 'queued',
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
