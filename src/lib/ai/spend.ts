import { redis } from '@/lib/redis';

function monthKeyUTC(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export type SpendState = {
  monthKey: string;
  estimatedUsd: number;
  forcedEconomyMode: boolean;
};

export async function getSpendState(args: {
  supabase: any;
  forcedEconomyUsdThreshold?: number;
}): Promise<SpendState> {
  const monthKey = monthKeyUTC();
  const threshold = Math.max(0, Number(args.forcedEconomyUsdThreshold ?? process.env.AI_SPEND_ECONOMY_THRESHOLD_USD ?? 0));

  let estimatedUsd = 0;

  // Prefer redis for cheap reads.
  const cacheKey = `ai:spend:${monthKey}:usd`;
  if (redis) {
    try {
      const v = await redis.get<number>(cacheKey);
      if (typeof v === 'number' && Number.isFinite(v)) estimatedUsd = v;
    } catch {
      /* ignore */
    }
  }

  // If not in cache, try DB (optional table).
  if (!estimatedUsd) {
    try {
      const { data } = await args.supabase
        .from('ai_spend_monthly')
        .select('estimated_usd')
        .eq('month_key', monthKey)
        .maybeSingle();
      if (typeof data?.estimated_usd === 'number') estimatedUsd = data.estimated_usd;
    } catch {
      /* ignore */
    }
  }

  const forcedEconomyMode = threshold > 0 && estimatedUsd >= threshold;
  return { monthKey, estimatedUsd, forcedEconomyMode };
}

export async function addEstimatedSpend(args: {
  supabase: any;
  usdDelta: number;
}): Promise<void> {
  const monthKey = monthKeyUTC();
  const delta = Number(args.usdDelta || 0);
  if (!Number.isFinite(delta) || delta <= 0) return;

  const cacheKey = `ai:spend:${monthKey}:usd`;
  let next = 0;
  if (redis) {
    try {
      const prev = await redis.get<number>(cacheKey);
      const prevNum = typeof prev === 'number' && Number.isFinite(prev) ? prev : 0;
      next = prevNum + delta;
      await redis.set(cacheKey, next, { ex: 120 });
    } catch {
      /* ignore */
    }
  }

  // Best-effort DB update (table optional)
  try {
    const prevRow = await args.supabase
      .from('ai_spend_monthly')
      .select('estimated_usd')
      .eq('month_key', monthKey)
      .maybeSingle();
    const prev = typeof prevRow?.data?.estimated_usd === 'number' ? prevRow.data.estimated_usd : 0;
    await args.supabase.from('ai_spend_monthly').upsert({
      month_key: monthKey,
      estimated_usd: prev + delta,
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}

