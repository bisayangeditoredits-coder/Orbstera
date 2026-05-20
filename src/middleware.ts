import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const rateLimiters = redis ? {
  generate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'ratelimit_generate' }),
  export: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'ratelimit_export' }),
  general: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'ratelimit_general' }),
} : null;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 🛡️ API Rate Limiting
  if (pathname.startsWith('/api/')) {
    if (rateLimiters) {
      const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
      let limiter = rateLimiters.general;
      if (pathname.startsWith('/api/generate')) {
        limiter = rateLimiters.generate;
      } else if (pathname.startsWith('/api/export')) {
        limiter = rateLimiters.export;
      }

      const { success, limit, reset, remaining } = await limiter.limit(ip);
      if (!success) {
        return new NextResponse(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { 
            status: 429, 
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString()
            } 
          }
        );
      }
    } else {
      console.warn('[Middleware] UPSTASH_REDIS_REST_URL missing. Rate limiting disabled.');
    }
  }

  // ✅ Skip middleware entirely for the auth callback — let it handle itself
  if (pathname.startsWith('/auth/callback')) {
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
  // Apply to API routes and protected UI routes
  matcher: ['/api/:path*', '/editor/:path*', '/dashboard/:path*', '/settings/:path*', '/admin/:path*', '/login'],
};
