import type { SlideElement } from '@/types';
import { parseColorForPptx } from '@/lib/export/export-colors';

const SCALE = 1 / 96;

export function pxToIn(v: number): number {
  return parseFloat((v * SCALE).toFixed(4));
}

/** pptxgenjs rectRadius is 0–1 as a fraction of the smaller shape dimension. */
export function pptxRectRadius(el: SlideElement): number | undefined {
  if (el.type !== 'shape' || el.shapeType !== 'rect') return undefined;
  const r = el.shapeStyle?.cornerRadius;
  if (!r || r <= 0) return undefined;
  const minDim = Math.max(1, Math.min(el.width || 1, el.height || 1));
  return Math.min(0.5, r / minDim);
}

/** Skip hairline rgba strokes that render as harsh black borders in PowerPoint. */
export function pptxShapeLine(
  ss: SlideElement['shapeStyle'],
): { color: string; pt: number; transparency?: number } | { type: 'none' } {
  if (!ss?.stroke || ss.stroke === 'transparent' || !ss.strokeWidth) {
    return { type: 'none' };
  }
  const strokeParsed = parseColorForPptx(ss.stroke);
  if ((strokeParsed.transparency ?? 0) >= 80) {
    return { type: 'none' };
  }
  return {
    color: strokeParsed.color,
    pt: Math.max(0.25, ss.strokeWidth * 0.75),
    ...(strokeParsed.transparency ? { transparency: strokeParsed.transparency } : {}),
  };
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
