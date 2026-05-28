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
    /** Public contact form — per IP per hour */
    contact: 8,
  },
} as const;

/** Fail open in production when Upstash is not configured so the app still works. */
export function requireRateLimitInfrastructure(): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token && redis) return null;
  
  // FIXED: Changed from failing closed (503 SERVICE_UNAVAILABLE) to failing open (null).
  // This allows the app to function without rate limits if Upstash Redis isn't set up yet.
  console.warn('Rate limiting is bypassed because UPSTASH_REDIS_REST_URL is missing.');
  return null;
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

async function runRateLimitChecks(
  checks: Promise<{ success: boolean }>[],
  logPrefix: string,
): Promise<NextResponse | null> {
  const results = await Promise.allSettled(checks);

  for (const result of results) {
    if (result.status === 'rejected') {
      // Fail open in ALL environments — a Redis hiccup should never block users from
      // creating or saving presentations. Log the error for monitoring but allow through.
      console.error(`[rate-limit${logPrefix}] Redis error — failing open:`, result.reason);
      continue;
    }
    if (!result.value.success) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message:
            logPrefix === ':api'
              ? 'Too many requests. Please slow down and try again.'
              : 'Too many requests. Please wait a moment and try again.',
        },
        {
          status: 429,
          headers: { 'Retry-After': logPrefix === ':api' ? '15' : '10' },
        },
      );
    }
  }

  return null;
}

/** IP-only check — run before Supabase auth to block abuse without DB round-trips. */
export async function enforceAiIpRateLimit(
  req: Request,
  tier: AiTier = 'default',
): Promise<NextResponse | null> {
  const ipLim = getLimiter(`ai:ip:${tier}`, LIMITS.ip[tier]);
  if (!ipLim) return null;
  return runRateLimitChecks([ipLim.limit(clientIp(req))], '');
}

/** Per-user check — run after auth. */
export async function enforceAiUserRateLimit(
  _req: Request,
  userId: string,
  tier: AiTier = 'default',
): Promise<NextResponse | null> {
  const userLim = getLimiter(`ai:user:${tier}`, LIMITS.user[tier]);
  if (!userLim) return null;
  return runRateLimitChecks([userLim.limit(userId)], '');
}

/** IP-only API rate limit — before auth. */
export async function enforceApiIpRateLimit(
  req: Request,
  tier: ApiTier = 'default',
): Promise<NextResponse | null> {
  const { ip, prefix } = apiTierKeys(tier);
  const ipLim = getLimiter(`${prefix}:ip`, ip);
  if (!ipLim) return null;
  return runRateLimitChecks([ipLim.limit(clientIp(req))], ':api');
}

/** Per-user API rate limit — after auth. */
export async function enforceApiUserRateLimit(
  _req: Request,
  userId: string,
  tier: ApiTier = 'default',
): Promise<NextResponse | null> {
  const { user, prefix } = apiTierKeys(tier);
  const userLim = getLimiter(`${prefix}:user`, user);
  if (!userLim) return null;
  return runRateLimitChecks([userLim.limit(userId)], ':api');
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

let _contactIpLimiter: Ratelimit | null | undefined;

function getContactIpLimiter(): Ratelimit | null {
  if (_contactIpLimiter !== undefined) return _contactIpLimiter;
  if (!redis) {
    _contactIpLimiter = null;
    return null;
  }
  _contactIpLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(LIMITS.ip.contact, '1 h'),
    prefix: 'rl:orb:contact:ip',
  });
  return _contactIpLimiter;
}

/** Contact form — IP only (no auth), 8 submissions per hour per IP in production. */
export async function enforceContactRateLimit(req: Request): Promise<NextResponse | null> {
  const infra = requireRateLimitInfrastructure();
  if (infra) return infra;

  const ipLim = getContactIpLimiter();
  if (!ipLim) return null;
  return runRateLimitChecks([ipLim.limit(clientIp(req))], ':contact');
}

