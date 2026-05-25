/** Shared deck theme presets (Design panel + Planner setup). */

export const PALETTE_LABELS = ['Background', 'Text', 'Accent', 'Secondary'] as const;

export type PresentationTheme = {
  name: string;
  palette: [string, string, string, string];
  preview: [string, string];
};

export const PRESENTATION_THEMES: PresentationTheme[] = [
  { name: 'Midnight', palette: ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'], preview: ['#05050A', '#38BDF8'] },
  { name: 'Ocean', palette: ['#0A1628', '#FFFFFF', '#0009fa', '#93C5FD'], preview: ['#0A1628', '#0009fa'] },
  { name: 'Ember', palette: ['#0F0A00', '#FFFFFF', '#F97316', '#FED7AA'], preview: ['#0F0A00', '#F97316'] },
  { name: 'Forest', palette: ['#071A0F', '#FFFFFF', '#22C55E', '#BBF7D0'], preview: ['#071A0F', '#22C55E'] },
  { name: 'Rose', palette: ['#130A10', '#FFFFFF', '#EC4899', '#FBCFE8'], preview: ['#130A10', '#EC4899'] },
  { name: 'Slate', palette: ['#0F172A', '#FFFFFF', '#64748B', '#CBD5E1'], preview: ['#0F172A', '#64748B'] },
  { name: 'Gold', palette: ['#0D0900', '#FFFFFF', '#EAB308', '#FEF08A'], preview: ['#0D0900', '#EAB308'] },
  { name: 'Arctic', palette: ['#F8FAFC', '#0F172A', '#0EA5E9', '#E0F2FE'], preview: ['#F8FAFC', '#0EA5E9'] },
];

export const PLANNER_SLIDE_COUNT_OPTIONS = [5, 8, 10, 15] as const;
export type PlannerSlideCount = (typeof PLANNER_SLIDE_COUNT_OPTIONS)[number];

export const DEFAULT_PLANNER_SLIDE_COUNT: PlannerSlideCount = 10;
export const DEFAULT_PLANNER_THEME = PRESENTATION_THEMES[0];

export type PlannerSetupPreferences = {
  slideCount: PlannerSlideCount;
  themeName: string;
  colorPalette: string[];
};

export function buildPlannerFirstMessage(topic: string, prefs: PlannerSetupPreferences): string {
  return [
    `I want to create a presentation about: "${topic}".`,
    `Target length: ${prefs.slideCount} slides.`,
    `Theme: ${prefs.themeName}. Brand colors: ${prefs.colorPalette.join(', ')}.`,
    `Please build a slide-by-slide outline for exactly ${prefs.slideCount} slides.`,
  ].join('\n');
}

export function plannerSetupStorageKey(topic: string): string {
  return `planner-setup:${topic}`;
}
