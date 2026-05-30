'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  Image as ImageIcon,
  ImageOff,
  Plus,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCredits } from '@/hooks/useCredits';
import { SlideCountDropdown } from '@/components/SlideCountDropdown';
import { DEFAULT_SLIDE_COUNT, nearestValidSlideCount } from '@/lib/slide-count-options';
import { VISUAL_THEME_PRESETS, type VisualThemePreset } from '@/lib/visual-themes';

export interface VisualsConfigProps {
  initialSlideCount: number;
  onGenerate: (config: {
    theme: string;
    imageSource: 'ai' | 'unsplash' | 'none';
    artStyle: string;
    slideCount: number;
  }) => void;
}

type ImageSource = 'ai' | 'unsplash' | 'none';
type StyleTab = 'suggested' | 'photo' | 'illustration' | 'abstract';

interface ThemeDefinition {
  id: string;
  name: string;
  preset: VisualThemePreset;
}

interface ImageSourceOption {
  id: ImageSource;
  label: string;
  description: string;
  icon: typeof Sparkles;
}

interface ArtStyleDefinition {
  id: string;
  label: string;
  selectable: boolean;
  renderCard: (selected: boolean) => React.ReactNode;
}

const VISUAL_THEME_ORDER = [
  'corporate-modern',
  'healthcare-tech',
  'chimney-smoke',
  'atacama',
  'finesse',
  'piano',
  'coal',
  'leimoon',
  'eco-sustain',
  'bold-agency',
] as const;

const THEMES: ThemeDefinition[] = VISUAL_THEME_ORDER.map((id) => ({
  id,
  name: VISUAL_THEME_PRESETS[id].name,
  preset: VISUAL_THEME_PRESETS[id],
}));

