'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { signOutAndClearCaches } from '@/lib/auth/logout';
import { clearAllUserClientCaches } from '@/lib/client-cache';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

const PUBLIC_PREFIXES = ['/login', '/signup', '/register', '/auth', '/'];

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/blog')) return true;
  if (pathname.startsWith('/pricing')) return true;
  if (pathname.startsWith('/about')) return true;
  if (pathname.startsWith('/contact')) return true;
  if (pathname.startsWith('/privacy')) return true;
  if (pathname.startsWith('/terms')) return true;
  if (pathname.startsWith('/templates') && !pathname.includes('/editor')) return true;
  return PUBLIC_PREFIXES.some((p) => p !== '/' && pathname.startsWith(p));
}

/**
 * Forces re-login after server session window (3 days) and clears stale client caches.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const checking = useRef(false);

  useEffect(() => {
    if (isPublicPath(pathname)) return;

    const supabase = createClient();

    async function verifySession() {
      if (checking.current) return;
      checking.current = true;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          clearAllUserClientCaches(user.id);
          await signOutAndClearCaches(supabase, user.id);
          const reason =
            body?.error === 'session_expired' ? 'session_expired' : 'session_invalid';
          router.replace(`/login?error=${reason}`);
        }
      } catch {
        /* network blip — retry next interval */
      } finally {
        checking.current = false;
      }
    }

    verifySession();
    const id = window.setInterval(verifySession, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [pathname, router]);

  return <>{children}</>;
}
