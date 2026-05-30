import type { Slide } from '@/types';
import type { ReferenceTemplateId } from './catalog';

export type ReferenceTemplatePack = {
  packId: ReferenceTemplateId;
  slides: Slide[];
};

/** Fetch the best-matching reference PPTX pack for a prompt (server-side import). */
export async function fetchReferenceTemplatePack(args: {
  prompt: string;
  layoutCategory?: string;
  signal?: AbortSignal;
}): Promise<ReferenceTemplatePack | null> {
  const params = new URLSearchParams({ prompt: args.prompt });
  if (args.layoutCategory) params.set('layoutCategory', args.layoutCategory);

  const res = await fetch(`/api/reference-templates?${params}`, { signal: args.signal });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    packId?: ReferenceTemplateId;
    slides?: Slide[];
  };

  if (!data.packId || !Array.isArray(data.slides) || data.slides.length === 0) {
    return null;
  }

  return { packId: data.packId, slides: data.slides };
}
