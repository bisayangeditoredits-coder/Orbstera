import type { PresentationData, Slide } from '@/types';

const STANDARD_W = 1280;
const STANDARD_H = 720;

function newId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * New manual deck: standard 16:9 slide (1280×720 logical, matches Konva canvas).
 * One empty slide so cloud save and dashboard index always have valid payload.
 */
export function createBlankPresentation(title: string): PresentationData {
  const trimmed = title.trim();
  const safeTitle = trimmed.length > 0 ? trimmed : 'Untitled presentation';

  const slide: Slide = {
    id: newId('slide'),
    type: 'content',
    title: '',
    subtitle: undefined,
    bullets: [],
    elements: [],
    animation: { entrance: 'fadeSlideUp', duration: 1000 },
  };

  const now = new Date().toISOString();

  const deckId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `deck-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  return {
    id: deckId,
    title: safeTitle,
    theme: 'modern-dark',
    colorPalette: ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    animationStyle: 'cinematic-reveal',
    slides: [slide],
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    saveVersion: 0,
  };
}

/** Standard slide pixel size (matches KonvaCanvas / export). */
export const STANDARD_SLIDE_SIZE = { width: STANDARD_W, height: STANDARD_H } as const;
