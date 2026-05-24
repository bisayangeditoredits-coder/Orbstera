# Scalability guide (Orbstera / pptmaker)

**Deploy checklist:** [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)  
Full audit: [INFRASTRUCTURE_AUDIT.md](./INFRASTRUCTURE_AUDIT.md).

```bash
npm run verify:scale-env:strict   # before production deploy
npm run load-test:api -- https://your-app.com 20
docker compose -f docker-compose.workers.yml up   # local workers
```

## Production requirements

| Service | Purpose |
|---------|---------|
| **Upstash Redis** | Rate limits, AI cache, credit config cache, job metadata, generate/export queues |
| **Supabase** | Auth, profiles, credits, ledger |
| **Cloudflare R2** | Deck JSON + per-user `index.json` / `index.meta.json` |
| **Vercel (or Node host)** | Next.js App Router API routes |
| **Worker container** (optional) | `Dockerfile.worker` — BullMQ or legacy queue consumers |

In production, AI routes **fail closed** if `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are missing.

Health: `GET /api/health` — Supabase/R2 live pings, Redis, queue depth, worker misconfiguration warnings.

## Async deck generation

1. Set `GENERATE_WORKER_ENABLED=true` and deploy a worker (`npm run worker:generate` or `worker:generate:bullmq` with `REDIS_URL`).
2. Set `GENERATE_USE_JOB_QUEUE=true` and/or `GENERATE_ASYNC_DEFAULT=true` (recommended: async default in production).
3. Set `WORKER_INTERNAL_SECRET` on app + worker.
4. `POST /api/generate` returns **202** with `{ jobId }`; client polls `GET /api/jobs/[id]`.

When workers are enabled, decks with **≥12 slides** (override `GENERATE_ASYNC_SLIDE_THRESHOLD`) auto-queue even without `GENERATE_ASYNC_DEFAULT`.

BullMQ workers run `runDeckGenerationBatch` **inline** (no Vercel HTTP). Set `GENERATE_WORKER_USE_HTTP_CALLBACK=true` only for legacy HTTP to `/api/internal/process-generate`. BullMQ is used when `REDIS_URL` is set; otherwise legacy `queue:generate:v1` list.

## Async PPTX export

Decks with **≥12 slides** (override `EXPORT_ASYNC_SLIDE_THRESHOLD`): `POST /api/export/pptx?async=1` → **202** + job poll. Run `npm run worker:export` (in-process PPTX by default via `scripts/run-export-worker.ts`; set `EXPORT_WORKER_INLINE=false` for legacy HTTP callback).

Verify env before deploy: `npm run verify:scale-env:strict` (see [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md))

## Job status (clients)

- Prefer **SSE**: `GET /api/jobs/[id]/stream` (one connection; server polls Redis every 2s).
- Fallback: `GET /api/jobs/[id]` with exponential backoff (client `pollJobUntilDone`).

## Credits under load

- **Redis fast-path** (`src/lib/billing/credit-redis.ts`): atomic reserve in Upstash before `consume_credits_atomic_v2`, rollback on RPC failure.
- Disable with `CREDITS_REDIS_FAST_PATH=false`.

## API rate limits (storage)

Presentation CRUD and R2 uploads use separate Upstash limits (`api:read` / `api:write`). See `src/lib/auth/require-api-route.ts`.

## R2 index concurrency

Per-user deck lists use optimistic locking via `index.meta.json` (`src/lib/server/r2-index.ts`). For 500+ decks per user, enable sharding helpers in `src/lib/server/r2-index-shard.ts` (`R2_INDEX_SHARD_SIZE`).

## Credit caps (canonical defaults)

| Plan | Monthly credits |
|------|-----------------|
| free | 150 |
| student_pro | 500 |
| creator_pro | 1125 |

Single source: `src/lib/billing/credit-cap-defaults.ts` + migration `20260521_scale_foundation.sql`. Override via `credit_configs` row `id = 'default'`.

## Env validation

`instrumentation.ts` runs `validateProductionEnv()` and `runStartupHealthChecks()` at boot.

## Credit security (required migration)

Apply [`supabase/migrations/20260518_credit_security_rls.sql`](../supabase/migrations/20260518_credit_security_rls.sql) and [`20260521_scale_foundation.sql`](../supabase/migrations/20260521_scale_foundation.sql).
