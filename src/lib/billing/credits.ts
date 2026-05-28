import { redis } from '@/lib/redis';
import {
  CREDIT_CAP_MONTHLY,
  CREDIT_USD_PER_CREDIT_DEFAULT,
  PLAN_MAX_AI_SPEND_USD,
} from '@/lib/billing/credit-cap-defaults';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
import {
  adjustCreditFastPathRefund,
  isCreditRedisFastPathEnabled,
  releaseCreditsRedisFastPath,
  reserveCreditsRedisFastPath,
  setCreditFastPathUsed,
  syncCreditFastPathFromProfile,
} from '@/lib/billing/credit-redis';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';

export type PlanTier = 'free' | 'student_pro' | 'pro' | 'creator_pro' | 'admin';

export type CreditAction =
  | 'deck_small'
  | 'deck_medium'
  | 'deck_large'
  | 'deck_polish'
  | 'magic_edit'
  | 'rewrite'
  | 'image_standard'
  | 'image_premium'
  | 'genfill_free'
  | 'genfill_pro'
  | 'genfill_creator'
  | 'animation_enhance'
  | 'recraft_v2_raster'
  | 'recraft_v3_vector';

export type CreditConfig = {
  monthly: Record<PlanTier, number>;
  costs: Record<CreditAction, number>;
  /** Optional: convert credits into a spend estimate for protection. */
  usdPerCredit?: number;
};

export type CreditSummary = {
  plan: PlanTier;
  monthKey: string;
  monthlyLimit: number;
  used: number;
  remaining: number;
  resetAt: string | null;
};

