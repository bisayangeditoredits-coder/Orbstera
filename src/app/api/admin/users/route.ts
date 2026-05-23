import { NextResponse } from 'next/server';
import {
  assertTrustedOrigin,
  PRIVATE_API_HEADERS,
  requireAdminUser,
  untrustedOriginResponse,
} from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/billing/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!assertTrustedOrigin(req)) return untrustedOriginResponse();

  const auth = await requireAdminUser();
  if ('response' in auth) return auth.response;

  try {
    const supabaseAdmin = getServiceSupabase();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin API is disabled: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503, headers: PRIVATE_API_HEADERS },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage') || 50) || 50));

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    return NextResponse.json(
      {
        users: users.users,
        page,
        perPage,
        hasMore: users.users.length >= perPage,
      },
      { headers: PRIVATE_API_HEADERS },
    );
  } catch (error: unknown) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500, headers: PRIVATE_API_HEADERS },
    );
  }
}
