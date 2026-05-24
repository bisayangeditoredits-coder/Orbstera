/**
 * Pre-deploy check for scaling-related env vars.
 *   node scripts/verify-scale-env.mjs           # full check (loads .env.local)
 *   node scripts/verify-scale-env.mjs --ci      # CI: logic only, no required secrets
 *   node scripts/verify-scale-env.mjs --strict  # production: workers must be enabled
 */
import { loadEnvLocal } from './load-env-local.mjs';

const args = new Set(process.argv.slice(2));
const ciMode = args.has('--ci');
const strictMode = args.has('--strict');

if (!ciMode) loadEnvLocal();

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CLOUDFLARE_R2_ENDPOINT',
  'CLOUDFLARE_R2_ACCESS_KEY',
  'CLOUDFLARE_R2_SECRET_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME',
  'DODO_PAYMENTS_WEBHOOK_SECRET',
];

const workerRequired = [
  'GENERATE_WORKER_ENABLED',
  'GENERATE_ASYNC_DEFAULT',
  'WORKER_INTERNAL_SECRET',
  'REDIS_URL',
];

let ok = true;
console.log(`Orbstera scale env check${ciMode ? ' (CI)' : ''}${strictMode ? ' (STRICT)' : ''}\n`);

if (ciMode) {
  console.log('CI mode: checking misconfiguration rules only.\n');
  if (
    process.env.GENERATE_ASYNC_DEFAULT === 'true' &&
    process.env.GENERATE_WORKER_ENABLED !== 'true'
  ) {
    console.error('✗ GENERATE_ASYNC_DEFAULT without GENERATE_WORKER_ENABLED');
    ok = false;
  } else {
    console.log('✓ No async-without-worker contradiction in CI env');
  }
  if (
    process.env.GENERATE_WORKER_ENABLED === 'true' &&
    !process.env.WORKER_INTERNAL_SECRET?.trim()
  ) {
    console.error('✗ GENERATE_WORKER_ENABLED without WORKER_INTERNAL_SECRET');
    ok = false;
  } else {
    console.log('✓ Worker secret rule OK');
  }
  process.exit(ok ? 0 : 1);
}

console.log('Required:');
for (const k of required) {
  const present = Boolean(process.env[k]?.trim());
  const badSecret =
    k === 'DODO_PAYMENTS_WEBHOOK_SECRET' &&
    ['dev', 'your-webhook-secret'].includes(process.env[k]?.trim() ?? '');
  console.log(`${present && !badSecret ? '✓' : '✗'} ${k}${badSecret ? ' (placeholder)' : ''}`);
  if (!present || badSecret) ok = false;
}

console.log('\nWorkers (production scale):');
for (const k of workerRequired) {
  const v = process.env[k]?.trim();
  const requiredNow = strictMode;
  const pass = Boolean(v);
  console.log(`${pass ? '✓' : requiredNow ? '✗' : '○'} ${k}${pass ? '' : requiredNow ? ' (required in --strict)' : ' (recommended)'}`);
  if (requiredNow && !pass) ok = false;
}

if (process.env.GENERATE_ASYNC_DEFAULT === 'true' && process.env.GENERATE_WORKER_ENABLED !== 'true') {
  console.error('\n✗ GENERATE_ASYNC_DEFAULT without GENERATE_WORKER_ENABLED — jobs will stall');
  ok = false;
}

if (process.env.GENERATE_WORKER_ENABLED === 'true' && !process.env.WORKER_INTERNAL_SECRET?.trim()) {
  console.error('\n✗ GENERATE_WORKER_ENABLED without WORKER_INTERNAL_SECRET');
  ok = false;
}

if (!process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL?.trim()) {
  console.warn('\n○ NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL unset — large decks may fail to save');
}

if (ok) {
  console.log('\n✅ Scale env check passed');
} else {
  console.error('\n❌ Scale env check failed — see docs/PRODUCTION_DEPLOY.md');
}

process.exit(ok ? 0 : 1);
