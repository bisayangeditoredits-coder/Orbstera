import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function adminClientOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (!adminEmail || user.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
