import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/server';
import {
  enforceApiRateLimit,
  requireRateLimitInfrastructure,
  type ApiTier,
} from '@/lib/rate-limit-server';

export type ApiRouteAuth = { user: User } | { response: NextResponse };

/**
 * Authenticated API routes with per-user/IP rate limits (storage, uploads, CRUD).
 * In production, missing Upstash returns 503 (same fail-closed policy as AI routes).
 */
export async function requireApiUserWithRateLimit(
  req: Request,
  tier: ApiTier = 'default',
): Promise<ApiRouteAuth> {
  const infra = requireRateLimitInfrastructure();
  if (infra) return { response: infra };

  const auth = await requireApiUser();
  if ('response' in auth) return auth;

  const limited = await enforceApiRateLimit(req, auth.user.id, tier);
  if (limited) return { response: limited };

  return { user: auth.user };
}
