import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_MAX_AGE_SEC,
  SESSION_STARTED_COOKIE,
  isSessionStartedAtExpired,
} from '@/lib/auth/session-policy';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'on',
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function stampSessionCookie(response: NextResponse, startedAt?: string): void {
  response.cookies.set(SESSION_STARTED_COOKIE, startedAt ?? new Date().toISOString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_STARTED_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return applySecurityHeaders(NextResponse.next());
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnon) {
    console.error('[Middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return applySecurityHeaders(NextResponse.next());
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const sessionStarted = request.cookies.get(SESSION_STARTED_COOKIE)?.value;

  if (user) {
    if (isSessionStartedAtExpired(sessionStarted)) {
      await supabase.auth.signOut();
      clearSessionCookie(response);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'session_expired');
      return applySecurityHeaders(NextResponse.redirect(url));
    }
    if (!sessionStarted) {
      stampSessionCookie(response);
    }
  } else if (sessionStarted) {
    clearSessionCookie(response);
  }

  const isProtectedRoute =
    pathname.startsWith('/editor') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/my-presentations') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin');

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/editor';
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  if (pathname.startsWith('/admin') && user) {
    const email = user.email?.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const emailAdmin = email ? adminEmails.includes(email) : false;
    if (!emailAdmin) {
      // plan=admin checked on page/API; block obvious non-admins without DB round-trip
      const metaPlan = String(user.user_metadata?.plan ?? '').toLowerCase();
      if (metaPlan !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/editor';
        return applySecurityHeaders(NextResponse.redirect(url));
      }
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/editor/:path*',
    '/dashboard/:path*',
    '/account/:path*',
    '/my-presentations/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/login',
    '/api/admin/:path*',
  ],
};
