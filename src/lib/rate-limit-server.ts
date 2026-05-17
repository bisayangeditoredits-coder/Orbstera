import { Ratelimit } from '@upstash/ratelimit';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]!.trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export type AiTier = 'default' | 'heavy';

/** Fail closed in production when Upstash is not configured. */
export function requireRateLimitInfrastructure(): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token && redis) return null;
  return NextResponse.json(
    {
      error: 'SERVICE_UNAVAILABLE',
      message: 'Rate limiting is not configured. Please try again later.',
    },
    { status: 503 },
  );
}

const userMax: Record<AiTier, number> = { default: 12, heavy: 6 };
const ipMax: Record<AiTier, number> = { default: 45, heavy: 24 };

const userLimiters = new Map<AiTier, Ratelimit | null>();
const ipLimiters = new Map<AiTier, Ratelimit | null>();

function getUserLimiter(tier: AiTier): Ratelimit | null {
  if (userLimiters.has(tier)) return userLimiters.get(tier)!;
  if (!redis) {
    userLimiters.set(tier, null);
    return null;
  }
  const lim = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(userMax[tier], '1 m'),
    prefix: `rl:orb:ai:user:${tier}`,
  });
  userLimiters.set(tier, lim);
  return lim;
}

function getIpLimiter(tier: AiTier): Ratelimit | null {
  if (ipLimiters.has(tier)) return ipLimiters.get(tier)!;
  if (!redis) {
    ipLimiters.set(tier, null);
    return null;
  }
  const lim = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(ipMax[tier], '1 m'),
    prefix: `rl:orb:ai:ip:${tier}`,
  });
  ipLimiters.set(tier, lim);
  return lim;
}

/**
 * Per-user + per-IP sliding window. No-op when Upstash Redis is not configured.
 */
export async function enforceAiRateLimit(
  req: Request,
  userId: string | null,
  tier: AiTier = 'default',
): Promise<NextResponse | null> {
  const userLim = getUserLimiter(tier);
  const ipLim = getIpLimiter(tier);
  if (!userLim && !ipLim) return null;

  if (userLim && userId) {
    const { success } = await userLim.limit(userId);
    if (!success) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many AI requests. Please wait a moment and try again.' },
        { status: 429 },
      );
    }
  }

  if (ipLim) {
    const { success } = await ipLim.limit(clientIp(req));
    if (!success) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many requests from this network. Try again shortly.' },
        { status: 429 },
      );
    }
  }

  return null;
}
