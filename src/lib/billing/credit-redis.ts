import { redis } from '@/lib/redis';

const FAST_PATH_ENABLED = process.env.CREDITS_REDIS_FAST_PATH !== 'false';
const MONTH_TTL_SEC = 35 * 24 * 3600;
function fastUsedKey(userId: string, monthKey: string): string {
  return `credits:fast:${userId}:${monthKey}`;
}

/**
 * Atomic reserve: INCRBY only if used + cost <= limit.
 * Returns new used total, -1 if insufficient, null if Redis unavailable/disabled.
 */
const RESERVE_LUA = `
local key = KEYS[1]
local cost = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local used = tonumber(redis.call('GET', key) or '0')
if used + cost > limit then
  return -1
end
return redis.call('INCRBY', key, cost)
`;

export function isCreditRedisFastPathEnabled(): boolean {
  return Boolean(redis && FAST_PATH_ENABLED);
}

/** Seed Redis counter from Postgres (take max to avoid under-counting). */
export async function syncCreditFastPathFromProfile(
  userId: string,
  monthKey: string,
  profileUsed: number,
): Promise<void> {
  if (!redis || !FAST_PATH_ENABLED) return;
  const key = fastUsedKey(userId, monthKey);
  try {
    const cur = await redis.get<number>(key);
    const curNum = typeof cur === 'number' ? cur : Number(cur) || 0;
    const next = Math.max(curNum, Math.max(0, profileUsed));
    await redis.set(key, next, { ex: MONTH_TTL_SEC });
  } catch {
    /* ignore */
  }
}

export async function reserveCreditsRedisFastPath(args: {
  userId: string;
  monthKey: string;
  cost: number;
  monthlyLimit: number;
}): Promise<{ ok: true; used: number } | { ok: false; error: 'INSUFFICIENT_CREDITS' } | null> {
  if (!redis || !FAST_PATH_ENABLED || args.cost <= 0) return null;

  const key = fastUsedKey(args.userId, args.monthKey);
  try {
    const result = await redis.eval(
      RESERVE_LUA,
      [key],
      [String(args.cost), String(args.monthlyLimit)],
    );
    const n = typeof result === 'number' ? result : Number(result);
    if (n === -1) return { ok: false, error: 'INSUFFICIENT_CREDITS' };
    if (!Number.isFinite(n) || n < 0) return null;
    await redis.expire(key, MONTH_TTL_SEC);
    return { ok: true, used: n };
  } catch (e) {
    console.warn('[credit-redis] reserve failed:', e);
    return null;
  }
}

export async function releaseCreditsRedisFastPath(
  userId: string,
  monthKey: string,
  cost: number,
): Promise<void> {
  if (!redis || !FAST_PATH_ENABLED || cost <= 0) return;
  try {
    const key = fastUsedKey(userId, monthKey);
    const next = await redis.decrby(key, cost);
    if (typeof next === 'number' && next < 0) {
      await redis.set(key, 0, { ex: MONTH_TTL_SEC });
    }
  } catch {
    /* ignore */
  }
}

export async function setCreditFastPathUsed(
  userId: string,
  monthKey: string,
  used: number,
): Promise<void> {
  if (!redis || !FAST_PATH_ENABLED) return;
  try {
    await redis.set(fastUsedKey(userId, monthKey), Math.max(0, used), { ex: MONTH_TTL_SEC });
  } catch {
    /* ignore */
  }
}

export async function adjustCreditFastPathRefund(
  userId: string,
  monthKey: string,
  cost: number,
): Promise<void> {
  await releaseCreditsRedisFastPath(userId, monthKey, cost);
}
