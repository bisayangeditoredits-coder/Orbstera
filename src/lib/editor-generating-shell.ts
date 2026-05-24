import type { PresentationData } from '@/types';

/** Minimal deck while AI generation is starting; `setPresentation` accepts empty slides only with this title (generation reset). */
export function createEditorGeneratingShell(): PresentationData {
  return {
    title: 'Generating...',
    theme: 'modern-dark',
    colorPalette: ['#05050A', '#FFFFFF', '#0009fa', '#94A3B8'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    animationStyle: 'cinematic-reveal',
    slides: [],
  };
}
