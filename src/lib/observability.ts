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
 * Called from instrumentation.ts register() in production.
 * Logs each service's reachability without throwing.
 */
export async function runStartupHealthChecks(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;

  // Redis / Upstash
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

  // Supabase — lightweight meta call
  try {
    const { createAdminClient } = await import('@/lib/auth/supabase-admin');
    const sb = createAdminClient();
    const { error } = await sb.from('profiles').select('id').limit(1).single();
    // PGRST116 = no rows, which is OK — means connection works
    if (error && error.code !== 'PGRST116') {
      console.warn('[health] Supabase: query error —', error.message);
    } else {
      console.log('[health] Supabase: OK');
    }
  } catch (e) {
    console.error('[health] Supabase check failed:', e);
  }

  // Cloudflare R2 — only check if credentials are present
  const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT?.trim();
  const r2Key = process.env.CLOUDFLARE_R2_ACCESS_KEY?.trim();
  if (r2Endpoint && r2Key) {
    console.log('[health] Cloudflare R2: credentials present ✓');
  } else {
    console.warn('[health] Cloudflare R2: credentials missing — cloud save disabled');
  }

  // OpenRouter
  const orKey = process.env.OPENROUTER_API_KEY?.trim();
  if (orKey) {
    console.log('[health] OpenRouter: API key present ✓');
  } else {
    console.error('[health] OpenRouter: OPENROUTER_API_KEY missing — AI generation disabled');
  }

  // Dodo Payments
  const dodoKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const dodoWebhook = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!dodoKey) console.warn('[health] Dodo Payments: API key missing');
  if (!dodoWebhook || dodoWebhook === 'dev')
    console.error('[health] Dodo Payments: webhook secret missing/dev — subscriptions will fail');
  if (dodoKey && dodoWebhook && dodoWebhook !== 'dev')
    console.log('[health] Dodo Payments: OK');
}
