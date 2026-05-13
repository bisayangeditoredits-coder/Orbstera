import type { SlideElement } from '@/types';

/** Must match KonvaCanvas CANVAS_WIDTH / CANVAS_HEIGHT */
export const SLIDE_CANVAS_W = 1280;
export const SLIDE_CANVAS_H = 720;

/**
 * True for the synthetic full-slide “deck background” image (hero slot).
 * Only these are peeled onto SlideBackground in the editor; everything else stays in the element stack.
 */
export function isSlideDeckBackgroundImage(el: SlideElement): boolean {
  if (el.type !== 'image' || el.zIndex !== 0) return false;
  if (el.x > 2 || el.y > 2) return false;
  const wOk = el.width >= SLIDE_CANVAS_W * 0.88;
  const hOk = el.height >= SLIDE_CANVAS_H * 0.88;
  return wOk && hOk;
}

export function findDeckBackgroundElement(elements: SlideElement[] | undefined): SlideElement | undefined {
  return elements?.find(isSlideDeckBackgroundImage);
}
