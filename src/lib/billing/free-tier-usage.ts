import { getServiceSupabase } from '@/lib/billing/supabase-admin';

export type FreeTierUsage = {
  free_magic_edit_uses: number;
  free_generative_fill_uses: number;
  free_ai_deck_generations: number;
};

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

export async function incrementFreeTierUsage(
  userId: string,
  field: 'free_magic_edit_uses' | 'free_generative_fill_uses' | 'free_ai_deck_generations',
): Promise<number | null> {
  const admin = getServiceSupabase();
  if (!admin) return null;

  const { data } = await admin.from('profiles').select(field).eq('id', userId).maybeSingle();
  const row = data as Record<string, unknown> | null;
  const used = typeof row?.[field] === 'number' ? (row[field] as number) : 0;
  const next = used + 1;

  await admin.from('profiles').update({ [field]: next }).eq('id', userId);
  return next;
}
