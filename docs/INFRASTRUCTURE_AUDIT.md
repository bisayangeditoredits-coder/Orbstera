# Orbstera Infrastructure & Scalability Audit

**Target:** 500,000+ concurrent active users globally  
**Scope:** Scalability, reliability, cost efficiency — no UI/UX/branding changes unless required for performance  
**Date:** May 2026

---

## Executive summary

Orbstera is a **Next.js 14 App Router monolith** on Vercel with **Supabase** (auth/billing), **Cloudflare R2** (deck storage), **Upstash Redis** (rate limits, caches, job metadata), and **OpenRouter** (AI). Optional **Docker workers** handle async deck generation and PPTX export.

The codebase already includes production-minded patterns: fail-closed rate limits, atomic credit RPCs, async job queues (BullMQ + legacy list), R2 optimistic locking, and structured health checks. **At 500K concurrent users, the current default architecture (sync SSE generation on serverless, single-region Redis/Supabase, no dedicated AI fleet) will not hold** without the production topology described in §6.

This audit lists bottlenecks, failure modes, required upgrades, and what was improved in-repo during this pass.

---

## 1. Current scalability bottlenecks

| # | Bottleneck | Severity | Impact at scale |
|---|------------|----------|-----------------|
| 1 | **Default deck generation = long-lived SSE on Vercel** (up to 300s) | Critical | Function concurrency exhaustion, cold starts, timeouts, high $/generation |
| 2 | **Upstash REST for every rate-limit + cache op** | High | Added latency vs TCP Redis; plan throughput limits |
| 3 | **Supabase `profiles` row lock on credit consume** | High | Hot-row contention for power users; connection pool limits |
| 4 | **Job polling** (`GET /api/jobs/[id]` every 1.5–8s) | Medium | Read amplification with millions of active jobs |
| 5 | **Export worker re-enters serverless** (`/api/export/pptx`, 120s cap) | High | Large/image decks timeout; no dedicated export compute |
| 6 | **Dual queue systems** (BullMQ TCP vs Upstash list) | Medium | Ops complexity, split metrics |
| 7 | **R2 `index.json` optimistic locking** | Medium | Save conflicts under concurrent tabs/devices |
| 8 | **Editor sidebar renders all slide thumbnails** | Medium | Client memory/CPU for 50+ slide decks |
| 9 | **Per-request Supabase client creation** | Low–Medium | Extra latency at high API QPS |
| 10 | **Rate limits only on AI + selected API routes** (expanded this audit) | Medium | Abuse on webhooks/contact unless edge rules added |
| 11 | **Shallow health until this audit** | Medium | False “healthy” during Supabase/R2 outages |

---

## 2. High-risk architecture weaknesses

1. **Serverless as AI compute plane** — Multi-step orchestration + streaming compose competes with HTTP request limits; Gamma/Beautiful.ai-class products use dedicated worker pools.
2. **Single Redis namespace** — Rate limits, caches, job metadata, and legacy queues share one Upstash instance; no regional failover.
3. **No Postgres connection pooler in repo** — Direct Supabase connections from many serverless instances risk pool exhaustion.
4. **Worker misconfiguration** — `GENERATE_ASYNC_*` without `GENERATE_WORKER_ENABLED` → 202 jobs never complete (now surfaced in `/api/health`).
5. **`ai_spend_monthly` RLS without policies** — Blocked all access including mistaken client writes; fixed in migration `20260522_scale_ops.sql`.
6. **No WebSocket push for jobs** — Acceptable at moderate scale; at 500K, polling cost dominates unless SSE/WebSocket job channels or edge push added.
7. **Electron = cloud shell** — Scales with web; no offline/local compute relief.

---

## 3. Systems that will fail at ~500K concurrent users

| System | Failure mode |
|--------|----------------|
| Vercel functions (sync generate) | Concurrency caps, 300s timeouts, cost explosion |
| Upstash REST (single region) | Throughput / latency SLO breach |
| Supabase primary | Connection limit, write latency on `profiles` / ledger |
| OpenRouter | Provider rate limits; need multi-key, regional routing, queue backpressure |
| R2 index (unsharded) | Conflict storms for users with 500+ decks |
| Default export path | 120s serverless timeout on image-heavy PPTX |
| Client editor (large decks) | Main-thread jank from Konva + non-virtualized thumbnails |

