# Scalability guide (Orbstera / pptmaker)

## Production requirements

| Service | Purpose |
|---------|---------|
| **Upstash Redis** | Rate limits, AI cache, credit config cache, job metadata, generate queue |
| **Supabase** | Auth, profiles, credits, ledger |
| **Cloudflare R2** | Deck JSON + per-user `index.json` / `index.meta.json` |
| **Vercel (or Node host)** | Next.js App Router API routes |

In production, AI routes **fail closed** if `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are missing.

## Async deck generation (optional)

1. Set `GENERATE_USE_JOB_QUEUE=true` on the app.
2. `POST /api/generate` returns **202** with `{ jobId, status: "queued" }`.
3. Run a worker that polls Redis:

```bash
node scripts/process-generate-jobs.mjs
```

The worker claims jobs from `queue:generate:v1`, runs generation logic, and updates `job:v1:{id}` for client polling via `GET /api/jobs/[id]` (authenticated, owner-only).

## R2 index concurrency

Per-user deck lists use:

- `presentations/{userId}/index.json` — deck metadata array
- `presentations/{userId}/index.meta.json` — `{ "version": N }` for optimistic locking

Saves retry on version conflict (multi-tab / multi-instance safe).

## Credit caps (defaults)

| Plan | Monthly credits |
|------|-----------------|
| free | 100 |
| student_pro | 1,400 |
| creator_pro | 5,500 |

Override without redeploy via `credit_configs` row `id = 'default'`.

## Env validation

`instrumentation.ts` logs missing production env vars at boot. See `.env.example`.

## Credit security (required migration)

Apply [`supabase/migrations/20260518_credit_security_rls.sql`](../supabase/migrations/20260518_credit_security_rls.sql):

- RLS on `profiles`, `credit_ledger`, `credit_configs`
- `consume_credits_atomic_v2` — **service_role only**; caps/costs validated in SQL
- Billing columns on `profiles` cannot be edited by end users (trigger + RLS)
- API routes use `consumeCreditsForUser` (server role), not client JWT RPC

Deck generation charges credits **before** OpenRouter runs; failed streams refund via `refund_credits_atomic_v2`.
