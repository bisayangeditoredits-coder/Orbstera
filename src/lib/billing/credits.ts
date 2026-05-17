import { redis } from '@/lib/redis';
import { getBillingPlan } from '@/lib/billing/resolve-plan';
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
  | 'animation_enhance';

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

/** Monthly list price (USD) for paid tiers. */
export const PLAN_PRICING_USD: Partial<Record<PlanTier, number>> = {
  student_pro: 5,
  pro: 5,
  creator_pro: 19,
};

/** Default monthly credit caps (profit-aligned; overridable via credit_configs). */
export const PLAN_MONTHLY_CREDITS: Record<PlanTier, number> = {
  free: 100,
  student_pro: 1400,
  pro: 2500,
  creator_pro: 5500,
  admin: 100000,
};

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

const DEFAULT_CONFIG: CreditConfig = {
  monthly: { ...PLAN_MONTHLY_CREDITS },
  costs: {
    deck_small: 40,
    deck_medium: 80,
    deck_large: 150,
    deck_polish: 80,
    magic_edit: 5,
    rewrite: 3,
    image_standard: 10,
    image_premium: 20,
    animation_enhance: 5,
  },
  usdPerCredit: 0.0015,
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

export function estimateDeckCostCredits(args: {
  slideCount: number;
  includeImages: boolean;
  premiumImages: boolean;
  estimatedImages?: number;
  config: CreditConfig;
}): number {
  const base = args.config.costs[estimateDeckCreditAction(args.slideCount)] ?? 80;
  if (!args.includeImages) return base;
  const n = Math.max(0, Math.round(args.estimatedImages ?? Math.min(args.slideCount, 8)));
  const per = args.premiumImages ? args.config.costs.image_premium : args.config.costs.image_standard;
  return base + n * (per ?? 10);
}

async function readSummaryFromProfile(supabase: any, userId: string, plan: PlanTier, config: CreditConfig): Promise<CreditSummary> {
  // Fallback-only: if credits columns don't exist, we still return a usable summary.
  const monthKey = monthKeyUTC();
  const monthlyLimit = config.monthly[plan] ?? DEFAULT_CONFIG.monthly[plan];
  try {
    const { data } = await supabase
      .from('profiles')
      .select('credits_used_month, credits_reset_at, credits_monthly_limit')
      .eq('id', userId)
      .maybeSingle();

    const used = typeof data?.credits_used_month === 'number' ? data.credits_used_month : 0;
    const lim = typeof data?.credits_monthly_limit === 'number' ? data.credits_monthly_limit : monthlyLimit;
    const remaining = Math.max(0, lim - used);
    const resetAt = typeof data?.credits_reset_at === 'string' ? data.credits_reset_at : null;
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
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.ALLOW_CREDIT_LEGACY_FALLBACK === 'true'
  );
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

  if (summary.remaining < cost) {
    return { ok: false, error: 'INSUFFICIENT_CREDITS', summary };
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

  const meta = args.meta && typeof args.meta === 'object' ? args.meta : {};
  const { data, error } = await admin.rpc('consume_credits_atomic_v2', {
    p_user_id: args.userId,
    p_cost: cost,
    p_action: args.action,
    p_meta: meta,
    p_idempotency_key: args.idempotencyKey ?? null,
  });

  if (error) {
    if (isConsumeRpcUnavailable(error) && allowLegacyCreditFallback()) {
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
    const next = await readSummaryFromProfile(admin, args.userId, plan, config);
    return { ok: true, summary: next, duplicate: payload.duplicate === true };
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
    await admin.rpc('refund_credits_atomic_v2', {
      p_user_id: args.userId,
      p_cost: cost,
      p_idempotency_key: args.idempotencyKey,
      p_reason: args.reason ?? 'refund',
    });
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
  if (summary.remaining < cost) return { ok: false, error: 'INSUFFICIENT_CREDITS', summary };

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
  const spent = await consumeCreditsForUser({
    userId: args.userId,
    cost: args.cost,
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
    };
  }

  return { ok: true, summary: spent.summary };
}

export async function getCreditSummaryForUser(args: {
  supabase: unknown;
  userId: string;
}): Promise<CreditSummary> {
  const plan = await getBillingPlan(args.userId);
  const config = await getCreditConfig(args.supabase);
  return readSummaryFromProfile(args.supabase, args.userId, plan, config);
}

