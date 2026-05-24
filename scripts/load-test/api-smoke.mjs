/**
 * API smoke: parallel /api/health + optional authenticated routes need cookies (health only here).
 * Usage: node scripts/load-test/api-smoke.mjs https://your-app.vercel.app [concurrency]
 */
const base = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const concurrency = Math.min(50, Math.max(1, Number(process.argv[3] || 15)));

async function hit(path) {
  const url = `${base}${path}`;
  const started = performance.now();
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  const ms = Math.round(performance.now() - started);
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-json */
  }
  return { path, status: res.status, ms, json };
}

async function main() {
  console.log(`API smoke: ${concurrency}× GET /api/health → ${base}\n`);
  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: concurrency }, () => hit('/api/health')),
  );
  const elapsed = Date.now() - started;

  const ok200 = results.filter((r) => r.status === 200).length;
  const ok503 = results.filter((r) => r.status === 503).length;
  const p95 = results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length * 0.95)] ?? 0;

  console.log(`Finished in ${elapsed}ms`);
  console.log(`  200: ${ok200}/${concurrency}`);
  console.log(`  503: ${ok503}/${concurrency}`);
  console.log(`  p95 latency: ${p95}ms\n`);

  const sample = results[0]?.json;
  if (sample) {
    console.log('Sample health body:');
    console.log(JSON.stringify(sample, null, 2));
  }

  if (ok200 < concurrency) {
    console.error('\nFAIL: not all health checks returned 200');
    process.exit(1);
  }

  if (sample?.worker?.misconfigured) {
    console.error('\nFAIL: worker misconfigured — set GENERATE_WORKER_ENABLED + WORKER_INTERNAL_SECRET');
    process.exit(1);
  }

  console.log('\nOK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
