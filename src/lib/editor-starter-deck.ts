import type { PresentationData, Slide } from '@/types';

/** One blank slide so the canvas / toolbar never mount with `presentation === null`. */
export function createStarterPresentation(): PresentationData {
  const deckId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `deck-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const slideId = `slide-${Date.now()}`;
  const slide: Slide = {
    id: slideId,
    type: 'content',
    title: '',
    elements: [],
    animation: { entrance: 'fadeSlideUp', duration: 800 },
  };
  return {
    id: deckId,
    title: 'Untitled presentation',
    theme: 'modern-dark',
    colorPalette: ['#05050A', '#FFFFFF', '#0009fa', '#94A3B8'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    animationStyle: 'cinematic-reveal',
    slides: [slide],
    source: 'manual',
  };
}