function monthKeyUTC(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function normalizePlanTier(p: unknown): PlanTier {
  const s = String(p || '').toLowerCase();
  if (s === 'creator_pro') return 'creator_pro';
  if (s === 'student_pro') return 'student_pro';
  if (s === 'pro') return 'pro';
  if (s === 'admin') return 'admin';
  return 'free';
}

/**
 * Monthly list price (USD) for paid tiers.
 *
 * Pricing structure (budget-first):
 *   Student Pro  $9/mo  → net ~$8.43 after fees → $4.00 AI budget → $4.43 profit (52%)
 *   Creator Pro  $22/mo → net ~$21.04 after fees → $9.00 AI budget → $12.04 profit (57%)
 *
 * usdPerCredit = $0.008 (calibrated to real GPT-5.5 + FLUX cost per action)
 *   Student Pro credits : $4.00 / $0.008 = 500 cr  → max real AI spend $4.00
 *   Creator Pro credits : $9.00 / $0.008 = 1,125 cr → max real AI spend $9.00
 */
export const PLAN_PRICING_USD: Partial<Record<PlanTier, number>> = {
  student_pro: 9,
  pro: 9,
  creator_pro: 22,
};

export const PLAN_MONTHLY_CREDITS: Record<PlanTier, number> = { ...CREDIT_CAP_MONTHLY };

export const TARGET_MARGIN = 0.55;
export const PAYMENT_FEE_RATE = 0.03;
export const PAYMENT_FEE_FIXED_USD = 0.3;

/** Max monthly credits at target margin: (netRevenue * (1 - margin)) / usdPerCredit */
export function computeMaxCreditsForMargin(args: {
  priceUsd: number;
  usdPerCredit?: number;
  margin?: number;
  feeRate?: number;
  feeFixedUsd?: number;
}): number {
  const usdPerCredit = args.usdPerCredit ?? DEFAULT_CONFIG.usdPerCredit ?? 0.0015;
  const margin = args.margin ?? TARGET_MARGIN;
  const feeRate = args.feeRate ?? PAYMENT_FEE_RATE;
  const feeFixed = args.feeFixedUsd ?? PAYMENT_FEE_FIXED_USD;
  const net = args.priceUsd * (1 - feeRate) - feeFixed;
  if (net <= 0 || usdPerCredit <= 0) return 0;
  return Math.floor((net * (1 - margin)) / usdPerCredit);
}

/** Resolve monthly credit cap for a plan id string (webhooks, sync, RPC defaults). */
export function getPlanMonthlyCredits(planId: unknown, config?: CreditConfig): number {
  const plan = normalizePlanTier(planId);
  const monthly = config?.monthly ?? DEFAULT_CONFIG.monthly;
  return monthly[plan] ?? PLAN_MONTHLY_CREDITS[plan] ?? PLAN_MONTHLY_CREDITS.free;
}

/**
 * Credit action costs — calibrated so that: cost × usdPerCredit ≈ real OpenRouter price.
 * Formula: credits = realCostUSD / usdPerCredit (= realCostUSD / 0.008)
 *
 * Real costs (OpenRouter, May 2026):
 *   deck_small  ~$0.38  (GPT-5.5 compose ~$0.22 + Claude Sonnet structure + coach)  → 48 cr
 *   deck_medium ~$0.65  (GPT-5.5 compose ~$0.42 + structure + coach)                → 82 cr
 *   deck_large  ~$1.80  (GPT-5.5 compose ~$1.20 + Claude Opus polish + images)      → 225 cr
 *   deck_polish ~$0.65  (Claude Sonnet/Opus refine)                                  → 80 cr
 *   magic_edit  ~$0.02  (Claude Sonnet short call)                                   → 2 cr
 *   rewrite     ~$0.008 (Gemini Flash short call)                                    → 1 cr
 *   image_std   ~$0.04  (FLUX 1.1 Pro)                                               → 5 cr
 *   image_prem  ~$0.06  (FLUX Ultra)                                                 → 8 cr
 *   genfill_free ~$0.04 (FLUX 1.1 Pro basic)                                         → 5 cr
 *   genfill_pro  ~$0.06 (FLUX Kontext Pro)                                           → 8 cr
 *   genfill_cre  ~$0.09 (FLUX Kontext Max)                                           → 12 cr
 *   anim_enhance ~$0.016 (Gemini Flash)                                              → 2 cr
 */
const DEFAULT_CONFIG: CreditConfig = {
  monthly: { ...PLAN_MONTHLY_CREDITS },
  costs: {
    deck_small: 48,
    deck_medium: 82,
    deck_large: 225,
    deck_polish: 80,
    magic_edit: 2,
    rewrite: 1,
    image_standard: 5,
    image_premium: 8,
    genfill_free: 5,     // FLUX 1.1 Pro — same cost as image_standard
    genfill_pro: 8,      // FLUX Kontext Pro
    genfill_creator: 12, // FLUX Kontext Max
    animation_enhance: 2,
    recraft_v2_raster: 3,
    recraft_v3_vector: 10,
  },
  // $0.008 per credit = calibrated to real GPT-5.5 / FLUX API costs
  // If a user exhausts ALL credits, your max spend = credits × 0.008:
  //   Free        150 cr × $0.008 = $1.20  (but free models = $0 actual)
  //   Student Pro 500 cr × $0.008 = $4.00  ← guaranteed AI budget cap
  //   Creator Pro 1125 cr × $0.008 = $9.00 ← guaranteed AI budget cap
  usdPerCredit: CREDIT_USD_PER_CREDIT_DEFAULT,
};

async function readRemoteConfig(supabase: any): Promise<Partial<CreditConfig> | null> {
  // Optional: a single-row config table. If it doesn't exist, return null.
  try {
    const { data, error } = await supabase
      .from('credit_configs')
      .select('config')
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data?.config) return null;
    if (typeof data.config !== 'object') return null;
    return data.config as Partial<CreditConfig>;
  } catch {
    return null;
  }
}

export async function getCreditConfig(supabase: any): Promise<CreditConfig> {
  // Prefer redis cache to avoid a DB hit per request.
  const cacheKey = `credits:config:v1`;
  try {
    if (redis) {
      const cached = await redis.get<CreditConfig>(cacheKey);
      if (cached && cached.monthly && cached.costs) return cached;
    }
  } catch {
    /* ignore */
  }

  const remote = await readRemoteConfig(supabase);
  const merged: CreditConfig = {
    monthly: { ...DEFAULT_CONFIG.monthly, ...(remote?.monthly || {}) } as CreditConfig['monthly'],
    costs: { ...DEFAULT_CONFIG.costs, ...(remote?.costs || {}) } as CreditConfig['costs'],
    usdPerCredit: typeof remote?.usdPerCredit === 'number' ? remote.usdPerCredit : DEFAULT_CONFIG.usdPerCredit,
  };

  try {
    if (redis) await redis.set(cacheKey, merged, { ex: 60 });
  } catch {
    /* ignore */
  }
  return merged;
}

