import type { PlanTier } from '@/lib/billing/credits';
import { redis } from '@/lib/redis';

/** Shared monthly cap for free Gen-Fill + Magic Edit image generations (Pollinations). */
export const FREE_GENFILL_MONTHLY_LIMIT = 15;

export function isPaidPlan(plan: PlanTier | string): boolean {
  return (
    plan === 'student_pro' ||
    plan === 'pro' ||
    plan === 'creator_pro' ||
    plan === 'admin'
  );
}

function monthKeyUTC(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function freeGenfillRedisKey(userId: string, month = monthKeyUTC()): string {
  return `free_genfill:${userId}:${month}`;
}

function secondsUntilMonthEndUTC(): number {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return Math.max(3600, Math.ceil((end.getTime() - now.getTime()) / 1000) + 86400);
}

const GENFILL_RESERVE_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local next = redis.call('INCR', key)
if next == 1 then
  redis.call('EXPIRE', key, ttl)
end
if next > limit then
  redis.call('DECR', key)
  return -1
end
return next
`;

export type FreeGenfillStatus = {
  limit: number;
  used: number;
  remaining: number;
};

export async function getFreeGenfillStatus(userId: string): Promise<FreeGenfillStatus> {
  const limit = FREE_GENFILL_MONTHLY_LIMIT;
  if (!redis) {
    return { limit, used: 0, remaining: limit };
  }
  try {
    const raw = await redis.get<number>(freeGenfillRedisKey(userId));
    const used = Math.min(limit, Math.max(0, typeof raw === 'number' ? raw : 0));
    return { limit, used, remaining: Math.max(0, limit - used) };
  } catch (err) {
    console.error('[Redis] getFreeGenfillStatus failed:', err);
    return { limit, used: limit, remaining: 0 };
  }
}

export type ConsumeFreeGenfillResult =
  | { ok: true; used: number; remaining: number }
  | { ok: false; error: 'FREE_LIMIT_REACHED'; used: number; remaining: 0 };

/**
 * Atomically reserves one free Gen-Fill slot (Lua INCR with cap). Call before generation.
 */
export async function consumeFreeGenfillSlot(userId: string): Promise<ConsumeFreeGenfillResult> {
  const limit = FREE_GENFILL_MONTHLY_LIMIT;

  if (!redis) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'FREE_LIMIT_REACHED', used: limit, remaining: 0 };
    }
    return { ok: true, used: 0, remaining: limit };
  }

  try {
    const key = freeGenfillRedisKey(userId);
    const ttl = secondsUntilMonthEndUTC();
    const result = await redis.eval(GENFILL_RESERVE_LUA, [key], [String(limit), String(ttl)]);
    const n = typeof result === 'number' ? result : Number(result);
    if (n === -1) {
      return { ok: false, error: 'FREE_LIMIT_REACHED', used: limit, remaining: 0 };
    }
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, error: 'FREE_LIMIT_REACHED', used: limit, remaining: 0 };
    }
    return { ok: true, used: n, remaining: Math.max(0, limit - n) };
  } catch (err) {
    console.error('[Redis] consumeFreeGenfillSlot failed — failing closed:', err);
    return { ok: false, error: 'FREE_LIMIT_REACHED', used: limit, remaining: 0 };
  }
}
