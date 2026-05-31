import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

const EXTRA_LIMITERS_KEY = '__orbstera_extra_ratelimiters__';

type GlobalWithLimiters = typeof globalThis & {
  [EXTRA_LIMITERS_KEY]?: {
    global?: Ratelimit;
    image?: Ratelimit;
  };
};

function getExtraLimiters(): GlobalWithLimiters[typeof EXTRA_LIMITERS_KEY] {
  const g = globalThis as GlobalWithLimiters;
  if (!g[EXTRA_LIMITERS_KEY]) {
    g[EXTRA_LIMITERS_KEY] = {};
  }
  return g[EXTRA_LIMITERS_KEY];
}

function buildLimiter(max: number, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, '1 m'),
    prefix: `rl:orb:${prefix}`,
    analytics: true,
  });
}

/** Stricter deck-generation cap (5/min per user+IP) on top of AI heavy tier. */
export function getGlobalRateLimit(): Ratelimit | null {
  const store = getExtraLimiters();
  if (store!.global === undefined) {
    store!.global = buildLimiter(5, 'deck:global') ?? undefined;
  }
  return store!.global ?? null;
}

export { rateLimitUnavailableResponse } from '@/lib/rate-limit-server';

/** Image generation cap (20/min per user+IP). */
export function getImageRateLimit(): Ratelimit | null {
  const store = getExtraLimiters();
  if (store!.image === undefined) {
    store!.image = buildLimiter(20, 'image:extra') ?? undefined;
  }
  return store!.image ?? null;
}

/** @deprecated Use getGlobalRateLimit() — kept for existing imports. */
export const globalRateLimit = getGlobalRateLimit();

/** @deprecated Use getImageRateLimit() — kept for existing imports. */
export const imageRateLimit = getImageRateLimit();
