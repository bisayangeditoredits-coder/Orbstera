/** Shared deck theme presets (Design panel + Planner setup). */

import {
  DEFAULT_SLIDE_COUNT,
  parseSlideCountParam,
} from '@/lib/slide-count-options';
import type { DeckLayoutCategory } from '@/types';
import {
  DEFAULT_DECK_LAYOUT_CATEGORY,
  getDeckLayoutCategoryOption,
  normalizeDeckLayoutCategory,
} from '@/lib/deck-layout-categories';

export const PALETTE_LABELS = ['Background', 'Text', 'Accent', 'Secondary'] as const;

export type PresentationTheme = {
  name: string;
  palette: [string, string, string, string];
  preview: [string, string];
};

export const PRESENTATION_THEMES: PresentationTheme[] = [
  { name: 'Corporate Modern', palette: ['#FFFFFF', '#44546A', '#FFC000', '#0563C1'], preview: ['#FFFFFF', '#FFC000'] },
  { name: 'Health Tech', palette: ['#DBEFF9', '#17406D', '#0F6FC6', '#7CCA62'], preview: ['#DBEFF9', '#0F6FC6'] },
  { name: 'Chimney Smoke', palette: ['#FFFFFF', '#1F2937', '#2563EB', '#6B7280'], preview: ['#FFFFFF', '#2563EB'] },
  { name: 'Atacama', palette: ['#111111', '#F9FAFB', '#3B82F6', '#9CA3AF'], preview: ['#111111', '#3B82F6'] },
  { name: 'Finesse', palette: ['#F5EDD8', '#3D2E1F', '#B45309', '#78716C'], preview: ['#F5EDD8', '#B45309'] },
  { name: 'Piano', palette: ['#FFFFFF', '#000000', '#2563EB', '#525252'], preview: ['#FFFFFF', '#000000'] },
  { name: 'Coal', palette: ['#1C1C1C', '#F5F5F0', '#6366F1', '#A3A3A3'], preview: ['#1C1C1C', '#6366F1'] },
  { name: 'Leimoon', palette: ['#FDE8E8', '#4A3A3A', '#EC4899', '#9F7676'], preview: ['#FDE8E8', '#EC4899'] },
  { name: 'Eco Sustain', palette: ['#FAFAF9', '#1C1917', '#16A34A', '#84CC16'], preview: ['#FAFAF9', '#16A34A'] },
  { name: 'Bold Agency', palette: ['#09090B', '#FAFAF9', '#EAB308', '#71717A'], preview: ['#09090B', '#EAB308'] },
];

export const PLANNER_SLIDE_COUNT_OPTIONS = [5, 8, 10, 15] as const;
export type PlannerSlideCount = (typeof PLANNER_SLIDE_COUNT_OPTIONS)[number];

export const DEFAULT_PLANNER_SLIDE_COUNT = DEFAULT_SLIDE_COUNT;
export const DEFAULT_PLANNER_THEME = PRESENTATION_THEMES[0];

export type PlannerSetupPreferences = {
  slideCount: number;
  themeName: string;
  colorPalette: string[];
  layoutCategory: DeckLayoutCategory;
};

export function buildPlannerFirstMessage(topic: string, prefs: PlannerSetupPreferences): string {
  const layout = getDeckLayoutCategoryOption(prefs.layoutCategory);
  return [
    `I want to create a presentation about: "${topic}".`,
    `Target length: ${prefs.slideCount} slides.`,
    `Theme: ${prefs.themeName}. Brand colors: ${prefs.colorPalette.join(', ')}.`,
    `Layout category: ${layout.label}. ${layout.promptHint}`,
    `Please build a slide-by-slide outline for exactly ${prefs.slideCount} slides.`,
  ].join('\n');
}

export function plannerSetupStorageKey(topic: string): string {
  return `planner-setup:${topic}`;
}

export function parsePlannerSlideCountFromParam(raw: string | null | undefined): number {
  return parseSlideCountParam(raw);
}

export function parsePlannerThemeFromParam(raw: string | null | undefined): PresentationTheme | null {
  if (!raw?.trim()) return null;
  const q = raw.trim().toLowerCase();
  return PRESENTATION_THEMES.find((t) => t.name.toLowerCase() === q) ?? null;
}

/** Build deck prefs from URL (?slides=8&theme=Ember) or sensible defaults — skips duplicate setup screen. */
export function resolvePlannerPreferencesFromParams(args: {
  slidesParam?: string | null;
  themeParam?: string | null;
  layoutParam?: string | null;
}): PlannerSetupPreferences {
  const slideCount = parseSlideCountParam(args.slidesParam ?? null);
  const theme = parsePlannerThemeFromParam(args.themeParam ?? null) ?? DEFAULT_PLANNER_THEME;
  return {
    slideCount,
    themeName: theme.name,
    colorPalette: [...theme.palette],
    layoutCategory: args.layoutParam
      ? normalizeDeckLayoutCategory(args.layoutParam)
      : DEFAULT_DECK_LAYOUT_CATEGORY,
  };
}
