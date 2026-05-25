/**
 * Post-deploy check: Vercel /api/health + optional worker env file.
 *
 *   node scripts/verify-worker-deployment.mjs
 *   node scripts/verify-worker-deployment.mjs https://orbstera.vercel.app
 *   npm run verify:worker-deployment -- https://your-app.vercel.app
 */
const base =
  process.argv[2]?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  'https://orbstera.vercel.app';

const url = `${base.replace(/\/$/, '')}/api/health`;

async function main() {
  console.log(`Checking ${url}\n`);
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    console.error('✗ Could not reach health endpoint:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const body = await res.json().catch(() => ({}));
  console.log(JSON.stringify(body, null, 2));

  let ok = res.ok && body.status === 'healthy';

  if (body.checks?.redis !== 'ok') {
    console.error('\n✗ checks.redis is not ok — set UPSTASH_REDIS_REST_* on Vercel');
    ok = false;
  }
  if (body.checks?.r2 !== 'ok') {
    console.error('\n✗ checks.r2 is not ok — check CLOUDFLARE_R2_* on Vercel');
    ok = false;
  }
  if (body.worker?.misconfigured || body.queue?.worker?.misconfigured) {
    console.error(
      '\n✗ worker misconfigured — set GENERATE_WORKER_ENABLED, WORKER_INTERNAL_SECRET, GENERATE_USE_JOB_QUEUE on Vercel',
    );
    ok = false;
  }
  if (body.checks?.queue_backlog === 'high') {
    console.warn('\n○ queue_backlog high — add worker capacity or concurrency');
  }
  if (body.checks?.worker === 'sync_default' && body.worker?.queueEnabled !== true) {
    console.warn('\n○ Workers may not be enabled — expect long sync generate on Vercel');
  }

  if (ok) {
    console.log('\n✅ Production health OK for async workers (Vercel side)');
    console.log('   Next: confirm Railway logs show bullmq + export-worker started');
  } else {
    console.error('\n❌ Health check failed — see docs/WORKER_DEPLOY.md');
    process.exit(1);
  }
}

main();
