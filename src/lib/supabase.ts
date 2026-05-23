import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const BROWSER_CLIENT_KEY = '__orbstera_supabase_browser__';

type BrowserClient = SupabaseClient;

type GlobalWithSupabase = typeof globalThis & {
  [BROWSER_CLIENT_KEY]?: BrowserClient;
};

/**
 * Browser Supabase client (singleton).
 * Uses globalThis so Next.js HMR in dev does not spawn a new client per hot reload.
 */
export function createClient(): BrowserClient {
  const g = globalThis as GlobalWithSupabase;
  if (!g[BROWSER_CLIENT_KEY]) {
    g[BROWSER_CLIENT_KEY] = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return g[BROWSER_CLIENT_KEY];
}
