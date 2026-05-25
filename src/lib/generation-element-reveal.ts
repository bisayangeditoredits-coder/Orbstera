import type { SlideElement } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function isFullSlideBackground(el: SlideElement): boolean {
  if (el.type === 'image' && el.width >= CANVAS_W - 2 && el.height >= CANVAS_H - 2) return true;
  if (
    el.type === 'shape' &&
    el.shapeType === 'rect' &&
    el.width >= CANVAS_W - 2 &&
    el.height >= CANVAS_H - 2
  ) {
    return true;
  }
  return false;
}

function isTitleLikeText(el: SlideElement): boolean {
  if (el.type !== 'text') return false;
  const fs = el.textStyle?.fontSize ?? 0;
  return fs >= 36 || el.width >= 400;
}

function revealPriority(el: SlideElement, bgEl: SlideElement | null | undefined): number {
  if (el === bgEl || el.id.startsWith('el-bg')) return 0;
  if (isFullSlideBackground(el)) return 1;
  if (isTitleLikeText(el)) return 2;
  if (el.type === 'shape' && (el.shapeStyle?.fill || el.shapeType === 'rect')) return 3;
  if (el.type === 'image') return 4;
  if (el.type === 'text') return 5;
  return 6;
}

/** Stable build order for Gamma-style canvas reveal. */
export function getGenerationRevealOrder(elements: SlideElement[]): SlideElement[] {
  const bgEl = findDeckBackgroundElement(elements);
  const visible = elements.filter((el) => el.visible !== false);
  return [...visible].sort((a, b) => {
    const pa = revealPriority(a, bgEl);
    const pb = revealPriority(b, bgEl);
    if (pa !== pb) return pa - pb;
    const za = a.zIndex ?? 0;
    const zb = b.zIndex ?? 0;
    if (za !== zb) return za - zb;
    return a.y - b.y;
  });
}

/** Stagger delay after previous element (ms). */
export function generationRevealDelayMs(el: SlideElement, index: number): number {
  if (index === 0) return 0;
  if (el.type === 'text' && isTitleLikeText(el)) return 200;
  if (el.type === 'image') return 300;
  return 150;
}
