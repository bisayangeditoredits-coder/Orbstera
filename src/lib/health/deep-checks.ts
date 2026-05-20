import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';
import { isGenerateQueueEnabled } from '@/lib/jobs/generate-queue-config';

export type DeepCheckResult = {
  supabase: 'ok' | 'unreachable' | 'missing_env';
  r2: 'ok' | 'unreachable' | 'missing_env' | 'skipped';
  worker: {
    queueEnabled: boolean;
    workerFlag: boolean;
    misconfigured: boolean;
    hint?: string;
  };
};

const CHECK_TIMEOUT_MS = 4_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

/** Lightweight Supabase round-trip (service role, no user data). */
export async function pingSupabase(): Promise<'ok' | 'unreachable' | 'missing_env'> {
  const sb = getServiceSupabase();
  if (!sb) return 'missing_env';
  try {
    const { error } = await withTimeout(
      Promise.resolve(sb.from('credit_configs').select('id').limit(1).maybeSingle()),
      CHECK_TIMEOUT_MS,
    );
    if (error) return 'unreachable';
    return 'ok';
  } catch {
    return 'unreachable';
  }
}

/** R2 bucket reachability via HeadBucket (credentials + permissions). */
export async function pingR2(): Promise<'ok' | 'unreachable' | 'missing_env'> {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();
  const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim();
  const secretKey = process.env.CLOUDFLARE_R2_SECRET_KEY?.trim();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
  if (!endpoint || !accessKey || !secretKey || !bucket) return 'missing_env';

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  try {
    await withTimeout(
      client.send(new HeadBucketCommand({ Bucket: bucket })),
      CHECK_TIMEOUT_MS,
    );
    return 'ok';
  } catch {
    return 'unreachable';
  }
}

export function getWorkerDiagnostics(): DeepCheckResult['worker'] {
  const workerFlag = process.env.GENERATE_WORKER_ENABLED === 'true';
  const queueEnabled = isGenerateQueueEnabled();
  const asyncDefault = process.env.GENERATE_ASYNC_DEFAULT === 'true';
  const useQueue = process.env.GENERATE_USE_JOB_QUEUE === 'true';

  let misconfigured = false;
  let hint: string | undefined;

  if (workerFlag && !process.env.WORKER_INTERNAL_SECRET?.trim()) {
    misconfigured = true;
    hint = 'GENERATE_WORKER_ENABLED without WORKER_INTERNAL_SECRET';
  } else if ((asyncDefault || useQueue) && !workerFlag) {
    misconfigured = true;
    hint = 'Async queue flags set but GENERATE_WORKER_ENABLED is not true — jobs will stall';
  } else if (queueEnabled && !process.env.REDIS_URL?.trim() && !process.env.UPSTASH_REDIS_REST_URL?.trim()) {
    misconfigured = true;
    hint = 'Queue enabled but no REDIS_URL or UPSTASH_REDIS_REST_URL';
  }

  return { queueEnabled, workerFlag, misconfigured, hint };
}
