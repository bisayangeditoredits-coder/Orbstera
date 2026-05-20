/**
 * Lightweight load smoke test for /api/health and optional generate queue depth.
 * Usage: node scripts/load-test/generate-smoke.mjs https://your-app.vercel.app
 */
const base = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const concurrency = Number(process.argv[3] || 10);

async function hitHealth() {
  const res = await fetch(`${base}/api/health`);
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log(`Smoke test ${concurrency} parallel GET /api/health against ${base}`);
  const started = Date.now();
  const results = await Promise.all(Array.from({ length: concurrency }, () => hitHealth()));
  const ms = Date.now() - started;
  const ok = results.filter((r) => r.status === 200).length;
  console.log(`Done in ${ms}ms — ${ok}/${concurrency} healthy`);
  console.log(JSON.stringify(results[0]?.json, null, 2));
  if (ok < concurrency) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
