import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/server';
import {
  enforceApiIpRateLimit,
  enforceApiUserRateLimit,
  requireRateLimitInfrastructure,
  type ApiTier,
} from '@/lib/rate-limit-server';

export type ApiRouteAuth = { user: User } | { response: NextResponse };

/**
 * Authenticated API routes with per-user/IP rate limits (storage, uploads, CRUD).
 * IP limit runs before Supabase auth to reject abuse without DB round-trips.
 */
export async function requireApiUserWithRateLimit(
  req: Request,
  tier: ApiTier = 'default',
): Promise<ApiRouteAuth> {
  const infra = requireRateLimitInfrastructure();
  if (infra) return { response: infra };

  const ipLimited = await enforceApiIpRateLimit(req, tier);
  if (ipLimited) return { response: ipLimited };

  const auth = await requireApiUser();
  if ('response' in auth) return auth;

  const userLimited = await enforceApiUserRateLimit(req, auth.user.id, tier);
  if (userLimited) return { response: userLimited };

  return { user: auth.user };
}
