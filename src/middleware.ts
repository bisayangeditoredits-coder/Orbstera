import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // ✅ Skip middleware entirely for the auth callback — let it handle itself
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnon) {
    console.error('[Middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        // ✅ Write to BOTH request (for this request) AND response (to persist)
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
    }
  );

  // Refresh session if expired — required for SSR
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtectedRoute =
    pathname.startsWith('/editor') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/my-presentations') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin');

  // 🔒 Unauthenticated user hitting protected route → send to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ✅ Authenticated user hitting /login → redirect to editor (not back to login loop)
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/editor';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Only routes that need auth checks — avoids Supabase getUser() on marketing pages (faster TTFB).
  matcher: ['/editor/:path*', '/dashboard/:path*', '/settings/:path*', '/admin/:path*', '/login'],
};