---

## 4. Required infrastructure upgrades

### Phase A — Stabilize current stack (0–3 months)

- [ ] Enable **async deck generation** everywhere in production: `GENERATE_WORKER_ENABLED=true`, `GENERATE_ASYNC_DEFAULT=true`, BullMQ `REDIS_URL`, `WORKER_INTERNAL_SECRET`, scale workers (`GENERATE_WORKER_CONCURRENCY` 8–32 per pool).
- [ ] Deploy **export workers** (`npm run worker:export`); lower async threshold via `EXPORT_ASYNC_SLIDE_THRESHOLD=12` (default after this audit).
- [ ] **Supabase Supavisor** (pooler) + Pro/Team plan with read replica for analytics.
- [ ] Apply all migrations including `20260522_scale_ops.sql`.
- [ ] **Cloudflare** in front of app + R2 public assets: WAF, bot fight, rate limits at edge for `/api/*`.
- [ ] **Sentry** + log drain (Axiom/Datadog) with RED metrics on `/api/health`, queue depth, OpenRouter errors.
- [ ] Run load tests beyond `scripts/load-test/generate-smoke.mjs` (k6/Locust: generate, save, export, poll).

### Phase B — Scale plane separation (3–9 months)

- [ ] **Dedicated AI worker fleet** (Fly.io / ECS / K8s): orchestration + compose + image gen; Vercel only for auth, billing, CRUD.
- [ ] **Regional Redis** (Upstash Global / ElastiCache) + sticky routing or global queue with idempotency.
- [ ] **Export service** — Node container with pptxgenjs, no serverless re-entry; object storage output.
- [ ] **CDN** for marketing (`ISR`/`static`) and immutable R2 assets (`Cache-Control: public, max-age=31536000, immutable`).
- [ ] **PgBouncer** + partition `credit_ledger` by month if ledger rows > 100M.

### Phase C — 500K+ concurrent (9–18 months)

- [ ] Multi-region active-active (EU + US + APAC) with geo-DNS and replicated R2 or origin per region.
- [ ] **Message bus** (SQS/NATS/Kafka) replacing Redis lists for job durability.
- [ ] **Smart AI router** — cost/latency model selection, dedup cache, circuit breakers per model.
- [ ] Optional **collaboration** layer (WebSocket/CRDT) only if product requires it — not in current codebase.

---

## 5. Recommended production architecture

```
                    ┌─────────────────────────────────────┐
                    │ Cloudflare (WAF, CDN, Rate Limit)   │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   Vercel Edge (Next.js)      R2 Public CDN              Dodo Webhooks
   - Auth/session             - Deck assets               - Billing events
   - CRUD APIs                 - Export downloads
   - Job enqueue (202)
   - Health / metrics
          │
          ├──────────────► Supabase (Auth + Postgres + Pooler)
          │
          ├──────────────► Upstash Redis (rate limit, cache, job meta)
          │
          └──────────────► Worker Fleet (Docker/K8s)
                           ├─ BullMQ consumers (generate)
                           ├─ Export workers (pptx)
                           └─ Internal callback → batch compose
                                    │
                                    ▼
                              OpenRouter (+ fallbacks)
```

**Similar to Canva/Gamma:** heavy work off serverless; edge for static; object storage for user content; Postgres for accounts/billing only.

---

## 6. Cost-efficient scaling improvements

| Lever | Action |
|-------|--------|
| Async-by-default | Avoid 300s Vercel GB-seconds per deck |
| `AI_SPEND_ECONOMY_THRESHOLD_USD` | Force economy models when monthly spend high |
| Per-plan OpenRouter keys | Isolate blast radius and negotiate volume |
| Orchestration Redis cache | Already in `src/lib/ai/cache.ts` — tune TTLs |
| Image pipeline | Prefer R2 URLs over inline base64 in saves |
| `GENERATE_ASYNC_SLIDE_THRESHOLD` | Queue only decks ≥12 slides (default) |
| Export async ≥12 slides | Reduces blocking export invocations |
| Poll backoff | Exponential backoff in `poll-job.ts` (implemented) |
| R2 index sharding | `R2_INDEX_SHARD_SIZE=200` for power users |

