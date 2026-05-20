/**
 * Pre-deploy check for scaling-related env vars. Run: node scripts/verify-scale-env.mjs
 * Loads .env.local when present (does not print secrets).
 */
import { loadEnvLocal } from './load-env-local.mjs';

loadEnvLocal();

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CLOUDFLARE_R2_BUCKET_NAME',
];

const workerRecommended = [
  'GENERATE_WORKER_ENABLED',
  'GENERATE_ASYNC_DEFAULT',
  'WORKER_INTERNAL_SECRET',
  'REDIS_URL',
];

let ok = true;
console.log('Orbstera scale env check\n');

for (const k of required) {
  const present = Boolean(process.env[k]?.trim());
  console.log(`${present ? '✓' : '✗'} ${k}`);
  if (!present) ok = false;
}

console.log('\nWorkers (production):');
for (const k of workerRecommended) {
  const v = process.env[k]?.trim();
  console.log(`${v ? '✓' : '○'} ${k}${v ? '' : ' (recommended)'}`);
}

if (process.env.GENERATE_ASYNC_DEFAULT === 'true' && process.env.GENERATE_WORKER_ENABLED !== 'true') {
  console.error('\n⚠ GENERATE_ASYNC_DEFAULT without GENERATE_WORKER_ENABLED — jobs will stall');
  ok = false;
}

process.exit(ok ? 0 : 1);
