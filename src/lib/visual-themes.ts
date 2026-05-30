/** Visual theme presets from VisualsConfig — palettes, typography, imagery mood. */

import { buildDeckLayoutCategoryPrompt, normalizeDeckLayoutCategory } from '@/lib/deck-layout-categories';

export type VisualBackgroundMode = 'light' | 'dark';

export type VisualThemePreset = {
  id: string;
  name: string;
  colorPalette: [string, string, string, string];
  fontPairing: { heading: string; body: string };
  backgroundMode: VisualBackgroundMode;
  imageryMood: string;
  imageryPalette: string;
};

export const VISUAL_THEME_PRESETS: Record<string, VisualThemePreset> = {
  'chimney-smoke': {
    id: 'chimney-smoke',
    name: 'Chimney Smoke',
    colorPalette: ['#FFFFFF', '#1F2937', '#2563EB', '#6B7280'],
    fontPairing: { heading: 'Lora', body: 'Inter' },
    backgroundMode: 'light',
    imageryMood: 'clean editorial studio, soft natural light, minimal white space',
    imageryPalette: 'white, soft gray, charcoal accents, airy',
  },
  atacama: {
    id: 'atacama',
    name: 'Atacama',
    colorPalette: ['#111111', '#F9FAFB', '#3B82F6', '#9CA3AF'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    backgroundMode: 'dark',
    imageryMood: 'desert night cinematic, deep blacks, subtle gradient haze',
    imageryPalette: 'near-black, moonlit silver, deep blue shadows',
  },
  finesse: {
    id: 'finesse',
    name: 'Finesse',
    colorPalette: ['#F5EDD8', '#3D2E1F', '#B45309', '#78716C'],
    fontPairing: { heading: 'Lora', body: 'Inter' },
    backgroundMode: 'light',
    imageryMood: 'warm sand editorial, golden hour softness, luxury magazine',
    imageryPalette: 'sand beige, warm brown, amber highlights',
  },
  piano: {
    id: 'piano',
    name: 'Piano',
    colorPalette: ['#FFFFFF', '#000000', '#2563EB', '#525252'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    backgroundMode: 'light',
    imageryMood: 'high-contrast monochrome editorial, bold geometry, gallery aesthetic',
    imageryPalette: 'pure white, jet black, crisp contrast',
  },
  coal: {
    id: 'coal',
    name: 'Coal',
    colorPalette: ['#1C1C1C', '#F5F5F0', '#6366F1', '#A3A3A3'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    backgroundMode: 'dark',
    imageryMood: 'industrial charcoal, moody texture, subtle metallic sheen',
    imageryPalette: 'dark gray, off-white text contrast, indigo accent',
  },
  leimoon: {
    id: 'leimoon',
    name: 'Leimoon',
    colorPalette: ['#FDE8E8', '#4A3A3A', '#EC4899', '#9F7676'],
    fontPairing: { heading: 'Lora', body: 'Inter' },
    backgroundMode: 'light',
    imageryMood: 'soft blush editorial, gentle warmth, feminine premium aesthetic',
    imageryPalette: 'blush pink, rose, soft mauve',
  },
  'corporate-modern': {
    id: 'corporate-modern',
    name: 'Corporate Modern',
    colorPalette: ['#FFFFFF', '#44546A', '#FFC000', '#0563C1'],
    fontPairing: { heading: 'Montserrat', body: 'Inter' },
    backgroundMode: 'light',
    imageryMood: 'professional modern corporate, structured, clean geometric lines',
    imageryPalette: 'crisp white, slate gray, energetic orange accents',
  },
  'healthcare-tech': {
    id: 'healthcare-tech',
    name: 'Health Tech',
    colorPalette: ['#DBEFF9', '#17406D', '#0F6FC6', '#7CCA62'],
    fontPairing: { heading: 'Montserrat', body: 'Inter' },
    backgroundMode: 'light',
    imageryMood: 'clean medical technology, airy, trustworthy, sterile but welcoming',
    imageryPalette: 'soft light blue, deep navy, vibrant health green',
  },
  'eco-sustain': {
    id: 'eco-sustain',
    name: 'Eco Sustain',
    colorPalette: ['#FAFAF9', '#1C1917', '#16A34A', '#84CC16'],
    fontPairing: { heading: 'Lora', body: 'Inter' },
    backgroundMode: 'light',
    imageryMood: 'lush nature, sustainable architecture, clean earthy minimalism',
    imageryPalette: 'leaf green, warm white, earthy brown accents',
  },
  'bold-agency': {
    id: 'bold-agency',
    name: 'Bold Agency',
    colorPalette: ['#09090B', '#FAFAF9', '#EAB308', '#71717A'],
    fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
    backgroundMode: 'dark',
    imageryMood: 'high contrast brutalist, neon accents, hyper-modern typography',
    imageryPalette: 'pitch black, bright cyber yellow, stark white',
  },
};

export const ART_STYLE_IMAGE_HINTS: Record<string, string> = {
  scene: 'cinematic environmental photography, depth and atmosphere, editorial 16:9',
  photo: 'photorealistic documentary photography, natural lighting, authentic detail',
  'still-life': 'studio still life, controlled lighting, clean product-style composition',
  'spot-color': 'monochrome photography with one vivid color accent, selective color treatment',
  custom: 'premium editorial photography, artistic composition',
};

export function resolveVisualTheme(themeId?: string | null): VisualThemePreset {
  if (!themeId) return VISUAL_THEME_PRESETS['chimney-smoke'];
  const key = themeId.trim().toLowerCase();
  const aliases: Record<string, keyof typeof VISUAL_THEME_PRESETS> = {
    dark: 'coal',
    'modern-dark': 'coal',
    'obsidian-night': 'coal',
    'obsidian night': 'coal',
    midnight: 'coal',
    corporate: 'piano',
    'executive-blue': 'piano',
    'executive blue': 'piano',
    gradient: 'atacama',
    aurora: 'atacama',
    minimal: 'piano',
    'paper-white': 'piano',
    'paper white': 'piano',
    warm: 'finesse',
    'sunset-gold': 'finesse',
    'sunset gold': 'finesse',
    tech: 'atacama',
    'cyber-grid': 'atacama',
    'cyber grid': 'atacama',
  };
  return VISUAL_THEME_PRESETS[key] ?? VISUAL_THEME_PRESETS[aliases[key]] ?? VISUAL_THEME_PRESETS['chimney-smoke'];
}

export function resolveArtStyleHint(artStyle?: string | null): string {
  if (!artStyle) return ART_STYLE_IMAGE_HINTS.scene;
  const key = artStyle.trim().toLowerCase();
  return ART_STYLE_IMAGE_HINTS[key] ?? ART_STYLE_IMAGE_HINTS.scene;
}

export function buildVisualCurationBlock(args: {
  themeId?: string;
  artStyle?: string;
  layoutCategory?: string;
  imageSource?: 'ai' | 'unsplash' | 'none';
}): string {
  const theme = resolveVisualTheme(args.themeId);
  const artHint = resolveArtStyleHint(args.artStyle);
  const layoutCategory = normalizeDeckLayoutCategory(args.layoutCategory);
  const layoutPrompt = buildDeckLayoutCategoryPrompt(layoutCategory);
  const source =
    args.imageSource === 'unsplash'
      ? 'Use Unsplash-style realistic stock photography descriptions in imagePrompt.'
      : args.imageSource === 'none'
        ? 'User chose text-only — still write imagePrompt for optional backgrounds but keep copy primary.'
        : 'Generate unique AI imagery — imagePrompt must be highly specific and on-brand.';

  return `[USER VISUAL CURATION — OBEY STRICTLY]
Theme: ${theme.name} (${theme.id})
Palette (use as colorPalette): ${JSON.stringify(theme.colorPalette)}
Typography: heading="${theme.fontPairing.heading}", body="${theme.fontPairing.body}"
Background mode: ${theme.backgroundMode}
Imagery mood family: ${theme.imageryMood}
Color/lighting keywords: ${theme.imageryPalette}
Art style: ${artHint}
Image source: ${args.imageSource ?? 'ai'} — ${source}
Layout category: ${layoutCategory} — ${layoutPrompt}
Layout: premium Gamma-class — category changes actual slide structure, not just colors; vary slide types, never repeat the same layout 3× in a row.
Rhythm: keep the same mood family, but make every slide image feel like a new scene with a different crop, camera distance, or focal subject.`;
}

/** SVG gradient placeholder when image generation fails — avoids infinite loading spinners. */
export function buildGradientPlaceholderDataUrl(
  w: number,
  h: number,
  c1 = '#1e3a5f',
  c2 = '#0f766e',
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
