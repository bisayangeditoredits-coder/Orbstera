'use client';

import { useState } from 'react';
import { ArrowRight, Check, LayoutGrid, Presentation, SwatchBook } from 'lucide-react';
import { ColorPicker } from '@/components/editor/ColorPicker';
import {
  PRESENTATION_THEMES,
  PALETTE_LABELS,
  PLANNER_SLIDE_COUNT_OPTIONS,
  DEFAULT_PLANNER_SLIDE_COUNT,
  DEFAULT_PLANNER_THEME,
  type PlannerSetupPreferences,
  type PlannerSlideCount,
} from '@/lib/presentation-themes';
import {
  DECK_LAYOUT_CATEGORIES,
  DEFAULT_DECK_LAYOUT_CATEGORY,
} from '@/lib/deck-layout-categories';
import { cn } from '@/lib/cn';

type PlannerSetupProps = {
  topic: string;
  onContinue: (prefs: PlannerSetupPreferences) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] font-medium tracking-[-0.01em] text-slate-500">{children}</p>
  );
}

export function PlannerSetup({ topic, onContinue }: PlannerSetupProps) {
  const [slideCount, setSlideCount] = useState<PlannerSlideCount>(DEFAULT_PLANNER_SLIDE_COUNT);
  const [selectedThemeName, setSelectedThemeName] = useState(DEFAULT_PLANNER_THEME.name);
  const [colorPalette, setColorPalette] = useState<string[]>([...DEFAULT_PLANNER_THEME.palette]);
  const [layoutCategory, setLayoutCategory] = useState(DEFAULT_DECK_LAYOUT_CATEGORY);
  const [colorsExpanded, setColorsExpanded] = useState(false);

  const applyTheme = (theme: (typeof PRESENTATION_THEMES)[0]) => {
    setSelectedThemeName(theme.name);
    setColorPalette([...theme.palette]);
  };

  const updateColor = (index: number, color: string) => {
    setColorPalette((prev) => {
      const next = [...prev];
      next[index] = color;
      return next;
    });
  };

  const handleContinue = () => {
    onContinue({
      slideCount,
      themeName: selectedThemeName,
      colorPalette,
      layoutCategory,
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F8FA] px-4 py-12 sm:px-6">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(15,23,42,0.04),transparent)]"
        aria-hidden
      />

      <div className="relative w-full max-w-[440px] overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.12)]">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-slate-200/80 bg-slate-50 text-slate-700">
              <Presentation size={18} strokeWidth={1.5} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h1 className="font-space-grotesk text-[20px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">
                Set up your deck
              </h1>
              {topic.trim() && (
                <p
                  className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-slate-500"
                  title={topic}
                >
                  {topic}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="custom-scrollbar max-h-[min(62vh,520px)] overflow-y-auto overscroll-contain px-6 py-5 sm:px-7 sm:py-6">
          <div className="space-y-7">
            {/* Slide count — segmented control */}
            <section className="space-y-3">
              <SectionLabel>Slides</SectionLabel>
              <div
                className="grid grid-cols-4 gap-1 rounded-[12px] border border-slate-200/90 bg-slate-50/80 p-1"
                role="group"
                aria-label="Number of slides"
              >
                {PLANNER_SLIDE_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSlideCount(n)}
                    className={cn(
                      'relative flex min-h-[40px] items-center justify-center rounded-[9px] text-[14px] font-medium tabular-nums transition-all duration-200',
                      slideCount === n
                        ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <SectionLabel>Layout</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {DECK_LAYOUT_CATEGORIES.map((category) => {
                  const selected = layoutCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setLayoutCategory(category.id)}
                      title={category.description}
                      className={cn(
                        'flex min-h-[48px] items-center gap-2 rounded-[12px] border px-3 text-left transition-all',
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <LayoutGrid size={14} strokeWidth={1.75} />
                      <span className="text-[12px] font-semibold">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Theme presets */}
            <section className="space-y-3">
              <SectionLabel>Theme</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {PRESENTATION_THEMES.map((theme) => {
                  const selected = selectedThemeName === theme.name;
                  return (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => applyTheme(theme)}
                      className={cn(
                        'group relative flex flex-col items-center gap-2 rounded-[12px] border p-2 transition-all duration-200',
                        selected
                          ? 'border-slate-900 bg-slate-50/50'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50/60',
                      )}
                    >
                      <div className="relative h-9 w-full overflow-hidden rounded-[8px] ring-1 ring-inset ring-black/5">
                        <span
                          className="absolute inset-y-0 left-0 w-1/2"
                          style={{ background: theme.preview[0] }}
                        />
                        <span
                          className="absolute inset-y-0 right-0 w-1/2"
                          style={{ background: theme.preview[1] }}
                        />
                        {selected && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Check size={14} className="text-white" strokeWidth={2.5} />
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-medium leading-none',
                          selected ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700',
                        )}
                      >
                        {theme.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Custom colors — collapsible, icon pickers only */}
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setColorsExpanded((v) => !v)}
                aria-expanded={colorsExpanded}
                className="flex w-full items-center justify-between gap-2 rounded-[10px] py-0.5 text-left transition-colors hover:text-slate-700"
              >
                <span className="flex items-center gap-2 text-[13px] font-medium tracking-[-0.01em] text-slate-500">
                  <SwatchBook size={15} className="text-slate-400" strokeWidth={1.5} aria-hidden />
                  Customize colors
                </span>
                <span className="flex -space-x-1.5 shrink-0" aria-hidden>
                  {colorPalette.slice(0, 4).map((c, i) => (
                    <span
                      key={i}
                      className="h-5 w-5 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200/80"
                      style={{ background: c }}
                    />
                  ))}
                </span>
              </button>

              {colorsExpanded && (
                <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-4 sm:gap-2">
                  {PALETTE_LABELS.map((label, i) => (
                    <div
                      key={label}
                      className="flex min-w-0 flex-col items-center gap-2"
                    >
                      <ColorPicker
                        variant="icon"
                        label={label}
                        color={colorPalette[i] || '#000000'}
                        palettePresets={colorPalette}
                        onChange={(c) => updateColor(i, c)}
                      />
                      <span className="w-full truncate text-center text-[10px] font-medium text-slate-500">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-100 bg-white px-6 py-4 sm:px-7">
          <button
            type="button"
            onClick={handleContinue}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-slate-900 text-[14px] font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]"
          >
            Continue
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
