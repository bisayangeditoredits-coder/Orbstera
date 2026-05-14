import { redis } from '@/lib/redis';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type JobRecord = {
  id: string;
  status: JobStatus;
  type: string;
  createdAt: string;
  updatedAt: string;
  /** Optional payload for clients polling `/api/jobs/[id]` */
  result?: unknown;
  error?: string;
};

const PREFIX = 'job:v1:';
const TTL_SEC = 86_400;

/**
 * Lightweight job metadata in Redis for future async pipelines (enhance/generate).
 * Returns null when Redis is not configured.
 */
export async function createJobRecord(
  partial: Pick<JobRecord, 'id' | 'type' | 'status'> & Partial<Pick<JobRecord, 'result' | 'error'>>,
): Promise<JobRecord | null> {
  if (!redis) return null;
  const now = new Date().toISOString();
  const rec: JobRecord = {
    id: partial.id,
    type: partial.type,
    status: partial.status,
    createdAt: now,
    updatedAt: now,
    result: partial.result,
    error: partial.error,
  };
  await redis.set(`${PREFIX}${partial.id}`, rec, { ex: TTL_SEC });
  return rec;
}

export async function getJobRecord(id: string): Promise<JobRecord | null> {
  if (!redis) return null;
  const v = await redis.get<JobRecord>(`${PREFIX}${id}`);
  return v ?? null;
}

export async function updateJobRecord(id: string, patch: Partial<JobRecord>): Promise<JobRecord | null> {
  if (!redis) return null;
  const cur = await getJobRecord(id);
  if (!cur) return null;
  const next: JobRecord = {
    ...cur,
    ...patch,
    id: cur.id,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(`${PREFIX}${id}`, next, { ex: TTL_SEC });
  return next;
}
