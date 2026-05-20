import { createBrowserClient } from '@supabase/ssr';

if (typeof window === 'undefined') {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (process.env.NODE_ENV === 'production' && url && !url.includes(':6543')) {
    console.warn('⚠️ [Supabase] WARNING: You are not using a connection pooling URL (e.g., ending in :6543). At scale, this will cause Postgres connection exhaustion and crash the database.');
  }
}

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.warn(
        '⚠️ [Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
        'Database-dependent features will fail, but static pages are loading with a placeholder client.'
      );
    }
    // Return a dummy client so the application does not crash on startup/render of static pages.
    return createBrowserClient(
      'https://placeholder-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
    );
  }

  return createBrowserClient(url, key);
};
