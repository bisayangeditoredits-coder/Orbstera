# Background worker deployment (~30k DAU)

Vercel enqueues jobs; an **always-on** worker host runs AI generation (BullMQ) and PPTX export. Do not run workers on Vercel serverless.

**Also see:** [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md), [SCALING.md](./SCALING.md)

## Architecture

- **Generate:** Vercel → BullMQ queue `generate-deck` via `REDIS_URL` (Upstash **TCP** `rediss://`) → `scripts/run-bullmq-worker.ts`
- **Export:** Vercel → Redis list `queue:export:v1` via **REST** → `scripts/run-export-worker.ts`
- **Job status:** `job:v1:*` keys via Upstash REST (polled at `GET /api/jobs/[id]`)

## 1. Platform recommendation: Railway

| Platform | Best for |
|----------|----------|
| **Railway** | Easiest: GitHub + `Dockerfile.worker` + env paste |
| **Render** | Use `render.yaml` → Background Worker |
| **Fly.io** | Docker experts; more CLI |

Repo includes [`railway.toml`](../railway.toml) and [`Dockerfile.worker`](../Dockerfile.worker).

## 2. Prerequisites (Upstash + Vercel)

### Upstash TCP (`REDIS_URL`)

1. [Upstash Console](https://console.upstash.com) → your Redis database → **Connect**
2. Copy the **`rediss://...`** URL (TCP, not only REST URL/token)
3. Set on **Vercel Production + Preview** and **worker host** as `REDIS_URL`

### Vercel scale flags (Production + Preview)

| Variable | Value |
|----------|--------|
| `GENERATE_WORKER_ENABLED` | `true` |
| `GENERATE_ASYNC_DEFAULT` | `true` |
| `GENERATE_USE_JOB_QUEUE` | `true` |
| `WORKER_INTERNAL_SECRET` | Same long random string on Vercel **and** worker |
| `REDIS_URL` | Same Upstash TCP URL as worker |

Add via dashboard or:

```bash
vercel env add GENERATE_USE_JOB_QUEUE production --value true --yes
vercel env add GENERATE_USE_JOB_QUEUE preview --value true --yes
```

Redeploy Vercel after changing env vars.

## 3. Deploy on Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → `Orbstera`
2. Railway detects [`railway.toml`](../railway.toml) → builds `Dockerfile.worker`
3. **Variables** → paste from [`.env.worker.example`](../.env.worker.example) (fill from Vercel)
4. **Networking** → no public HTTP needed (outbound only)
5. **Deploy** → **Logs** should show:

   ```
   [bullmq-worker] listening on queue generate-deck
   [export-worker] started (concurrency=2)
   ```

### Build / start commands

| Method | Build | Start |
|--------|-------|-------|
| **Docker (recommended)** | `Dockerfile.worker` (`npm ci --omit=dev`) | `npm run worker:generate:bullmq` + `npm run worker:export:inline` |
| **Native** | `npm ci` | `npm run worker:all` |

## 4. Environment variables (copy from Vercel)

### Required on worker

- `NODE_ENV=production`
- `REDIS_URL` — `rediss://...` (TCP)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL` — production app URL
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`
- `NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL` (strongly recommended)
- `GENERATE_WORKER_ENABLED`, `GENERATE_ASYNC_DEFAULT`, `GENERATE_USE_JOB_QUEUE`, `WORKER_INTERNAL_SECRET` (mirror Vercel)

### Recommended tuning

- `GENERATE_WORKER_CONCURRENCY=6`
- `EXPORT_WORKER_CONCURRENCY=2`
- `GENERATE_WORKER_USE_HTTP_CALLBACK=false` (inline; default)

### Not needed on worker

`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DODO_PAYMENTS_*`, `RESEND_*` — Vercel only.

### Validate locally

```bash
cp .env.worker.example .env.worker.local   # fill values
# Or use .env.local with same vars
npm run verify:worker-env
```

## 5. Verify deployment

### Worker logs

See `[bullmq-worker] listening` and `[export-worker] started`.

### Vercel health

```bash
npm run verify:worker-deployment -- https://orbstera.vercel.app
# or
curl -s https://YOUR_APP/api/health | jq
```

Expect: `status: healthy`, `checks.redis: ok`, `checks.worker: queue_on`, `worker.misconfigured: false`.

### End-to-end

1. Generate deck with **≥12 slides** → `POST /api/generate` returns **202** + `jobId` → poll until `completed`
2. Export large deck → **202** + `jobId` → worker logs `[export-worker] completed`

### Failure reference

| Symptom | Fix |
|---------|-----|
| Jobs stuck `queued` | Worker down or `REDIS_URL` mismatch Vercel vs worker |
| `Set REDIS_URL…` in worker logs | Add Upstash TCP URL to worker |
| `Missing UPSTASH_REDIS_REST` | Add REST URL/token to worker |
| `worker.misconfigured` on health | `WORKER_INTERNAL_SECRET` missing on Vercel |

## 6. Scaling

- Start with **1** Railway instance
- If `/api/health` shows `queue_backlog: high`, add a second worker service (same env)
- Increase `GENERATE_WORKER_CONCURRENCY` before adding many instances
