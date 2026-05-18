/** Production boot checks — called from instrumentation register(). */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  // Hard requirements — app cannot function without these
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
    console.error('[env] ❌ Missing required production variables:', missing.join(', '));
  }

  // Webhook secret must not be placeholder
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  if (!secret || secret === 'dev' || secret === 'your-webhook-secret') {
    console.error('[env] ❌ DODO_PAYMENTS_WEBHOOK_SECRET must be a real secret in production');
  }

  // Dodo endpoint must be production (not test)
  const dodoEndpoint = process.env.DODO_PAYMENTS_ENDPOINT?.trim() ?? '';
  if (dodoEndpoint.includes('test.dodo')) {
    console.warn('[env] ⚠️  DODO_PAYMENTS_ENDPOINT is using test mode — no real charges will be made');
  }

  // Soft requirements — degraded experience if missing
  const recommended: [string, string][] = [
    ['CLOUDFLARE_R2_ENDPOINT', 'Cloud save / PPTX uploads disabled'],
    ['CLOUDFLARE_R2_ACCESS_KEY', 'Cloud save / PPTX uploads disabled'],
    ['CLOUDFLARE_R2_SECRET_KEY', 'Cloud save / PPTX uploads disabled'],
    ['CLOUDFLARE_R2_BUCKET_NAME', 'Cloud save / PPTX uploads disabled'],
    ['NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL', 'Large-image auto-upload will use data URLs (slower)'],
    ['RESEND_API_KEY', 'Contact form emails disabled'],
  ];
  for (const [key, consequence] of recommended) {
    if (!process.env[key]?.trim()) {
      console.warn(`[env] ⚠️  ${key} not set — ${consequence}`);
    }
  }

  console.log('[env] ✅ Environment validation complete');
}
