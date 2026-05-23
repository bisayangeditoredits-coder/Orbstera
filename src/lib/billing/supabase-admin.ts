import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ADMIN_CLIENT_KEY = '__orbstera_supabase_service_role__';

type GlobalWithAdmin = typeof globalThis & {
  [ADMIN_CLIENT_KEY]?: SupabaseClient;
};

const SERVERLESS_CLIENT_OPTIONS = {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' as const },
  global: {
    headers: { 'x-client-info': 'orbstera-serverless' },
  },
};

/**
 * Service-role Supabase client (process singleton).
 * Survives HMR in development and reuses one client per serverless isolate in production.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const g = globalThis as GlobalWithAdmin;
  if (!g[ADMIN_CLIENT_KEY]) {
    g[ADMIN_CLIENT_KEY] = createClient(url, key, SERVERLESS_CLIENT_OPTIONS);
  }
  return g[ADMIN_CLIENT_KEY];
}
