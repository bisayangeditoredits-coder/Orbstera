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
  const raw = await redis.get<number>(freeGenfillRedisKey(userId));
  const used = Math.min(limit, Math.max(0, typeof raw === 'number' ? raw : 0));
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export type ConsumeFreeGenfillResult =
  | { ok: true; used: number; remaining: number }
  | { ok: false; error: 'FREE_LIMIT_REACHED'; used: number; remaining: 0 };

/**
 * Atomically reserves one free Gen-Fill slot (INCR with cap). Call before generation.
 */
export async function consumeFreeGenfillSlot(userId: string): Promise<ConsumeFreeGenfillResult> {
  const limit = FREE_GENFILL_MONTHLY_LIMIT;

  if (!redis) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'FREE_LIMIT_REACHED', used: limit, remaining: 0 };
    }
    return { ok: true, used: 0, remaining: limit };
  }

  const key = freeGenfillRedisKey(userId);
  const next = await redis.incr(key);
  if (next === 1) {
    await redis.expire(key, secondsUntilMonthEndUTC());
  }
  if (next > limit) {
    await redis.decr(key);
    return { ok: false, error: 'FREE_LIMIT_REACHED', used: limit, remaining: 0 };
  }
  return { ok: true, used: next, remaining: Math.max(0, limit - next) };
}
