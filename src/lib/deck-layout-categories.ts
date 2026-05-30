import type { DeckLayoutCategory, SlideLayoutType } from '@/types';

export const DEFAULT_DECK_LAYOUT_CATEGORY: DeckLayoutCategory = 'editorial';

export type DeckLayoutCategoryOption = {
  id: DeckLayoutCategory;
  label: string;
  shortLabel: string;
  description: string;
  promptHint: string;
  rhythm: SlideLayoutType[];
};

export const DECK_LAYOUT_CATEGORIES: DeckLayoutCategoryOption[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    shortLabel: 'Magazine',
    description: 'Asymmetric magazine pages, strong headlines, media-balanced scenes.',
    promptHint: 'Use magazine-style asymmetry, large editorial type, and varied media/text compositions.',
    rhythm: ['hero', 'split', 'content', 'quote', 'media', 'comparison', 'closing'],
  },
  {
    id: 'bento',
    label: 'Bento',
    shortLabel: 'Modular',
    description: 'Dashboard-like grids, stacked cards, compact visual systems.',
    promptHint: 'Use bento grids, modular cards, nested panels, and clear information grouping.',
    rhythm: ['hero', 'content', 'stats', 'comparison', 'bullets', 'media', 'closing'],
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    shortLabel: 'Story',
    description: 'Full-bleed imagery, dramatic crops, quiet premium overlays.',
    promptHint: 'Use full-bleed cinematic scenes, dramatic scale, and minimal copy over atmosphere.',
    rhythm: ['hero', 'media', 'quote', 'split', 'timeline', 'content', 'closing'],
  },
  {
    id: 'corporate',
    label: 'Corporate',
    shortLabel: 'Executive',
    description: 'Clean business layouts, confident grids, executive readability.',
    promptHint: 'Use restrained executive layouts, structured grids, metrics, and boardroom clarity.',
    rhythm: ['hero', 'content', 'stats', 'comparison', 'timeline', 'bullets', 'closing'],
  },
  {
    id: 'pitch',
    label: 'Pitch',
    shortLabel: 'Investor',
    description: 'Problem-solution rhythm, proof slides, traction and ask moments.',
    promptHint: 'Use investor deck sequencing with problem, solution, market, traction, product, and ask layouts.',
    rhythm: ['hero', 'split', 'stats', 'media', 'comparison', 'timeline', 'closing'],
  },
  {
    id: 'product',
    label: 'Product',
    shortLabel: 'Showcase',
    description: 'Product-first media, feature callouts, visual proof panels.',
    promptHint: 'Use product showcase layouts with large media, feature callouts, and crisp visual proof.',
    rhythm: ['hero', 'media', 'split', 'content', 'comparison', 'stats', 'closing'],
  },
  {
    id: 'data_story',
    label: 'Data Story',
    shortLabel: 'Metrics',
    description: 'KPI cards, comparisons, evidence-first narrative slides.',
    promptHint: 'Use data-story layouts: KPI cards, comparisons, dashboards, and insight-first headlines.',
    rhythm: ['hero', 'stats', 'comparison', 'content', 'timeline', 'bullets', 'closing'],
  },
  {
    id: 'timeline',
    label: 'Timeline',
    shortLabel: 'Roadmap',
    description: 'Process flows, milestones, before/after and roadmap pages.',
    promptHint: 'Use roadmap, process, milestone, and sequence-driven layouts throughout the deck.',
    rhythm: ['hero', 'timeline', 'split', 'content', 'comparison', 'timeline', 'closing'],
  },
  {
    id: 'minimal',
    label: 'Minimal',
    shortLabel: 'Airy',
    description: 'Quiet whitespace, few elements, precise copy hierarchy.',
    promptHint: 'Use sparse layouts with generous whitespace, low element count, and quiet hierarchy.',
    rhythm: ['hero', 'content', 'quote', 'split', 'bullets', 'media', 'closing'],
  },
  {
    id: 'luxury',
    label: 'Luxury',
    shortLabel: 'Premium',
    description: 'Elegant editorial spacing, refined contrast, boutique polish.',
    promptHint: 'Use luxury editorial layouts with refined spacing, premium restraint, and high-touch imagery.',
    rhythm: ['hero', 'split', 'quote', 'media', 'content', 'comparison', 'closing'],
  },
];

const CATEGORY_IDS = new Set<DeckLayoutCategory>(DECK_LAYOUT_CATEGORIES.map((c) => c.id));

const CATEGORY_ALIASES: Record<string, DeckLayoutCategory> = {
  auto: DEFAULT_DECK_LAYOUT_CATEGORY,
  magazine: 'editorial',
  editorial: 'editorial',
  bento: 'bento',
  modular: 'bento',
  cinematic: 'cinematic',
  story: 'cinematic',
  corporate: 'corporate',
  business: 'corporate',
  pitch: 'pitch',
  investor: 'pitch',
  startup_pitch: 'pitch',
  startup: 'pitch',
  product: 'product',
  product_showcase: 'product',
  data: 'data_story',
  data_story: 'data_story',
  metrics: 'data_story',
  analytics: 'data_story',
  timeline: 'timeline',
  roadmap: 'timeline',
  process: 'timeline',
  minimal: 'minimal',
  minimalist: 'minimal',
  luxury: 'luxury',
  premium: 'luxury',
};

export function normalizeDeckLayoutCategory(value?: unknown): DeckLayoutCategory {
  if (typeof value !== 'string') return DEFAULT_DECK_LAYOUT_CATEGORY;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const alias = CATEGORY_ALIASES[normalized];
  if (alias) return alias;
  if (CATEGORY_IDS.has(normalized as DeckLayoutCategory)) return normalized as DeckLayoutCategory;
  return DEFAULT_DECK_LAYOUT_CATEGORY;
}

export function getDeckLayoutCategoryOption(value?: unknown): DeckLayoutCategoryOption {
  const id = normalizeDeckLayoutCategory(value);
  return DECK_LAYOUT_CATEGORIES.find((category) => category.id === id) ?? DECK_LAYOUT_CATEGORIES[0];
}

export function buildDeckLayoutCategoryPrompt(value?: unknown): string {
  const category = getDeckLayoutCategoryOption(value);
  return `${category.label}: ${category.promptHint} Preferred rhythm: ${category.rhythm.join(' -> ')}.`;
}
