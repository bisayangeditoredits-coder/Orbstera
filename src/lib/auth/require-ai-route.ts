import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireApiUser, PRIVATE_API_HEADERS } from '@/lib/auth/server';
import { enforceAiRateLimit, requireRateLimitInfrastructure } from '@/lib/rate-limit-server';
import type { AiTier } from '@/lib/rate-limit-server';

export type AiRouteAuth =
  | { user: User }
  | { response: NextResponse };

/**
 * Requires signed-in user, production Redis for rate limits, and per-user/IP AI rate limit.
 */
export async function requireAiUser(
  req: Request,
  tier: AiTier = 'default',
): Promise<AiRouteAuth> {
  const infra = requireRateLimitInfrastructure();
  if (infra) return { response: infra };

  const auth = await requireApiUser();
  if ('response' in auth) return auth;

  const limited = await enforceAiRateLimit(req, auth.user.id, tier);
  if (limited) return { response: limited };

  return { user: auth.user };
}

export function aiUnauthorized(message = 'Please sign in to use this feature.'): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message },
    { status: 401, headers: PRIVATE_API_HEADERS },
  );
}
