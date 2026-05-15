import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const PRIVATE_API_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
} as const;

export function createRouteSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}

export async function getApiUser(): Promise<User | null> {
  const supabase = createRouteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireApiUser(): Promise<
  { user: User } | { response: NextResponse }
> {
  const user = await getApiUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: PRIVATE_API_HEADERS },
      ),
    };
  }
  return { user };
}

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim() || '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isAdminUser(user: User): Promise<boolean> {
  const email = user.email?.toLowerCase();
  if (email && parseAdminEmails().has(email)) return true;

  try {
    const supabase = createRouteSupabase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle();
    return profile?.plan?.toLowerCase() === 'admin';
  } catch {
    return false;
  }
}

export async function requireAdminUser(): Promise<
  { user: User } | { response: NextResponse }
> {
  const auth = await requireApiUser();
  if ('response' in auth) return auth;
  const admin = await isAdminUser(auth.user);
  if (!admin) {
    return {
      response: NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: PRIVATE_API_HEADERS },
      ),
    };
  }
  return { user: auth.user };
}

/** Reject cross-site POST/PUT/PATCH/DELETE from untrusted origins. */
export function assertTrustedOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const origin = req.headers.get('origin');
  if (!origin) return true;

  const allowed = new Set<string>();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      /* ignore */
    }
  }

  const host = req.headers.get('host');
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed.has(origin);
}

export function untrustedOriginResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden origin' },
    { status: 403, headers: PRIVATE_API_HEADERS },
  );
}
