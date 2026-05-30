import type { DeckLayoutCategory, PresentationData } from '@/types';

type GeneratingShellOptions = {
  themeName?: string;
  layoutCategory?: DeckLayoutCategory;
  colorPalette?: string[];
};

/** Minimal deck while AI generation is starting; `setPresentation` accepts empty slides only with this title (generation reset). */
export function createEditorGeneratingShell(options?: GeneratingShellOptions): PresentationData {
  return {
    title: 'Generating...',
    theme: options?.themeName || 'modern-dark',
    layoutCategory: options?.layoutCategory,
    colorPalette: options?.colorPalette?.length
      ? options.colorPalette
      : ['#05050A', '#FFFFFF', '#0009fa', '#94A3B8'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    animationStyle: 'cinematic-reveal',
    slides: [],
  };
}
