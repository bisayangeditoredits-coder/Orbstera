import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    // We MUST use the Service Role Key to bypass RLS and access the auth schema
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Note: In production, you MUST check if the request is coming from your admin email
    // e.g. check cookies/session first to ensure regular users can't hit this API!
    
    // Fetch all users from auth.users
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    return NextResponse.json({ users: users.users });
  } catch (error: any) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
