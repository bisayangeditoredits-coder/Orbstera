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

export async function GET(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();

  const auth = await requireAdminUser();
  if ('response' in auth) return auth.response;

  try {
    const supabaseAdmin = adminClientOrNull();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin API is disabled: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503, headers: PRIVATE_API_HEADERS },
      );
    }

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    return NextResponse.json({ users: users.users }, { headers: PRIVATE_API_HEADERS });
  } catch (error: unknown) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500, headers: PRIVATE_API_HEADERS },
    );
  }
}
