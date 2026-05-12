import type { SlideLayoutType } from '@/types';

/** Premium reusable structures the composer selects by purpose & narrative phase. */
export const SLIDE_ARCHETYPE_IDS = [
  'hero_open',
  'problem_solution',
  'feature_showcase',
  'comparison',
  'statistics',
  'timeline',
  'quote',
  'image_focus',
  'team',
  'process_flow',
  'vision',
  'closing_cta',
  'education_structure',
  'content_support',
] as const;

export type SlideArchetypeId = (typeof SLIDE_ARCHETYPE_IDS)[number];

export interface SlideArchetypeSpec {
  id: SlideArchetypeId;
  /** Preferred layout engine type */
  layoutType: SlideLayoutType;
  maxBullets: number;
  maxTitleChars: number;
  preferredLayouts: string[];
  animationHints: string;
  contentDensity: 'minimal' | 'balanced' | 'rich';
}

export const SLIDE_ARCHETYPE_SPECS: Record<SlideArchetypeId, SlideArchetypeSpec> = {
  hero_open: {
    id: 'hero_open',
    layoutType: 'hero',
    maxBullets: 0,
    maxTitleChars: 72,
    preferredLayouts: ['full-bleed', 'cinematic', 'keynote-title'],
    animationHints: 'cinematicImageZoom or blurIn title; subtle background',
    contentDensity: 'minimal',
  },
  problem_solution: {
    id: 'problem_solution',
    layoutType: 'split',
    maxBullets: 4,
    maxTitleChars: 64,
    preferredLayouts: ['split-image-left', 'split-image-right', 'minimal'],
    animationHints: 'staggerLines bullets; parallaxDrift on supporting visual',
    contentDensity: 'balanced',
  },
  feature_showcase: {
    id: 'feature_showcase',
    layoutType: 'split',
    maxBullets: 4,
    maxTitleChars: 56,
    preferredLayouts: ['bento', 'split-image-right', 'magazine'],
    animationHints: 'verticalRise headline; staggerLines features',
    contentDensity: 'balanced',
  },
  comparison: {
    id: 'comparison',
    layoutType: 'comparison',
    maxBullets: 4,
    maxTitleChars: 48,
    preferredLayouts: ['bento', 'minimal'],
    animationHints: 'horizontalReveal columns; avoid flashy motion',
    contentDensity: 'balanced',
  },
  statistics: {
    id: 'statistics',
    layoutType: 'stats',
    maxBullets: 3,
    maxTitleChars: 52,
    preferredLayouts: ['minimal', 'bento'],
    animationHints: 'depthRise for figures; prefer chart over decorative imagery',
    contentDensity: 'balanced',
  },
  timeline: {
    id: 'timeline',
    layoutType: 'timeline',
    maxBullets: 5,
    maxTitleChars: 52,
    preferredLayouts: ['timeline', 'horizontal-cinematic'],
    animationHints: 'staggerLines milestones',
    contentDensity: 'balanced',
  },
  quote: {
    id: 'quote',
    layoutType: 'quote',
    maxBullets: 0,
    maxTitleChars: 220,
    preferredLayouts: ['minimal', 'editorial'],
    animationHints: 'fadeIn / blurIn only',
    contentDensity: 'minimal',
  },
  image_focus: {
    id: 'image_focus',
    layoutType: 'media',
    maxBullets: 2,
    maxTitleChars: 48,
    preferredLayouts: ['full-bleed', 'cinematic'],
    animationHints: 'cinematicImageZoom on hero visual',
    contentDensity: 'minimal',
  },
  team: {
    id: 'team',
    layoutType: 'team',
    maxBullets: 4,
    maxTitleChars: 44,
    preferredLayouts: ['bento', 'magazine'],
    animationHints: 'scaleSoft portraits; staggerLines names',
    contentDensity: 'balanced',
  },
  process_flow: {
    id: 'process_flow',
    layoutType: 'content',
    maxBullets: 5,
    maxTitleChars: 52,
    preferredLayouts: ['bento', 'timeline'],
    animationHints: 'staggerLines steps',
    contentDensity: 'balanced',
  },
  vision: {
    id: 'vision',
    layoutType: 'hero',
    maxBullets: 3,
    maxTitleChars: 64,
    preferredLayouts: ['cinematic', 'full-bleed'],
    animationHints: 'blurIn + cinematicImageZoom',
    contentDensity: 'minimal',
  },
  closing_cta: {
    id: 'closing_cta',
    layoutType: 'closing',
    maxBullets: 3,
    maxTitleChars: 56,
    preferredLayouts: ['minimal', 'keynote-title'],
    animationHints: 'verticalRise headline; minimal extras',
    contentDensity: 'minimal',
  },
  education_structure: {
    id: 'education_structure',
    layoutType: 'content',
    maxBullets: 5,
    maxTitleChars: 56,
    preferredLayouts: ['minimal', 'magazine'],
    animationHints: 'fadeSlideUp; high readability',
    contentDensity: 'balanced',
  },
  content_support: {
    id: 'content_support',
    layoutType: 'bullets',
    maxBullets: 5,
    maxTitleChars: 56,
    preferredLayouts: ['minimal', 'bento'],
    animationHints: 'staggerLines or verticalRise',
    contentDensity: 'balanced',
  },
};

/** Map archetype → default slide layout type when AI omits alignment */
export function layoutTypeForArchetype(id: string | undefined): SlideLayoutType | undefined {
  if (!id || !(id in SLIDE_ARCHETYPE_SPECS)) return undefined;
  return SLIDE_ARCHETYPE_SPECS[id as SlideArchetypeId].layoutType;
}

export function maxBulletsForArchetype(id: string | undefined): number {
  if (!id || !(id in SLIDE_ARCHETYPE_SPECS)) return 5;
  return SLIDE_ARCHETYPE_SPECS[id as SlideArchetypeId].maxBullets;
}
