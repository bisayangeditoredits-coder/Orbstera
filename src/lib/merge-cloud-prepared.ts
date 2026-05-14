import type { PresentationData, Slide, SlideElement } from '@/types';

function slideElementIdSignature(slides: Slide[] | undefined): string | null {
  if (!slides?.length) return slides?.length === 0 ? '' : null;
  const parts: string[] = [];
  for (const s of slides) {
    const ids = (s.elements || []).map((e) => e.id).join(',');
    parts.push(`${s.id}:${ids}`);
  }
  return parts.join('|');
}

/** True when current slides have the same slide ids and element ids in the same order as `body`. */
export function slidesMatchBodyStructure(bodySlides: Slide[] | undefined, currentSlides: Slide[] | undefined): boolean {
  if (!bodySlides || !currentSlides) return false;
  return slideElementIdSignature(bodySlides) === slideElementIdSignature(currentSlides);
}

function mergeImageFieldsOntoCurrentSlide(current: Slide, body: Slide, prepared: Slide): Slide {
  const next: Slide = { ...current };
  const bImg = body.imageUrl;
  const pImg = prepared.imageUrl;
  if (typeof bImg === 'string' && bImg === current.imageUrl && typeof pImg === 'string' && pImg !== bImg) {
    next.imageUrl = pImg;
  }

  const bel = body.elements || [];
  const pel = prepared.elements || [];
  const cel = current.elements || [];
  if (!cel.length) return next;

  const byId = (els: SlideElement[], id: string) => els.find((e) => e.id === id);

  next.elements = cel.map((el) => {
    if (el.type !== 'image') return el;
    const bEl = byId(bel, el.id);
    const pEl = byId(pel, el.id);
    if (!bEl || bEl.type !== 'image' || !pEl || pEl.type !== 'image') return el;
    const bSrc = typeof bEl.src === 'string' ? bEl.src : '';
    const pSrc = typeof pEl.src === 'string' ? pEl.src : '';
    const cSrc = typeof el.src === 'string' ? el.src : '';
    if (cSrc === bSrc && pSrc && pSrc !== bSrc) {
      return { ...el, src: pSrc };
    }
    return el;
  });

  return next;
}

/**
 * After a successful cloud save, apply `saveVersion` / timestamps and merge `prepared` into local state
 * without reverting concurrent edits (stale `prepared.slides`).
 */
export function buildPresentationUpdatesAfterCloudSave(
  current: PresentationData,
  bodyUsedForSave: PresentationData,
  prepared: PresentationData,
  saveVersion: number,
  lastCloudSavedAt: string,
): Partial<PresentationData> {
  const baseMeta: Partial<PresentationData> = {
    saveVersion,
    lastCloudSavedAt,
  };

  const bodySlides = bodyUsedForSave.slides;
  const curSlides = current.slides;

  if (slidesMatchBodyStructure(bodySlides, curSlides)) {
    return { ...baseMeta, slides: prepared.slides };
  }

  const bodyMap = new Map((bodySlides || []).map((s) => [s.id, s]));
  const prepMap = new Map((prepared.slides || []).map((s) => [s.id, s]));

  const mergedSlides = (curSlides || []).map((slide) => {
    const b = bodyMap.get(slide.id);
    const p = prepMap.get(slide.id);
    if (!b || !p) return slide;
    return mergeImageFieldsOntoCurrentSlide(slide, b, p);
  });

  return { ...baseMeta, slides: mergedSlides };
}
