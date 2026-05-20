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

/** Non-AI API routes: deck save, R2 uploads, presentation CRUD. */
export type ApiTier = 'default' | 'write';

/**
 * Per-minute sliding window limits.
 *
 * Tiers:
 *   default — lightweight calls (magic edit, image, coach, planner)
 *   heavy   — full deck generation, enhance-ppt
 *   api:default — presentation GET/list
 *   api:write   — presentation POST/save, uploads, presign
 */
const LIMITS = {
  user: {
    default: 20,
    heavy: 8,
    apiDefault: 120,
    apiWrite: 40,
  },
  ip: {
    default: 60,
    heavy: 24,
    apiDefault: 300,
    apiWrite: 100,
  },
} as const;

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

// ── Singleton limiters (created once per process) ─────────────────────────────

const _limiters = new Map<string, Ratelimit | null>();

function getLimiter(prefix: string, max: number): Ratelimit | null {
  if (_limiters.has(prefix)) return _limiters.get(prefix)!;
  if (!redis) {
    _limiters.set(prefix, null);
    return null;
  }
  const lim = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, '1 m'),
    prefix: `rl:orb:${prefix}`,
    // analytics: true  // uncomment to enable Upstash rate-limit analytics dashboard
  });
  _limiters.set(prefix, lim);
  return lim;
}

/**
 * Per-user + per-IP sliding window.
 * No-op when Upstash Redis is not configured (dev / missing env).
 *
 * Returns a 429 NextResponse if either limit is exceeded, null otherwise.
 */
export async function enforceAiRateLimit(
  req: Request,
  userId: string | null,
  tier: AiTier = 'default',
): Promise<NextResponse | null> {
  const userLim = getLimiter(`ai:user:${tier}`, LIMITS.user[tier]);
  const ipLim = getLimiter(`ai:ip:${tier}`, LIMITS.ip[tier]);

  if (!userLim && !ipLim) return null;

  const checks = await Promise.allSettled([
    userLim && userId ? userLim.limit(userId) : Promise.resolve({ success: true }),
    ipLim ? ipLim.limit(clientIp(req)) : Promise.resolve({ success: true }),
  ]);

  for (const result of checks) {
    if (result.status === 'rejected') {
      if (process.env.NODE_ENV === 'production') {
        console.error('[rate-limit] Redis error — failing closed:', result.reason);
        return NextResponse.json(
          {
            error: 'SERVICE_UNAVAILABLE',
            message: 'Rate limiting is temporarily unavailable. Please try again later.',
          },
          { status: 503 },
        );
      }
      console.warn('[rate-limit] Redis error — failing open (dev):', result.reason);
      continue;
    }
    if (!result.value.success) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' },
        {
          status: 429,
          headers: { 'Retry-After': '10' },
        },
      );
    }
  }

  return null;
}

function apiTierKeys(tier: ApiTier): { user: number; ip: number; prefix: string } {
  if (tier === 'write') {
    return {
      user: LIMITS.user.apiWrite,
      ip: LIMITS.ip.apiWrite,
      prefix: 'api:write',
    };
  }
  return {
    user: LIMITS.user.apiDefault,
    ip: LIMITS.ip.apiDefault,
    prefix: 'api:read',
  };
}

/** Rate limit for storage/CRUD API routes (separate prefix from AI). */
export async function enforceApiRateLimit(
  req: Request,
  userId: string | null,
  tier: ApiTier = 'default',
): Promise<NextResponse | null> {
  const { user, ip, prefix } = apiTierKeys(tier);
  const userLim = getLimiter(`${prefix}:user`, user);
  const ipLim = getLimiter(`${prefix}:ip`, ip);

  if (!userLim && !ipLim) return null;

  const checks = await Promise.allSettled([
    userLim && userId ? userLim.limit(userId) : Promise.resolve({ success: true }),
    ipLim ? ipLim.limit(clientIp(req)) : Promise.resolve({ success: true }),
  ]);

  for (const result of checks) {
    if (result.status === 'rejected') {
      if (process.env.NODE_ENV === 'production') {
        console.error('[rate-limit:api] Redis error — failing closed:', result.reason);
        return NextResponse.json(
          {
            error: 'SERVICE_UNAVAILABLE',
            message: 'Rate limiting is temporarily unavailable. Please try again later.',
          },
          { status: 503 },
        );
      }
      console.warn('[rate-limit:api] Redis error — failing open (dev):', result.reason);
      continue;
    }
    if (!result.value.success) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again.' },
        { status: 429, headers: { 'Retry-After': '15' } },
      );
    }
  }

  return null;
}
