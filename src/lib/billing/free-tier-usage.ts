import { getServiceSupabase } from '@/lib/billing/supabase-admin';

export type FreeTierField =
  | 'free_magic_edit_uses'
  | 'free_generative_fill_uses'
  | 'free_ai_deck_generations';

export type FreeTierUsage = {
  free_magic_edit_uses: number;
  free_generative_fill_uses: number;
  free_ai_deck_generations: number;
};

type RpcFreeTierPayload = {
  ok?: boolean;
  error?: string;
  used?: number;
};

function isRpcUnavailable(error: unknown): boolean {
  const msg = String(
    (error as { message?: string })?.message ||
      (error as { details?: string })?.details ||
      error ||
      '',
  );
  return /increment_free_tier_usage_atomic|decrement_free_tier_usage_atomic|schema cache|Could not find the function|function .* does not exist/i.test(
    msg,
  );
}

/** Legacy read-then-write fallback when RPC migration is not applied yet. */
async function incrementFreeTierUsageLegacy(
  userId: string,
  field: FreeTierField,
  limit: number,
): Promise<{ ok: true; used: number } | { ok: false; error: string }> {
  const admin = getServiceSupabase();
  if (!admin) return { ok: false, error: 'NO_ADMIN' };

  const { data } = await admin.from('profiles').select(field).eq('id', userId).maybeSingle();
  const row = data as Record<string, unknown> | null;
  const used = typeof row?.[field] === 'number' ? (row[field] as number) : 0;
  if (used >= limit) return { ok: false, error: 'LIMIT_REACHED' };
  const next = used + 1;
  await admin.from('profiles').update({ [field]: next }).eq('id', userId);
  return { ok: true, used: next };
}

export async function readFreeTierUsage(userId: string): Promise<FreeTierUsage> {
  const admin = getServiceSupabase();
  if (!admin) {
    return { free_magic_edit_uses: 0, free_generative_fill_uses: 0, free_ai_deck_generations: 0 };
  }
  const { data } = await admin
    .from('profiles')
    .select('free_magic_edit_uses, free_generative_fill_uses, free_ai_deck_generations')
    .eq('id', userId)
    .maybeSingle();
  return {
    free_magic_edit_uses: typeof data?.free_magic_edit_uses === 'number' ? data.free_magic_edit_uses : 0,
    free_generative_fill_uses:
      typeof data?.free_generative_fill_uses === 'number' ? data.free_generative_fill_uses : 0,
    free_ai_deck_generations:
      typeof data?.free_ai_deck_generations === 'number' ? data.free_ai_deck_generations : 0,
  };
}

/**
 * Atomically increment a free-tier counter if under limit.
 * Uses Supabase RPC with row lock; falls back to legacy path in dev without migration.
 */
export async function tryIncrementFreeTierUsage(
  userId: string,
  field: FreeTierField,
  limit: number,
): Promise<{ ok: true; used: number } | { ok: false; error: string }> {
  const admin = getServiceSupabase();
  if (!admin) return { ok: false, error: 'NO_ADMIN' };

  try {
    const { data, error } = await admin.rpc('increment_free_tier_usage_atomic', {
      p_user_id: userId,
      p_field: field,
      p_limit: limit,
    });
    if (error) {
      if (isRpcUnavailable(error)) {
        return incrementFreeTierUsageLegacy(userId, field, limit);
      }
      console.error('[free-tier] increment RPC failed:', error);
      return { ok: false, error: 'RPC_FAILED' };
    }
    const payload = (data ?? {}) as RpcFreeTierPayload;
    if (payload.ok && typeof payload.used === 'number') {
      return { ok: true, used: payload.used };
    }
    return { ok: false, error: payload.error || 'LIMIT_REACHED' };
  } catch (e) {
    if (isRpcUnavailable(e)) {
      return incrementFreeTierUsageLegacy(userId, field, limit);
    }
    console.error('[free-tier] increment failed:', e);
    return { ok: false, error: 'RPC_FAILED' };
  }
}

/** Release a previously reserved free-tier slot (e.g. on generation failure). */
export async function decrementFreeTierUsage(userId: string, field: FreeTierField): Promise<void> {
  const admin = getServiceSupabase();
  if (!admin) return;

  try {
    const { error } = await admin.rpc('decrement_free_tier_usage_atomic', {
      p_user_id: userId,
      p_field: field,
    });
    if (error && !isRpcUnavailable(error)) {
      console.error('[free-tier] decrement RPC failed:', error);
    }
  } catch (e) {
    if (!isRpcUnavailable(e)) {
      console.error('[free-tier] decrement failed:', e);
    }
  }
}

/** @deprecated Use tryIncrementFreeTierUsage with an explicit limit. */
export async function incrementFreeTierUsage(
  userId: string,
  field: FreeTierField,
  limit = Number.MAX_SAFE_INTEGER,
): Promise<number | null> {
  const result = await tryIncrementFreeTierUsage(userId, field, limit);
  return result.ok ? result.used : null;
}
