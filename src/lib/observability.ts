import { randomUUID } from 'crypto';

/** Prefer client/proxy `x-request-id`; otherwise generate for log correlation. */
export function getOrCreateRequestId(req: Request): string {
  const h = req.headers.get('x-request-id')?.trim();
  return h && h.length > 0 ? h : randomUUID();
}

export function apiLog(
  scope: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  ctx: Record<string, unknown>,
): void {
  const payload = { ts: new Date().toISOString(), scope, level, message, ...ctx };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function captureApiException(err: unknown, ctx: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  apiLog('api', 'error', message, {
    ...ctx,
    name: err instanceof Error ? err.name : undefined,
    stack: err instanceof Error ? err.stack : undefined,
  });
  if (process.env.SENTRY_DSN) {
    void import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(err, { extra: ctx });
      })
      .catch(() => {
        /* optional */
      });
  }
}

/**
 * Startup connection health-check.
 * Verifies env-var presence for each service and pings Redis.
 * Never throws — safe to call from instrumentation.ts register().
 */
export async function runStartupHealthChecks(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  // Redis / Upstash — live ping
  try {
    const { pingRedis } = await import('@/lib/redis');
    const ok = await pingRedis();
    if (!ok) {
      console.warn('[health] Upstash Redis: UNREACHABLE — rate limiting is disabled');
    } else {
      console.log('[health] Upstash Redis: OK');
    }
  } catch (e) {
    console.error('[health] Upstash Redis check failed:', e);
  }

  // Supabase — check env vars only (no DB call at boot to avoid cold-start latency)
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const sbService = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (sbUrl && sbAnon && sbService) {
    console.log('[health] Supabase: credentials present ✓');
  } else {
    console.error('[health] Supabase: one or more credentials missing — auth/billing broken');
  }

  // Cloudflare R2
  const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();
  const r2Key = process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim();
  const r2Secret = process.env.CLOUDFLARE_R2_SECRET_KEY?.trim();
  const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
  if (r2Endpoint && r2Key && r2Secret && r2Bucket) {
    console.log('[health] Cloudflare R2: credentials present ✓');
  } else {
    console.warn('[health] Cloudflare R2: credentials missing — cloud save disabled');
  }

  // OpenRouter
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    console.log('[health] OpenRouter: API key present ✓');
  } else {
    console.error('[health] OpenRouter: OPENROUTER_API_KEY missing — AI generation disabled');
  }

  // Dodo Payments
  const dodoKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const dodoWebhook = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  const dodoEndpoint = process.env.DODO_PAYMENTS_ENDPOINT?.trim() ?? '';
  if (!dodoKey) console.warn('[health] Dodo Payments: API key missing');
  if (!dodoWebhook || dodoWebhook === 'dev' || dodoWebhook === 'your-webhook-secret') {
    console.error('[health] Dodo Payments: webhook secret missing/placeholder — subscriptions will fail');
  }
  if (dodoEndpoint.includes('test.dodo')) {
    console.warn('[health] Dodo Payments: test mode endpoint — no real charges');
  }
  if (dodoKey && dodoWebhook && dodoWebhook !== 'dev') {
    console.log('[health] Dodo Payments: OK');
  }
}