export function estimateDeckCreditAction(slideCount: number): CreditAction {
  if (slideCount <= 6) return 'deck_small';
  if (slideCount <= 15) return 'deck_medium';
  return 'deck_large';
}

/** Exact per-action credit cost from config (single source for API charges). */
export function getActionCreditCost(config: CreditConfig, action: CreditAction): number {
  return config.costs[action] ?? DEFAULT_CONFIG.costs[action] ?? 0;
}

/**
 * Flat deck generation charge (images included in deck pipeline — no add-on image credits).
 * 1–6 → 48 | 7–15 → 82 | 16+ → 225
 */
export function getDeckGenerationCreditCost(config: CreditConfig, slideCount: number): number {
  return getActionCreditCost(config, estimateDeckCreditAction(slideCount));
}

export function getGenfillCreditAction(plan: PlanTier): CreditAction {
  if (plan === 'creator_pro' || plan === 'admin') return 'genfill_creator';
  if (plan === 'student_pro' || plan === 'pro') return 'genfill_pro';
  return 'genfill_free';
}

export function getImageCreditAction(plan: PlanTier, premium: boolean): CreditAction {
  if (premium && (plan === 'creator_pro' || plan === 'admin')) return 'image_premium';
  return 'image_standard';
}

/**
 * UI / affordability estimates only — optional add-on image line items.
 * API routes must use getDeckGenerationCreditCost() for actual charges.
 */
export function estimateDeckCostCredits(args: {
  slideCount: number;
  includeImages: boolean;
  premiumImages: boolean;
  estimatedImages?: number;
  config: CreditConfig;
}): number {
  const base = getDeckGenerationCreditCost(args.config, args.slideCount);
  if (!args.includeImages) return base;
  const n = Math.max(0, Math.round(args.estimatedImages ?? Math.min(args.slideCount, 8)));
  const per = args.premiumImages
    ? getActionCreditCost(args.config, 'image_premium')
    : getActionCreditCost(args.config, 'image_standard');
  return base + n * per;
}

/** Never grant more monthly credits than the plan's profit-margin cap. */
export function getEffectiveMonthlyCreditLimit(
  plan: PlanTier,
  config: CreditConfig,
  profileLimit?: number | null,
): number {
  const planCap = config.monthly[plan] ?? PLAN_MONTHLY_CREDITS[plan] ?? 0;
  if (typeof profileLimit !== 'number' || profileLimit <= 0) return planCap;
  return Math.min(profileLimit, planCap);
}

export function creditsToUsd(credits: number, config: CreditConfig): number {
  const rate = config.usdPerCredit ?? CREDIT_USD_PER_CREDIT_DEFAULT;
  return credits * rate;
}

/** Validates remaining credits and monthly USD budget before charging. */
export function validateCreditBudget(args: {
  plan: PlanTier;
  summary: CreditSummary;
  cost: number;
  config: CreditConfig;
}): { ok: true } | { ok: false; error: 'INSUFFICIENT_CREDITS' | 'MONTHLY_BUDGET_EXCEEDED' } {
  const cost = Math.max(0, Math.round(args.cost));
  if (cost <= 0) return { ok: true };

  if (args.summary.remaining < cost) {
    return { ok: false, error: 'INSUFFICIENT_CREDITS' };
  }

  const maxUsd = PLAN_MAX_AI_SPEND_USD[args.plan];
  if (maxUsd > 0 && maxUsd < 999_000) {
    const projectedUsd = creditsToUsd(args.summary.used + cost, args.config);
    if (projectedUsd > maxUsd + 0.0001) {
      return { ok: false, error: 'MONTHLY_BUDGET_EXCEEDED' };
    }
  }

  return { ok: true };
}