function ThemeMiniSlide({ preset }: { preset: VisualThemePreset }) {
  const [bg, text, accent] = preset.colorPalette;
  const isDark = preset.backgroundMode === 'dark';
  const headingFont =
    preset.fontPairing.heading === 'Lora' ? 'font-serif' : 'font-sans tracking-tight';

  const content = (
    <div className="relative flex h-full w-full overflow-hidden" style={{ backgroundColor: bg }}>
      <div
        className="absolute bottom-0 right-0 top-0 w-[36%]"
        style={{
          background: isDark
            ? `linear-gradient(160deg, ${accent}40 0%, transparent 70%)`
            : `linear-gradient(160deg, ${accent}28 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 flex flex-1 flex-col justify-center px-[12%] py-[10%]">
        <p
          className={cn('text-[11px] font-semibold leading-tight sm:text-[12px]', headingFont)}
          style={{ color: text }}
        >
          Title
        </p>
        <p
          className="mt-[5%] text-[7px] leading-snug sm:text-[8px]"
          style={{ color: text, opacity: isDark ? 0.75 : 0.65 }}
        >
          Body &amp;{' '}
          <span style={{ color: accent, textDecoration: 'underline', textUnderlineOffset: '1px' }}>
            link
          </span>
        </p>
        <div className="mt-[8%] h-[2px] w-[30%] rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </div>
  );

  if (preset.id === 'chimney-smoke') {
    return (
      <div className="h-full w-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07),inset_0_2px_12px_rgba(0,0,0,0.05)]">
        {content}
      </div>
    );
  }

  if (preset.id === 'atacama') {
    return (
      <div
        className="h-full w-full"
        style={{ background: `linear-gradient(145deg, ${bg} 0%, #1a1a1a 100%)` }}
      >
        {content}
      </div>
    );
  }

  if (preset.id === 'piano') {
    return (
      <div className="flex h-full w-full items-stretch bg-white p-[5%]">
        <div className="flex flex-1 border-[2.5px] border-black">{content}</div>
      </div>
    );
  }

  if (preset.id === 'coal') {
    return (
      <div className="h-full w-full border border-[#0f0f0f]" style={{ backgroundColor: bg }}>
        {content}
      </div>
    );
  }

  return content;
}

const IMAGE_SOURCE_OPTIONS: ImageSourceOption[] = [
  {
    id: 'ai',
    label: 'AI Images',
    description: 'Generate unique visuals using AI',
    icon: Sparkles,
  },
  {
    id: 'unsplash',
    label: 'Unsplash',
    description: 'Search millions of real stock photos',
    icon: ImageIcon,
  },
  {
    id: 'none',
    label: 'No Images',
    description: 'Text-only slides, no visuals',
    icon: ImageOff,
  },
];

const STYLE_TABS: { id: StyleTab; label: string }[] = [
  { id: 'suggested', label: 'Suggested' },
  { id: 'photo', label: 'Photo' },
  { id: 'illustration', label: 'Illustration' },
  { id: 'abstract', label: 'Abstract' },
];

const ART_STYLES: ArtStyleDefinition[] = [
  {
    id: 'scene',
    label: 'Scene',
    selectable: true,
    renderCard: () => (
      <div className="h-full w-full bg-gradient-to-br from-blue-800 via-blue-600 to-teal-500" />
    ),
  },
  {
    id: 'photo',
    label: 'Photo',
    selectable: true,
    renderCard: () => (
      <div className="h-full w-full bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600" />
    ),
  },
  {
    id: 'still-life',
    label: 'Still life',
    selectable: true,
    renderCard: () => (
      <div className="h-full w-full bg-gradient-to-br from-gray-400 via-slate-400 to-blue-400" />
    ),
  },
  {
    id: 'spot-color',
    label: 'Spot Color',
    selectable: true,
    renderCard: () => (
      <div className="relative h-full w-full bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500">
        <div className="absolute bottom-2 right-2 h-4 w-4 rounded-sm bg-red-500 shadow-sm" />
      </div>
    ),
  },
  {
    id: 'custom',
    label: 'Custom',
    selectable: true,
    renderCard: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <Plus className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
      </div>
    ),
  },
  {
    id: 'view-more',
    label: 'View more',
    selectable: false,
    renderCard: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-100">
        <Grid3X3 className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
        <span className="text-[9px] text-gray-400">View more</span>
      </div>
    ),
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-gray-900">{children}</p>;
}

export default function VisualsConfig({ initialSlideCount, onGenerate }: VisualsConfigProps) {
  const { plan, loading: creditsLoading } = useCredits();
  const isFree = !creditsLoading && (plan === 'free' || !plan);

  const [selectedSlideCount, setSelectedSlideCount] = useState(() =>
    nearestValidSlideCount(initialSlideCount || DEFAULT_SLIDE_COUNT),
  );
  const [selectedTheme, setSelectedTheme] = useState('chimney-smoke');
  const [selectedImageSource, setSelectedImageSource] = useState<ImageSource>('ai');
  const [selectedArtStyle, setSelectedArtStyle] = useState('scene');
  const [activeStyleTab, setActiveStyleTab] = useState<StyleTab>('suggested');
  const [imageDropdownOpen, setImageDropdownOpen] = useState(false);

  const imageDropdownRef = useRef<HTMLDivElement>(null);

  const activeImageSource =
    IMAGE_SOURCE_OPTIONS.find((option) => option.id === selectedImageSource) ??
    IMAGE_SOURCE_OPTIONS[0];

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (imageDropdownRef.current && !imageDropdownRef.current.contains(event.target as Node)) {
      setImageDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!imageDropdownOpen) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [imageDropdownOpen, handleClickOutside]);

  useEffect(() => {
    setSelectedSlideCount(nearestValidSlideCount(initialSlideCount || DEFAULT_SLIDE_COUNT));
  }, [initialSlideCount]);

  const handleGenerate = () => {
    onGenerate({
      theme: selectedTheme,
      imageSource: selectedImageSource,
      artStyle: selectedArtStyle,
      slideCount: selectedSlideCount,
    });
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-6 pb-24 pt-10">
        {/* Slide count */}
        <section className="mb-8">
          <SectionLabel>Slides</SectionLabel>
          <p className="mb-3 mt-1 text-sm text-gray-500">
            Choose how many cards to generate for this deck.
          </p>
          <SlideCountDropdown
            variant="panel"
            slideCount={selectedSlideCount}
            onChange={setSelectedSlideCount}
            isFree={isFree}
          />
        </section>

        {/* Theme */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <SectionLabel>Theme</SectionLabel>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              View more
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Use one of our popular themes below or view more.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;

              return (
                <div key={theme.id} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={cn(
                      'group relative w-full cursor-pointer overflow-hidden rounded-xl bg-gray-200/60 p-[3px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : 'hover:shadow-md',
                    )}
                    aria-pressed={isSelected}
                    aria-label={`Select ${theme.name} theme`}
                  >
                    <div className="aspect-video w-full overflow-hidden rounded-[9px] shadow-sm">
                      <ThemeMiniSlide preset={theme.preset} />
                    </div>
                  </button>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      {theme.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">{theme.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Image source */}
        <section className="mb-8">
          <SectionLabel>Image source</SectionLabel>

          <div ref={imageDropdownRef} className="relative mt-3">
            <button
              type="button"
              onClick={() => setImageDropdownOpen((open) => !open)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-expanded={imageDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="flex items-center gap-3">
                <activeImageSource.icon className="h-5 w-5 text-gray-700" strokeWidth={1.75} />
                <span className="text-sm font-medium text-gray-900">{activeImageSource.label}</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform duration-200',
                  imageDropdownOpen && 'rotate-180',
                )}
                strokeWidth={2}
              />
            </button>

            {imageDropdownOpen && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
              >
                {IMAGE_SOURCE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = selectedImageSource === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        setSelectedImageSource(option.id);
                        setImageDropdownOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-gray-700" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                        <span className="block text-xs text-gray-500">{option.description}</span>
                      </span>
                      {isActive && (
                        <Check className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Art style */}
        <section className="mb-8">
          <SectionLabel>Art style</SectionLabel>

          <div className="mt-3 flex flex-wrap gap-2">
            {STYLE_TABS.map((tab) => {
              const isActive = activeStyleTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveStyleTab(tab.id)}
                  className={cn(
                    'cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800',
                  )}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ART_STYLES.map((style) => {
              const isSelected = selectedArtStyle === style.id;

              return (
                <button
                  key={style.id}
                  type="button"
                  disabled={!style.selectable}
                  onClick={() => {
                    if (style.selectable) setSelectedArtStyle(style.id);
                  }}
                  className={cn(
                    'relative shrink-0 cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    style.selectable ? 'hover:opacity-90' : 'cursor-default',
                  )}
                  aria-pressed={isSelected}
                  aria-label={style.label}
                >
                  <div
                    className={cn(
                      'relative h-[110px] w-[90px] overflow-hidden rounded-xl',
                      isSelected && 'ring-2 ring-blue-600 ring-offset-1',
                    )}
                  >
                    {style.renderCard(isSelected)}

                    {isSelected && style.selectable && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {style.id !== 'view-more' && (
                    <p className="mt-1.5 text-center text-xs text-gray-600">{style.label}</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-500">
            {selectedSlideCount} card{selectedSlideCount !== 1 ? 's' : ''} total
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={2} />
            Generate
          </button>
        </div>
      </footer>
    </div>
  );
}
