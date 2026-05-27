import { pingRedis } from '@/lib/redis';
import { getQueueMetrics } from '@/lib/jobs/queue-metrics';
import { getWorkerDiagnostics, pingR2, pingSupabase } from '@/lib/health/deep-checks';

export type StatusSnapshot = {
  status: 'healthy' | 'degraded';
  checks: Record<string, string>;
  queue: Awaited<ReturnType<typeof getQueueMetrics>> | null;
  worker: ReturnType<typeof getWorkerDiagnostics>;
  region: string | null;
  ts: string;
};

export async function getStatusSnapshot(): Promise<StatusSnapshot> {
  const checks: Record<string, string> = {};
  let ok = true;

  const sbEnv =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!sbEnv) {
    checks.supabase = 'missing_env';
    ok = false;
  } else {
    const sbPing = await pingSupabase();
    checks.supabase = sbPing;
    if (sbPing !== 'ok' && process.env.NODE_ENV === 'production') ok = false;
  }

  const redisOk = await pingRedis();
  checks.redis = redisOk ? 'ok' : 'unreachable';
  if (!redisOk && process.env.NODE_ENV === 'production') ok = false;

  const r2Env =
    process.env.CLOUDFLARE_R2_ENDPOINT?.trim() &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim() &&
    process.env.CLOUDFLARE_R2_SECRET_KEY?.trim() &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
  if (!r2Env) {
    checks.r2 = 'missing_env';
  } else {
    const r2Ping = await pingR2();
    checks.r2 = r2Ping;
    if (r2Ping === 'unreachable' && process.env.NODE_ENV === 'production') ok = false;
  }

  checks.openrouter = process.env.OPENROUTER_API_KEY?.trim() ? 'ok' : 'missing_env';
  if (checks.openrouter !== 'ok') ok = false;

  const worker = getWorkerDiagnostics();
  if (worker.misconfigured && process.env.NODE_ENV === 'production') {
    checks.worker = 'misconfigured';
    ok = false;
  } else {
    checks.worker = worker.queueEnabled ? 'queue_on' : 'sync_default';
  }

  let queue: Awaited<ReturnType<typeof getQueueMetrics>> | null = null;
  try {
    queue = await getQueueMetrics();
    if (queue?.worker.misconfigured && process.env.NODE_ENV === 'production') {
      ok = false;
    }
    const depth =
      (queue?.legacyListDepth ?? 0) +
      (typeof queue?.bullmqWaiting === 'number' ? queue.bullmqWaiting : 0) +
      (queue?.exportQueueDepth ?? 0);
    if (depth > 500) {
      checks.queue_backlog = 'high';
    }
  } catch {
    checks.queue = 'error';
  }

  return {
    status: ok ? 'healthy' : 'degraded',
    checks,
    queue,
    worker,
    region: process.env.VERCEL_REGION ?? null,
    ts: new Date().toISOString(),
  };
}
