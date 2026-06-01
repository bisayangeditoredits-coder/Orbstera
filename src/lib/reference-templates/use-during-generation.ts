import type { ReferenceTemplatePack } from './build-slide';

/**
 * Reference PPTX packs reuse imported slide elements and never queue Leonardo jobs.
 * During live deck generation we use buildDeckSlideElements instead so backgrounds
 * and layouts render with FLUX/Leonardo image tasks.
 */
export function shouldUseReferenceTemplatePackForDeck(
  pack: ReferenceTemplatePack | null | undefined,
  isGenerating: boolean,
): pack is ReferenceTemplatePack {
  if (!pack?.slides?.length) return false;
  if (isGenerating) return false;
  return true;
}
