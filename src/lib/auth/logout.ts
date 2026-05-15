'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { clearAllUserClientCaches } from '@/lib/client-cache';

export async function signOutAndClearCaches(
  supabase: SupabaseClient,
  userId?: string | null,
): Promise<void> {
  clearAllUserClientCaches(userId ?? null);
  await supabase.auth.signOut();
}