---

## 7. Enterprise-grade optimization opportunities

- **SLA monitoring:** synthetic probes on generate, save, export, health; PagerDuty on `queue_backlog: high`.
- **Idempotency everywhere:** extend idempotency keys to export and image gen.
- **Zero-downtime deploys:** blue/green workers; drain queues before deploy.
- **Abuse prevention:** Cloudflare Bot Management + stricter IP limits on auth endpoints.
- **SOC2 path:** audit log stream for admin/credit mutations; secrets in Vercel/CF secrets manager.
- **DR:** R2 cross-region replication; Supabase PITR; Redis persistence tier.

---

## 8. Implemented in this audit (code changes)

| Change | Location |
|--------|----------|
| Deep health: Supabase ping, R2 HeadBucket, worker misconfig detection | `src/lib/health/deep-checks.ts`, `src/app/api/health/route.ts` |
| API rate limit tier (read/write) for presentations & uploads | `src/lib/rate-limit-server.ts`, `require-api-route.ts` |
| Auto-async generate for large decks when workers enabled | `shouldPreferAsyncGenerate`, `generate/route.ts` |
| Export async threshold 12 (env `EXPORT_ASYNC_SLIDE_THRESHOLD`) | `export/pptx/route.ts` |
| Planner `maxDuration` 120s | `planner/chat/route.ts` |
| Job poll exponential backoff | `src/lib/client/poll-job.ts` |
| Queue metrics: export depth + worker diagnostics | `src/lib/jobs/queue-metrics.ts` |
| DB: `ai_spend_monthly` deny authenticated; chat message index | `20260522_scale_ops.sql` |

---

## 9. Area-by-area checklist

### Frontend
- [x] Dynamic imports for editor chunks
- [x] `optimizePackageImports` for lucide
- [ ] Bundle analyzer in CI
- [ ] Virtualize slide sidebar (24+ slides) — `VirtualColumn` exists, integrate when safe with motion
- [ ] Remove unused `fabric` dependency
- [ ] Sentry webpack plugin in `next.config.js`

### Backend
- [x] AI rate limits fail-closed
- [x] API rate limits on storage routes (this audit)
- [x] Async queue + workers documented
- [ ] Dedicated export service (no serverless callback)
- [ ] Global API rate limit at Cloudflare

### Database
- [x] Credit atomic RPC + idempotency index
- [x] Planner/ledger indexes
- [ ] Supavisor connection string in production
- [ ] Read replica for reporting

### AI
- [x] Model fallback chains
- [x] Spend tracking + economy mode
- [ ] Request deduplication layer
- [ ] Centralized retry with jitter (orchestration currently soft-fails to `''`)

### Caching & infra
- [x] Redis for config/spend/jobs
- [ ] Edge cache for marketing pages
- [ ] Multi-region doc → implement `src/lib/infra/multi-region.ts` routing

### Reliability
- [x] Health endpoint enhanced
- [x] Startup checks in `instrumentation.ts`
- [ ] Runbooks for queue backlog / OpenRouter outage
- [ ] Automated rollback on health 503 spike

---

## 10. Production env checklist

See `.env.example` and `docs/SCALING.md`. Minimum production:

```bash
GENERATE_WORKER_ENABLED=true
GENERATE_ASYNC_DEFAULT=true
REDIS_URL=rediss://...
WORKER_INTERNAL_SECRET=<long-random>
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
# Optional tuning
GENERATE_ASYNC_SLIDE_THRESHOLD=12
EXPORT_ASYNC_SLIDE_THRESHOLD=12
GENERATE_WORKER_CONCURRENCY=8
R2_INDEX_SHARD_SIZE=200
AI_SPEND_ECONOMY_THRESHOLD_USD=500
```

---

## 11. Load & verification

```bash
npm run load-test:health
# Deploy workers, then:
GENERATE_WORKER_ENABLED=true npm run worker:generate:bullmq
npm run worker:export
curl -s https://your-app/api/health | jq
```

Monitor: `queue.legacyListDepth`, `queue.bullmqWaiting`, `queue.exportQueueDepth`, `worker.misconfigured`, `checks.supabase`, `checks.r2`.

---

*For day-to-day operations, see [SCALING.md](./SCALING.md).*
