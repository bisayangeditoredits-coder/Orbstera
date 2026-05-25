# Orbstera — production deploy checklist

Use this before every production release. Goal: **thousands of DAU**, minimal 500s, AI off serverless long-requests.

## 1. Supabase

- [ ] Project on **Pro** (or higher) with **connection pooler** (Supavisor) enabled
- [ ] Run all migrations in `supabase/migrations/` (order by date prefix)
- [ ] Auth redirect URLs include production domain
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only on server / workers — never client

## 2. Environment variables (Vercel / host)

Copy from `.env.example`. Required:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| `SUPABASE_SERVICE_ROLE_KEY` | |
| `OPENROUTER_API_KEY` | |
| `UPSTASH_REDIS_REST_URL` | Rate limits fail-closed without this in prod |
| `UPSTASH_REDIS_REST_TOKEN` | |
| `CLOUDFLARE_R2_*` | Endpoint, keys, bucket |
| `NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL` | Large deck image offload |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Real secret, not `dev` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` — required for PPTX export when slide images use relative `/api/...` URLs |

**Scale (required for production traffic):**

| Variable | Value |
|----------|--------|
| `GENERATE_WORKER_ENABLED` | `true` |
| `GENERATE_ASYNC_DEFAULT` | `true` |
| `GENERATE_USE_JOB_QUEUE` | `true` |
| `WORKER_INTERNAL_SECRET` | Long random string (same on app + workers) |
| `REDIS_URL` | Upstash TCP / `rediss://...` for BullMQ |

Optional tuning: `GENERATE_ASYNC_SLIDE_THRESHOLD=12`, `EXPORT_ASYNC_SLIDE_THRESHOLD=12`, `GENERATE_WORKER_CONCURRENCY=8`, `SENTRY_DSN`.

Verify locally or in CI:

```bash
npm run verify:scale-env:strict
```

## 3. Background workers

Deploy **at least one** always-on container (Fly.io, Railway, ECS, etc.):

```bash
# Build
docker build -f Dockerfile.worker -t orbstera-worker .

# Run with same env as app (REDIS_URL, WORKER_INTERNAL_SECRET, Supabase, OpenRouter, R2)
docker run --env-file .env.production orbstera-worker
```

Or without Docker:

```bash
npm run worker:generate:bullmq   # terminal 1 — inline AI (no Vercel callback)
npm run worker:export:inline     # terminal 2
```

Worker env must include `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (same as Vercel).  
`WORKER_INTERNAL_SECRET` is only needed if `GENERATE_WORKER_USE_HTTP_CALLBACK=true`.

## 4. Cloudflare (recommended)

- [ ] Proxy DNS for app domain
- [ ] WAF / bot fight on `/api/*`
- [ ] R2 public bucket or custom domain for assets

## 5. Post-deploy checks

```bash
curl -s https://YOUR_DOMAIN/api/health | jq
npm run load-test:health -- https://YOUR_DOMAIN 20
```

Expect:

- `status`: `"healthy"` (or `degraded` only during partial outage)
- `checks.redis`: `"ok"`
- `worker.misconfigured`: `false`
- `queue` depths not in hundreds

## 6. Smoke test (manual)

1. Sign up / log in
2. Create deck → edit → wait for cloud sync (saved)
3. Generate **15-slide** deck → **202** response + job completes (not 5 min hang)
4. Export PPTX on large deck
5. Billing webhook test in Dodo dashboard

## 7. Monitoring

- [ ] Sentry `SENTRY_DSN` on app
- [ ] Alert if `/api/health` returns 503 for 5+ minutes
- [ ] Log drain for `sync_sse_fallback_large_deck` (means workers misconfigured)

## Rollback

- Revert Vercel deployment
- Drain worker queue before stopping workers (`GET /api/health` → queue depth)
- Do not disable Redis in production (AI routes return 503)

See also: [SCALING.md](./SCALING.md), [INFRASTRUCTURE_AUDIT.md](./INFRASTRUCTURE_AUDIT.md).
