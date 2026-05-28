import { NextResponse } from 'next/server';
import {
  assertTrustedOrigin,
  PRIVATE_API_HEADERS,
  requireAdminUser,
  untrustedOriginResponse,
} from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';
import { applySubscriptionUpgrade } from '@/lib/billing/subscription';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const MAX_BODY_BYTES = 16 * 1024;

export async function POST(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();

  const auth = await requireAdminUser();
  if ('response' in auth) return auth.response;

  try {
    const bodyResult = await readJsonBodyWithLimit<{ targetUserId?: string; newPlan?: string }>(
      req,
      MAX_BODY_BYTES,
    );
    if (!bodyResult.ok) return bodyResult.response;
    const { targetUserId, newPlan } = bodyResult.value;

    if (!targetUserId || !newPlan || typeof targetUserId !== 'string' || typeof newPlan !== 'string') {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400, headers: PRIVATE_API_HEADERS },
      );
    }

    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin API is disabled: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503, headers: PRIVATE_API_HEADERS },
      );
    }

    const normalized = newPlan.toLowerCase();
    if (normalized === 'free') {
      await supabaseAdmin.from('profiles').upsert({
        id: targetUserId,
        plan: 'free',
        credits_monthly_limit: 100,
        credits_used_month: 0,
        credits_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: { plan: 'free' },
      });
    } else {
      const result = await applySubscriptionUpgrade({
        supabaseAdmin,
        userId: targetUserId,
        planId: normalized,
        eventType: 'admin_update',
        resetCredits: true,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: 400, headers: PRIVATE_API_HEADERS },
        );
      }
    }

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

    return NextResponse.json({ success: true, user }, { headers: PRIVATE_API_HEADERS });
  } catch (error: unknown) {
    console.error('Admin Update API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500, headers: PRIVATE_API_HEADERS },
    );
  }
}
