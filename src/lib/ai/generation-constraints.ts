import { buildDeckLayoutCategoryPrompt, normalizeDeckLayoutCategory } from '@/lib/deck-layout-categories';
import type { DeckLayoutCategory } from '@/types';
import { resolveVisualTheme, resolveArtStyleHint } from '@/lib/visual-themes';

/** Visual prefs the user explicitly chose (not app defaults). */
export type DeckGenerationConstraints = {
  themeId?: string;
  themeExplicit?: boolean;
  colorPalette?: string[];
  paletteExplicit?: boolean;
  layoutCategory?: string;
  layoutCategoryExplicit?: boolean;
  artStyle?: string;
  imageSource?: 'ai' | 'unsplash' | 'none';
};

/** Soft theme hints for composer — never enforces hex colors or layout. */
export function buildThemeHintsBlock(args: {
  themeId?: string;
  artStyle?: string;
  imageSource?: 'ai' | 'unsplash' | 'none';
}): string | null {
  const themeId = args.themeId?.trim();
  if (!themeId) return null;

  const theme = resolveVisualTheme(themeId);
  const artHint = resolveArtStyleHint(args.artStyle);
  const source =
    args.imageSource === 'unsplash'
      ? 'Prefer Unsplash-style realistic stock photography in imagePrompt.'
      : args.imageSource === 'none'
        ? 'Text-first deck — imagePrompt still required for optional backgrounds.'
        : 'Generate unique AI imagery — imagePrompt must be specific and on-brand.';

  return `[OPTIONAL VISUAL HINTS — user suggestion only; adapt freely for the topic]
paletteHint (suggested, not mandatory): ${JSON.stringify(theme.colorPalette)}
moodHint: ${theme.imageryMood}
color/lighting keywords: ${theme.imageryPalette}
typography suggestion: heading="${theme.fontPairing.heading}", body="${theme.fontPairing.body}"
art style hint: ${artHint}
image source: ${args.imageSource ?? 'ai'} — ${source}
You MAY ignore paletteHint if another palette fits the subject better. Choose layoutCategory, per-slide layout, backgroundStyle.type, and overlayOpacity independently.`;
}

/**
 * System-side constraints for the composer (after director orchestration).
 * Omitted entirely when the user did not explicitly pick theme, palette, or layout.
 */
export function buildSystemConstraintsBlock(constraints: DeckGenerationConstraints): string {
  const parts: string[] = [];

  if (constraints.paletteExplicit && constraints.colorPalette?.length) {
    parts.push(
      `[USER COLOR PALETTE — explicit choice]\nPrefer this colorPalette in deck JSON: ${JSON.stringify(constraints.colorPalette)}`,
    );
  }

  if (constraints.themeExplicit && constraints.themeId) {
    const hints = buildThemeHintsBlock({
      themeId: constraints.themeId,
      artStyle: constraints.artStyle,
      imageSource: constraints.imageSource,
    });
    if (hints) parts.push(hints);
  }

  if (constraints.layoutCategoryExplicit && constraints.layoutCategory?.trim()) {
    const cat = normalizeDeckLayoutCategory(constraints.layoutCategory);
    parts.push(
      `[SUGGESTED LAYOUT FAMILY — optional]\nThe user suggested "${cat}" as a starting point. ${buildDeckLayoutCategoryPrompt(cat)}\nYou may choose a different root layoutCategory if it better serves the narrative.`,
    );
  }

  if (!parts.length) return '';

  return `${parts.join('\n\n')}

These blocks are hints or explicit palette choices only — never lock every slide to one layout or one background treatment.`;
}

export function constraintsFromGenerateBody(body: Record<string, unknown>): DeckGenerationConstraints {
  return {
    themeId: typeof body.theme === 'string' ? body.theme : undefined,
    themeExplicit: body.themeExplicit === true,
    colorPalette: Array.isArray(body.colorPalette) ? (body.colorPalette as string[]) : undefined,
    paletteExplicit: body.paletteExplicit === true,
    layoutCategory: typeof body.layoutCategory === 'string' ? body.layoutCategory : undefined,
    layoutCategoryExplicit: body.layoutCategoryExplicit === true,
    artStyle: typeof body.styleMode === 'string' ? body.styleMode : undefined,
    imageSource:
      body.imageSource === 'ai' || body.imageSource === 'unsplash' || body.imageSource === 'none'
        ? body.imageSource
        : undefined,
  };
}

export type SlideBackgroundStyle = {
  type: 'image' | 'solid';
  overlayOpacity: number;
  overlayColor: string;
  textColor: string;
};

export function parseSlideBackgroundStyle(raw: unknown): SlideBackgroundStyle | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return parseSlideBackgroundStyle(parsed);
    } catch {
      if (raw.includes('image')) {
        return { type: 'image', overlayOpacity: 0.52, overlayColor: '#000000', textColor: '#FFFFFF' };
      }
      return null;
    }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const type = o.type === 'image' ? 'image' : o.type === 'solid' ? 'solid' : null;
  if (!type) return null;
  const opacity = typeof o.overlayOpacity === 'number' ? o.overlayOpacity : Number(o.overlayOpacity);
  return {
    type,
    overlayOpacity: Number.isFinite(opacity) ? opacity : type === 'image' ? 0.52 : 0,
    overlayColor: typeof o.overlayColor === 'string' ? o.overlayColor : '#000000',
    textColor: typeof o.textColor === 'string' ? o.textColor : '#FFFFFF',
  };
}

function clampOverlay(opacity: number): number {
  return Math.min(0.58, Math.max(0.45, opacity));
}

/** Ensure image backgrounds on hero, closing, quote, and cinematic content slides. */
export function enforceSlideBackgroundStyles(
  slides: { type?: string; layout?: string; backgroundStyle?: unknown }[],
  imageSource?: 'ai' | 'unsplash' | 'none',
): void {
  if (imageSource === 'none') return;

  slides.forEach((slide, i) => {
    const type = String(slide.type || '').toLowerCase();
    const layout = String(slide.layout || '').toLowerCase();
    const existing = parseSlideBackgroundStyle(slide.backgroundStyle);
    const isContentCinematic =
      type === 'content' &&
      (layout.includes('cinematic') ||
        layout.includes('overlay') ||
        layout.includes('full-bleed') ||
        i % 3 === 2);

    const wantsImage =
      type === 'hero' ||
      type === 'closing' ||
      type === 'quote' ||
      isContentCinematic ||
      existing?.type === 'image';

    if (!wantsImage) return;

    const opacity =
      existing?.type === 'image' && existing.overlayOpacity >= 0.35
        ? clampOverlay(existing.overlayOpacity)
        : 0.52;

    slide.backgroundStyle = JSON.stringify({
      type: 'image',
      overlayOpacity: opacity,
      overlayColor: existing?.overlayColor || '#000000',
      textColor: '#FFFFFF',
    } satisfies SlideBackgroundStyle);
  });
}
