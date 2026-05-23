import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireApiUser, PRIVATE_API_HEADERS } from '@/lib/auth/server';
import {
  enforceAiIpRateLimit,
  enforceAiUserRateLimit,
  requireRateLimitInfrastructure,
} from '@/lib/rate-limit-server';
import type { AiTier } from '@/lib/rate-limit-server';

export type AiRouteAuth =
  | { user: User }
  | { response: NextResponse };

/**
 * Requires IP rate limit (no DB), signed-in user, user rate limit, and production Redis.
 * Order: infra → IP limit → Supabase auth → user limit.
 */
export async function requireAiUser(
  req: Request,
  tier: AiTier = 'default',
): Promise<AiRouteAuth> {
  const infra = requireRateLimitInfrastructure();
  if (infra) return { response: infra };

  const ipLimited = await enforceAiIpRateLimit(req, tier);
  if (ipLimited) return { response: ipLimited };

  const auth = await requireApiUser();
  if ('response' in auth) return auth;

  const userLimited = await enforceAiUserRateLimit(req, auth.user.id, tier);
  if (userLimited) return { response: userLimited };

  return { user: auth.user };
}

export function aiUnauthorized(message = 'Please sign in to use this feature.'): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message },
    { status: 401, headers: PRIVATE_API_HEADERS },
  );
}
