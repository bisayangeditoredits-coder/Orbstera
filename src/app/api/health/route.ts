import { NextResponse } from 'next/server';
import { pingRedis } from '@/lib/redis';
import { getQueueMetrics } from '@/lib/jobs/queue-metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, string> = {};
  let ok = true;

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const sbService = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (sbUrl && sbAnon && sbService) {
    checks.supabase = 'ok';
  } else {
    checks.supabase = 'missing_env';
    ok = false;
  }

  const redisOk = await pingRedis();
  checks.redis = redisOk ? 'ok' : 'unreachable';
  if (!redisOk && process.env.NODE_ENV === 'production') ok = false;

  const r2 =
    process.env.CLOUDFLARE_R2_ENDPOINT?.trim() &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim() &&
    process.env.CLOUDFLARE_R2_SECRET_KEY?.trim() &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
  checks.r2 = r2 ? 'ok' : 'missing_env';

  checks.openrouter = process.env.OPENROUTER_API_KEY?.trim() ? 'ok' : 'missing_env';
  if (checks.openrouter !== 'ok') ok = false;

  let queue: Awaited<ReturnType<typeof getQueueMetrics>> | null = null;
  try {
    queue = await getQueueMetrics();
  } catch {
    checks.queue = 'error';
  }

  return NextResponse.json(
    {
      status: ok ? 'healthy' : 'degraded',
      checks,
      queue,
      ts: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
