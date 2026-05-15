import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  assertTrustedOrigin,
  PRIVATE_API_HEADERS,
  requireAdminUser,
  untrustedOriginResponse,
} from '@/lib/auth/server';

function adminClientOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();

  const auth = await requireAdminUser();
  if ('response' in auth) return auth.response;

  try {
    const { targetUserId, newPlan } = await req.json();

    if (!targetUserId || !newPlan || typeof targetUserId !== 'string' || typeof newPlan !== 'string') {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400, headers: PRIVATE_API_HEADERS },
      );
    }

    const supabaseAdmin = adminClientOrNull();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin API is disabled: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503, headers: PRIVATE_API_HEADERS },
      );
    }

    const { data: user, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { user_metadata: { plan: newPlan } },
    );

    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: targetUserId,
        plan: newPlan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      console.error('Profile update error (plan changed in auth but failed in profiles):', profileError);
    }

    return NextResponse.json({ success: true, user }, { headers: PRIVATE_API_HEADERS });
  } catch (error: unknown) {
    console.error('Admin Update API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500, headers: PRIVATE_API_HEADERS },
    );
  }
}
