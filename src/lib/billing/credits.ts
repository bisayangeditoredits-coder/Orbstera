import { redis } from '@/lib/redis';

export type PlanTier = 'free' | 'student_pro' | 'pro' | 'creator_pro' | 'admin';

export type CreditAction =
  | 'deck_small'
  | 'deck_medium'
  | 'deck_large'
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

function normalizePlan(p: unknown): PlanTier {
  const s = String(p || '').toLowerCase();
  if (s === 'creator_pro') return 'creator_pro';
  if (s === 'student_pro') return 'student_pro';
  if (s === 'pro') return 'pro';
  if (s === 'admin') return 'admin';
  return 'free';
}

const DEFAULT_CONFIG: CreditConfig = {
  monthly: {
    free: 100,
    student_pro: 1500,
    pro: 2500,
    creator_pro: 8000,
    admin: 100000,
  },
  costs: {
    deck_small: 40,
    deck_medium: 80,
    deck_large: 150,
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

export async function getCreditSummary(args: { supabase: any; userId: string; planRaw: unknown }): Promise<CreditSummary> {
  const plan = normalizePlan(args.planRaw);
  const config = await getCreditConfig(args.supabase);
  return await readSummaryFromProfile(args.supabase, args.userId, plan, config);
}

type RpcConsumePayload = { ok?: boolean; error?: string; credits_used_month?: number };

function isConsumeRpcUnavailable(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message || (error as { details?: string })?.details || error || '');
  return /consume_credits_atomic|schema cache|Could not find the function|function .* does not exist/i.test(msg);
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
  const plan = normalizePlan(args.planRaw);
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
export async function consumeCreditsAtomic(args: {
  supabase: any;
  userId: string;
  planRaw: unknown;
  cost: number;
  action: CreditAction;
  meta?: Record<string, unknown>;
}): Promise<{ ok: true; summary: CreditSummary } | { ok: false; error: string; summary: CreditSummary }> {
  const plan = normalizePlan(args.planRaw);
  const config = await getCreditConfig(args.supabase);
  const summary = await readSummaryFromProfile(args.supabase, args.userId, plan, config);
  const cost = Math.max(0, Math.round(args.cost || 0));
  if (cost <= 0) return { ok: true, summary };

  const monthlyFromConfig = config.monthly[plan] ?? DEFAULT_CONFIG.monthly[plan];
  const meta = args.meta && typeof args.meta === 'object' ? args.meta : {};

  const { data, error } = await args.supabase.rpc('consume_credits_atomic', {
    p_cost: cost,
    p_plan_default_cap: monthlyFromConfig,
    p_action: args.action,
    p_meta: meta,
  });

  if (error && isConsumeRpcUnavailable(error)) {
    return consumeCreditsLegacy(args);
  }

  if (error) {
    console.error('[credits] consume_credits_atomic RPC error:', error);
    return consumeCreditsLegacy(args);
  }

  const payload = (data ?? {}) as RpcConsumePayload;
  if (payload.ok === true) {
    const next = await readSummaryFromProfile(args.supabase, args.userId, plan, config);
    return { ok: true, summary: next };
  }

  if (payload.error === 'INSUFFICIENT_CREDITS') {
    const refreshed = await readSummaryFromProfile(args.supabase, args.userId, plan, config);
    return { ok: false, error: 'INSUFFICIENT_CREDITS', summary: refreshed };
  }

  console.warn('[credits] consume_credits_atomic unexpected payload:', data);
  return consumeCreditsLegacy(args);
}

export async function ensureCredits(args: {
  supabase: any;
  userId: string;
  planRaw: unknown;
  cost: number;
  action: CreditAction;
  meta?: Record<string, unknown>;
}): Promise<{ ok: true; summary: CreditSummary } | { ok: false; error: 'INSUFFICIENT_CREDITS'; summary: CreditSummary }> {
  const plan = normalizePlan(args.planRaw);
  const config = await getCreditConfig(args.supabase);
  const summary = await readSummaryFromProfile(args.supabase, args.userId, plan, config);

  const cost = Math.max(0, Math.round(args.cost || 0));
  if (cost <= 0) return { ok: true, summary };
  if (summary.remaining < cost) return { ok: false, error: 'INSUFFICIENT_CREDITS', summary };

  const spent = await consumeCreditsAtomic({
    supabase: args.supabase,
    userId: args.userId,
    planRaw: args.planRaw,
    cost,
    action: args.action,
    meta: args.meta,
  });

  if (!spent.ok) {
    if (spent.error === 'INSUFFICIENT_CREDITS') {
      return { ok: false, error: 'INSUFFICIENT_CREDITS', summary: spent.summary };
    }
    return consumeCreditsLegacy(args);
  }

  return { ok: true, summary: spent.summary };
}

