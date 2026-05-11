import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClientOrNull() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabaseAdmin = adminClientOrNull();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin API is disabled: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 },
      );
    }

    // Note: In production, you MUST check if the request is coming from your admin email
    // e.g. check cookies/session first to ensure regular users can't hit this API!
    
    // Fetch all users from auth.users
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    return NextResponse.json({ users: users.users });
  } catch (error: unknown) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
