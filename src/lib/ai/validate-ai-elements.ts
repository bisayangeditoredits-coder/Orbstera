import type { SlideElement } from '@/types';
import type { DeckImageTask } from '@/lib/deck-image-generation';
import { DECK_CANVAS_H, DECK_CANVAS_W } from '@/lib/deck-slide-layout';
import { resolveDeckImagePrompt } from '@/lib/deck-slide-layout';

export const AI_LAYOUT_MIN_ELEMENTS = 2;

export function clampAiElement(el: SlideElement): SlideElement {
  const x = Math.max(0, Math.min(DECK_CANVAS_W - 20, el.x ?? 0));
  const y = Math.max(0, Math.min(DECK_CANVAS_H - 20, el.y ?? 0));
  const maxW = DECK_CANVAS_W - x;
  const maxH = DECK_CANVAS_H - y;
  const width = Math.max(20, Math.min(maxW, el.width ?? 100));
  const height = Math.max(20, Math.min(maxH, el.height ?? 40));
  return { ...el, x, y, width, height };
}

/** Returns true when AI-authored elements are usable (bounds + at least one text element). */
export function validateAiElements(elements: SlideElement[] | undefined): boolean {
  if (!elements || elements.length < AI_LAYOUT_MIN_ELEMENTS) return false;
  const hasText = elements.some((el) => el.type === 'text' && (el.content?.trim()?.length ?? 0) > 0);
  if (!hasText) return false;
  return elements.every((el) => {
    if (!el.type || typeof el.x !== 'number' || typeof el.y !== 'number') return false;
    if (typeof el.width !== 'number' || typeof el.height !== 'number') return false;
    return el.x >= -40 && el.y >= -40 && el.x <= DECK_CANVAS_W + 40 && el.y <= DECK_CANVAS_H + 40;
  });
}

export function normalizeAiElements(elements: SlideElement[]): SlideElement[] {
  return elements.map((el) => clampAiElement(el));
}

export function buildImageTasksFromAiElements(args: {
  slideId: string;
  elements: SlideElement[];
  slideMeta: { type?: string; title?: string; imagePrompt?: string };
  slideIndex: number;
  slideCount: number;
  layoutCategory?: string;
  uid: (prefix: string) => string;
}): { elements: SlideElement[]; imageTasks: DeckImageTask[] } {
  const elements = normalizeAiElements(
    args.elements.map((el, i) => ({
      ...el,
      id: el.id?.trim() ? el.id : args.uid(`ai-el-${i}`),
    })),
  );
  const imageTasks: DeckImageTask[] = [];
  const fallbackPrompt = resolveDeckImagePrompt(
    {
      id: args.slideId,
      type: args.slideMeta.type,
      title: args.slideMeta.title,
      imagePrompt: args.slideMeta.imagePrompt,
    },
    {
      slideIndex: args.slideIndex,
      slideCount: args.slideCount,
      layoutHint: args.slideMeta.type,
      layoutCategory: args.layoutCategory,
    },
  );

  for (const el of elements) {
    if (el.type !== 'image' || (el.src && el.src.trim())) continue;
    const prompt =
      (el as SlideElement & { imagePrompt?: string }).imagePrompt?.trim() || fallbackPrompt;
    imageTasks.push({
      slideId: args.slideId,
      elementId: el.id,
      prompt,
      w: Math.round(el.width || 400),
      h: Math.round(el.height || 300),
      visualProfile: 'cinematic',
    });
  }

  return { elements, imageTasks };
}