async function readSummaryFromProfile(supabase: any, userId: string, plan: PlanTier, config: CreditConfig): Promise<CreditSummary> {
  // Fallback-only: if credits columns don't exist, we still return a usable summary.
  const monthKey = monthKeyUTC();
  const monthlyLimit = getEffectiveMonthlyCreditLimit(plan, config);
  try {
    const { data } = await supabase
      .from('profiles')
      .select('credits_used_month, credits_reset_at, credits_monthly_limit')
      .eq('id', userId)
      .maybeSingle();

    const used = typeof data?.credits_used_month === 'number' ? data.credits_used_month : 0;
    const lim = getEffectiveMonthlyCreditLimit(
      plan,
      config,
      typeof data?.credits_monthly_limit === 'number' ? data.credits_monthly_limit : null,
    );
    const remaining = Math.max(0, lim - used);
    const resetAt = typeof data?.credits_reset_at === 'string' ? data.credits_reset_at : null;
    void syncCreditFastPathFromProfile(userId, monthKey, used);
    return { plan, monthKey, monthlyLimit: lim, used, remaining, resetAt };
  } catch {
    return { plan, monthKey, monthlyLimit, used: 0, remaining: monthlyLimit, resetAt: null };
  }
}

/** @deprecated Prefer getCreditSummaryForUser */
export async function getCreditSummary(args: { supabase: unknown; userId: string; planRaw?: unknown }): Promise<CreditSummary> {
  return getCreditSummaryForUser({ supabase: args.supabase, userId: args.userId });
}

type RpcConsumePayload = { ok?: boolean; error?: string; credits_used_month?: number };

function isConsumeRpcUnavailable(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message || (error as { details?: string })?.details || error || '');
  return /consume_credits_atomic|schema cache|Could not find the function|function .* does not exist/i.test(msg);
}

function allowLegacyCreditFallback(): boolean {
  return true;
}

const BURST_LIMIT_PER_HOUR = 2000;
const BURST_WINDOW_SEC = 3600;

async function enforceCreditBurstLimit(userId: string, cost: number): Promise<boolean> {
  if (!redis || cost <= 0) return true;
  const hourKey = `credits:burst:${userId}:${new Date().toISOString().slice(0, 13)}`;
  try {
    const prev = await redis.get<number>(hourKey);
    const next = (typeof prev === 'number' ? prev : 0) + cost;
    if (next > BURST_LIMIT_PER_HOUR) return false;
    await redis.set(hourKey, next, { ex: BURST_WINDOW_SEC });
    return true;
  } catch {
    return true;
  }
}

type RpcV2Payload = {
  ok?: boolean;
  error?: string;
  duplicate?: boolean;
  credits_used_month?: number;
};

/**
 * Server-only credit consumption (service role RPC). Caller must verify session user === userId.
 */
export async function consumeCreditsForUser(args: {
  userId: string;
  cost: number;
  action: CreditAction;
  meta?: Record<string, unknown>;
  idempotencyKey?: string;
  /** Optional route client for summary reads when service role is unavailable (dev only). */
  supabase?: unknown;
}): Promise<
  | { ok: true; summary: CreditSummary; duplicate?: boolean }
  | { ok: false; error: string; summary: CreditSummary }
