/** Production boot checks — called from instrumentation register(). */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'DODO_PAYMENTS_WEBHOOK_SECRET',
  ] as const;

  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    console.error('[env] Missing required production variables:', missing.join(', '));
  }

  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (secret === 'dev' || !secret) {
    console.error('[env] DODO_PAYMENTS_WEBHOOK_SECRET must be set in production');
  }
}
