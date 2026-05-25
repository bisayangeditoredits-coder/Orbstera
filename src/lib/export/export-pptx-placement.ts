import type { SlideElement } from '@/types';

const SCALE = 1 / 96;

export function pxToIn(v: number): number {
  return parseFloat((v * SCALE).toFixed(4));
}

/** Shared placement for pptxgenjs shapes, text, and images. */
export function elementPlacement(el: SlideElement): Record<string, number> {
  const placement: Record<string, number> = {
    x: pxToIn(el.x),
    y: pxToIn(el.y),
    w: pxToIn(el.width),
    h: pxToIn(el.height),
  };
  if (el.rotation) placement.rotate = el.rotation;
  if (el.flipX) placement.flipH = 1;
  if (el.flipY) placement.flipV = 1;
  return placement;
}