> {
  const admin = getServiceSupabase();
  const readClient = admin ?? args.supabase;
  const plan = await getBillingPlan(args.userId);
  const config = readClient ? await getCreditConfig(readClient) : DEFAULT_CONFIG;
  const summary = readClient
    ? await readSummaryFromProfile(readClient, args.userId, plan, config)
    : {
        plan,
        monthKey: monthKeyUTC(),
        monthlyLimit: config.monthly[plan] ?? DEFAULT_CONFIG.monthly[plan],
        used: 0,
        remaining: config.monthly[plan] ?? DEFAULT_CONFIG.monthly[plan],
        resetAt: null,
      };

  const cost = Math.max(0, Math.round(args.cost || 0));
  if (cost <= 0) return { ok: true, summary };

  if (!(await enforceCreditBurstLimit(args.userId, cost))) {
    return { ok: false, error: 'BURST_LIMIT_EXCEEDED', summary };
  }

  const budget = validateCreditBudget({ plan, summary, cost, config });
  if (!budget.ok) {
    return {
      ok: false,
      error: budget.error === 'MONTHLY_BUDGET_EXCEEDED' ? 'INSUFFICIENT_CREDITS' : budget.error,
      summary,
    };
  }

  if (!admin) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'BILLING_UNAVAILABLE', summary };
    }
    if (readClient) {
      return consumeCreditsLegacy({
        supabase: readClient,
        userId: args.userId,
        planRaw: plan,
        cost,
        action: args.action,
        meta: args.meta,
      });
    }
    return { ok: false, error: 'BILLING_UNAVAILABLE', summary };
  }

  const monthKey = summary.monthKey;
  const monthlyLimit = summary.monthlyLimit;
  let redisReserved = false;

  if (isCreditRedisFastPathEnabled()) {
    const fast = await reserveCreditsRedisFastPath({
      userId: args.userId,
      monthKey,
      cost,
      monthlyLimit,
    });
    if (fast?.ok === false) {
      const refreshed = await readSummaryFromProfile(admin, args.userId, plan, config);
      return { ok: false, error: 'INSUFFICIENT_CREDITS', summary: refreshed };
    }
    if (fast?.ok === true) redisReserved = true;
  }

  const meta = args.meta && typeof args.meta === 'object' ? args.meta : {};
  let data: unknown;
  let error: { message?: string } | null = null;

  try {
    const rpc = await admin.rpc('consume_credits_atomic_v2', {
      p_user_id: args.userId,
      p_cost: cost,
      p_action: args.action,
      p_meta: meta,
      p_idempotency_key: args.idempotencyKey ?? null,
    });
    data = rpc.data;
    error = rpc.error;
  } catch (e) {
    if (redisReserved) {
      await releaseCreditsRedisFastPath(args.userId, monthKey, cost);
    }
    throw e;
  }

  if (error) {
    if (redisReserved) {
      await releaseCreditsRedisFastPath(args.userId, monthKey, cost);
    }
    if (allowLegacyCreditFallback()) {
      return consumeCreditsLegacy({
        supabase: admin,
        userId: args.userId,
        planRaw: plan,
        cost,
        action: args.action,
        meta: args.meta,
      });
    }
    console.error('[credits] consume_credits_atomic_v2 error:', error);
    return { ok: false, error: 'BILLING_ERROR', summary };
  }

  const payload = (data ?? {}) as RpcV2Payload;
  if (payload.ok === true) {
    if (payload.duplicate === true && redisReserved) {
      await releaseCreditsRedisFastPath(args.userId, monthKey, cost);
    } else if (typeof payload.credits_used_month === 'number') {
      await setCreditFastPathUsed(args.userId, monthKey, payload.credits_used_month);
    }
    const next = await readSummaryFromProfile(admin, args.userId, plan, config);
    return { ok: true, summary: next, duplicate: payload.duplicate === true };
  }

  if (redisReserved) {
    await releaseCreditsRedisFastPath(args.userId, monthKey, cost);
  }

  if (payload.error === 'INSUFFICIENT_CREDITS') {
    const refreshed = await readSummaryFromProfile(admin, args.userId, plan, config);
    return { ok: false, error: 'INSUFFICIENT_CREDITS', summary: refreshed };
  }

  return { ok: false, error: payload.error || 'CONSUME_FAILED', summary };
}

export async function refundCreditsForUser(args: {
  userId: string;
  cost: number;
  idempotencyKey: string;
  reason?: string;
}): Promise<void> {
  const admin = getServiceSupabase();
  if (!admin) return;
  const cost = Math.max(0, Math.round(args.cost || 0));
  if (cost <= 0) return;

  try {
    const { data } = await admin.rpc('refund_credits_atomic_v2', {
      p_user_id: args.userId,
      p_cost: cost,
      p_idempotency_key: args.idempotencyKey,
      p_reason: args.reason ?? 'refund',
    });
    const payload = (data ?? {}) as { ok?: boolean; credits_used_month?: number };
    if (payload.ok && typeof payload.credits_used_month === 'number') {
      const monthKey = monthKeyUTC();
      await setCreditFastPathUsed(args.userId, monthKey, payload.credits_used_month);
    } else if (isCreditRedisFastPathEnabled()) {
      await adjustCreditFastPathRefund(args.userId, monthKeyUTC(), cost);
    }
  } catch (e) {
    console.error('[credits] refund failed:', e);
  }
}

