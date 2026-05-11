import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClientOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const { targetUserId, newPlan } = await req.json();

    if (!targetUserId || !newPlan) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabaseAdmin = adminClientOrNull();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin API is disabled: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 },
      );
    }

    // 1. Update the specific user's user_metadata in the auth system
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: { plan: newPlan }
    });

    if (authError) throw authError;

    // 2. Upsert the user's plan in the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: targetUserId,
        plan: newPlan,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile update error (plan changed in auth but failed in profiles):', profileError);
    }

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    console.error('Admin Update API Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
