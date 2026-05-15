import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_MAX_AGE_SEC, SESSION_STARTED_COOKIE } from '@/lib/auth/session-policy';

function safePostLoginPath(next: string | null, origin: string): string {
  const fallback = '/editor';
  if (!next || typeof next !== 'string') return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  try {
    const base = new URL(origin);
    const resolved = new URL(trimmed, base);
    if (resolved.origin !== base.origin) return fallback;
    const path = resolved.pathname + resolved.search;
    if (path.length > 2048) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safePostLoginPath(searchParams.get('next'), origin);

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !supabaseAnon) {
      console.error('[Auth Callback] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return NextResponse.redirect(`${origin}/login?error=auth_configuration`);
    }

    // Build a response object first so we can write cookies onto it
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnon,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          // ✅ Write cookies onto the RESPONSE, not the request
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      response.cookies.set(SESSION_STARTED_COOKIE, new Date().toISOString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SEC,
      });
      return response;
    }

    console.error('[Auth Callback] exchangeCodeForSession error:', error.message);
  }

  // If no code or exchange failed, redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