/** Legacy path when DB migration `consume_credits_atomic` is not applied yet. */
async function consumeCreditsLegacy(args: {
  supabase: any;
  userId: string;
  planRaw: unknown;
  cost: number;
  action: CreditAction;
  meta?: Record<string, unknown>;
}): Promise<{ ok: true; summary: CreditSummary } | { ok: false; error: 'INSUFFICIENT_CREDITS'; summary: CreditSummary }> {
  const plan = normalizePlanTier(args.planRaw);
  const config = await getCreditConfig(args.supabase);
  const summary = await readSummaryFromProfile(args.supabase, args.userId, plan, config);
  const cost = Math.max(0, Math.round(args.cost || 0));
  if (cost <= 0) return { ok: true, summary };

  const budget = validateCreditBudget({ plan, summary, cost, config });
  if (!budget.ok) {
    return { ok: false, error: 'INSUFFICIENT_CREDITS', summary };
  }

  try {
    await args.supabase
      .from('profiles')
      .update({ credits_used_month: summary.used + cost })
      .eq('id', args.userId);
  } catch {
    /* ignore */
  }

  try {
    await args.supabase.from('credit_ledger').insert({
      user_id: args.userId,
      delta: -cost,
      reason: args.action,
      meta: args.meta && typeof args.meta === 'object' ? args.meta : {},
    });
  } catch {
    /* ignore */
  }

  const nextUsed = summary.used + cost;
  const nextRemaining = Math.max(0, summary.monthlyLimit - nextUsed);
  return {
    ok: true,
    summary: { ...summary, used: nextUsed, remaining: nextRemaining },
  };
}

/**
 * Atomically increments `credits_used_month` only if within cap (DB + plan default).
 * Requires Supabase migration `consume_credits_atomic` (see supabase/migrations).
 */
/** @deprecated Use consumeCreditsForUser — kept for callers migrating off user JWT RPC. */
export async function consumeCreditsAtomic(args: {
  supabase: unknown;
  userId: string;
  planRaw: unknown;
  cost: number;
  action: CreditAction;
  meta?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<{ ok: true; summary: CreditSummary } | { ok: false; error: string; summary: CreditSummary }> {
  return consumeCreditsForUser({
    userId: args.userId,
    cost: args.cost,
    action: args.action,
    meta: args.meta,
    idempotencyKey: args.idempotencyKey,
    supabase: args.supabase,
  });
}

/**
 * Deduct credits atomically before running AI (returns 402 path via caller).
 * This is the canonical pre-job billing gate for API routes.
 */
export async function chargeCreditsBeforeJob(args: {
  supabase: unknown;
  userId: string;
  action: CreditAction;
  /** Omit to use config.costs[action] */
  cost?: number;
  meta?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; summary: CreditSummary; cost: number }
  | { ok: false; error: 'INSUFFICIENT_CREDITS' | string; summary: CreditSummary; cost: number }
> {
  const config = await getCreditConfig(args.supabase);
  const cost = Math.max(0, Math.round(args.cost ?? getActionCreditCost(config, args.action)));

  const spent = await consumeCreditsForUser({
    userId: args.userId,
    cost,
    action: args.action,
    meta: args.meta,
    idempotencyKey: args.idempotencyKey,
    supabase: args.supabase,
  });

  if (!spent.ok) {
    return {
      ok: false,
      error: spent.error === 'INSUFFICIENT_CREDITS' ? 'INSUFFICIENT_CREDITS' : spent.error,
      summary: spent.summary,
      cost,
    };
  }

  return { ok: true, summary: spent.summary, cost };
}

/** @deprecated Prefer chargeCreditsBeforeJob — same behavior (deducts before AI). */
export async function ensureCredits(args: {
  supabase: unknown;
  userId: string;
  planRaw?: unknown;
  cost: number;
  action: CreditAction;
  meta?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; summary: CreditSummary }
  | { ok: false; error: 'INSUFFICIENT_CREDITS' | string; summary: CreditSummary }
> {
  const result = await chargeCreditsBeforeJob({
    supabase: args.supabase,
    userId: args.userId,
    action: args.action,
    cost: args.cost,
    meta: args.meta,
    idempotencyKey: args.idempotencyKey,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      summary: result.summary,
    };
  }

  return { ok: true, summary: result.summary };
}

export async function getCreditSummaryForUser(args: {
  supabase: unknown;
  userId: string;
}): Promise<CreditSummary> {
  const plan = await getBillingPlan(args.userId);
  const config = await getCreditConfig(args.supabase);
  return readSummaryFromProfile(args.supabase, args.userId, plan, config);
}

