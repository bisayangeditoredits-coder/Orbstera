import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { targetUserId, newPlan } = await req.json();

    if (!targetUserId || !newPlan) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Use Service Role Key to bypass RLS and update ANY user's auth metadata
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update the specific user's app_metadata and user_metadata
    const { data: user, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      user_metadata: { plan: newPlan }
    });

    if (error) throw error;

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Admin Update API Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
