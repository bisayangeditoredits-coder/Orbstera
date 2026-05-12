import type { SupabaseClient } from '@supabase/supabase-js';
import {
  BillingPlan,
  FREE_LIFETIME_DECK_CAP,
  monthlyCreditAllowance,
  normalizeBillingPlan,
} from '@/lib/billing/credits-policy';

export type AiWalletPayload = {
  plan: BillingPlan;
  allowance: number;
  usedThisPeriod: number;
  remaining: number;
  cycleKey: string;
  freeLifetimeDecksCreated: number;
  freeLifetimeDecksRemaining: number;
  economyMode: boolean;
};

export type ProfileCreditsRow = {
  plan?: string | null;
  generations_used?: number | null;
  monthly_ai_credits_used?: number | null;
  credits_cycle_key?: string | null;
};

export function utcYearMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function isAiEconomyMode(): boolean {
  const v = (process.env.ORBSTERA_AI_ECONOMY_MODE || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Effective credits used within the active UTC calendar month bucket. */
export function effectiveMonthlyCreditsUsed(row: ProfileCreditsRow | null | undefined): {
  used: number;
  cycleKey: string;
} {
  const cycleKey = utcYearMonth();
  if (!row || !row.credits_cycle_key || row.credits_cycle_key !== cycleKey) {
    return { used: 0, cycleKey };
  }
  return { used: Math.max(0, Number(row.monthly_ai_credits_used) || 0), cycleKey };
}

export function buildAiWalletFromRow(
  row: ProfileCreditsRow | null | undefined,
  planRaw: string | undefined | null,
): AiWalletPayload {
  const plan = normalizeBillingPlan(planRaw ?? row?.plan);
  const allowance = monthlyCreditAllowance(plan);
  const { used, cycleKey } = effectiveMonthlyCreditsUsed(row);
  const remaining = Math.max(0, allowance - used);
  const freeCreated = Math.max(0, Number(row?.generations_used) || 0);
  return {
    plan,
    allowance,
    usedThisPeriod: used,
    remaining,
    cycleKey,
    freeLifetimeDecksCreated: freeCreated,
    freeLifetimeDecksRemaining: Math.max(0, FREE_LIFETIME_DECK_CAP - freeCreated),
    economyMode: isAiEconomyMode(),
  };
}

export type ConsumeResult =
  | { ok: true; remaining: number; allowance: number }
  | {
      ok: false;
      code: 'INSUFFICIENT_CREDITS' | 'PROFILE_ERROR' | 'CONFIG_ERROR';
      remaining: number;
      allowance: number;
      required: number;
      detail?: string;
    };

export async function consumeAiCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  planHint?: string | null,
): Promise<ConsumeResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      code: 'CONFIG_ERROR',
      remaining: 0,
      allowance: 0,
      required: amount,
      detail: 'invalid_amount',
    };
  }

  const { data: row, error: readErr } = await supabase
    .from('profiles')
    .select('plan, monthly_ai_credits_used, credits_cycle_key')
    .eq('id', userId)
    .maybeSingle();

  if (readErr) {
    const msg = readErr.message || '';
    if (/column|does not exist/i.test(msg)) {
      return {
        ok: false,
        code: 'CONFIG_ERROR',
        remaining: 0,
        allowance: 0,
        required: amount,
        detail: 'profiles_missing_credit_columns_run_scripts_supabase_ai_credits_sql',
      };
    }
    return {
      ok: false,
      code: 'PROFILE_ERROR',
      remaining: 0,
      allowance: 0,
      required: amount,
      detail: msg,
    };
  }

  const plan = normalizeBillingPlan(planHint ?? row?.plan);
  const allowance = monthlyCreditAllowance(plan);
  const cycleKey = utcYearMonth();
  const baselineUsed = row?.credits_cycle_key === cycleKey ? Math.max(0, Number(row.monthly_ai_credits_used) || 0) : 0;

  if (baselineUsed + amount > allowance) {
    return {
      ok: false,
      code: 'INSUFFICIENT_CREDITS',
      remaining: Math.max(0, allowance - baselineUsed),
      allowance,
      required: amount,
    };
  }

  const newUsed = baselineUsed + amount;
  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      monthly_ai_credits_used: newUsed,
      credits_cycle_key: cycleKey,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updErr) {
    const msg = updErr.message || '';
    if (/column|does not exist/i.test(msg)) {
      return {
        ok: false,
        code: 'CONFIG_ERROR',
        remaining: 0,
        allowance: 0,
        required: amount,
        detail: 'profiles_missing_credit_columns_run_scripts_supabase_ai_credits_sql',
      };
    }
    return {
      ok: false,
      code: 'PROFILE_ERROR',
      remaining: Math.max(0, allowance - baselineUsed),
      allowance,
      required: amount,
      detail: msg,
    };
  }

  return { ok: true, remaining: allowance - newUsed, allowance };
}

export async function refundAiCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const { data: row } = await supabase
    .from('profiles')
    .select('monthly_ai_credits_used, credits_cycle_key')
    .eq('id', userId)
    .maybeSingle();
  const cycleKey = utcYearMonth();
  const baselineUsed =
    row?.credits_cycle_key === cycleKey ? Math.max(0, Number(row.monthly_ai_credits_used) || 0) : 0;
  const newUsed = Math.max(0, baselineUsed - amount);
  const { error } = await supabase
    .from('profiles')
    .update({
      monthly_ai_credits_used: newUsed,
      credits_cycle_key: cycleKey,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) console.warn('[Credits] refund update failed:', error.message);
}


export async function bumpFreeLifetimeDeckCount(
  supabase: SupabaseClient,
  userId: string,
  plan: BillingPlan,
): Promise<void> {
  if (plan !== 'free') return;
  const { data: row } = await supabase.from('profiles').select('generations_used').eq('id', userId).maybeSingle();
  const prev = Math.max(0, Number(row?.generations_used) || 0);
  const { error } = await supabase
    .from('profiles')
    .update({ generations_used: prev + 1, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) console.warn('[Credits] bump free lifetime deck counter failed:', error.message);
}

