'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import { SLIDE_TRANSITION_OPTIONS } from '@/lib/presentationMotion';
import type { SlideTransition } from '@/types';
import { Palette, Type, Sparkles, Check, RefreshCw } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { EDITOR_GOOGLE_FONTS } from '@/lib/editor-fonts';
import { PRESENTATION_THEMES, PALETTE_LABELS } from '@/lib/presentation-themes';

// ── Preset themes ─────────────────────────────────────────────────────────────
const STYLE_MODES: { id: string; label: string }[] = [
  { id: 'apple_keynote', label: 'Apple Keynote' },
  { id: 'startup_pitch', label: 'Startup Pitch' },
  { id: 'minimal_dark', label: 'Minimal Dark' },
  { id: 'glassmorphism', label: 'Glass' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'editorial', label: 'Editorial' },
];

const THEMES = PRESENTATION_THEMES;

// Component to dynamically load Google Fonts
function FontLoader({ fonts }: { fonts: string[] }) {
  useEffect(() => {
    const uniqueFonts = Array.from(new Set(fonts.filter(Boolean)));
    if (uniqueFonts.length === 0) return;
    
    const familyString = uniqueFonts.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800`).join('&');
    const url = `https://fonts.googleapis.com/css2?${familyString}&display=swap`;
    
    let link = document.getElementById('google-fonts-link') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = 'google-fonts-link';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = url;
  }, [fonts]);
  
  return null;
}

// ── Main Design Panel ─────────────────────────────────────────────────────────
export function DesignPanel() {
  const { presentation, updatePresentation, currentSlideIndex, updateSlide } = usePresentationStore(
    useShallow((s) => ({
      presentation: s.presentation,
      updatePresentation: s.updatePresentation,
      currentSlideIndex: s.currentSlideIndex,
      updateSlide: s.updateSlide,
    }))
  );
  const [activeTab, setActiveTab] = useState<'theme' | 'colors' | 'fonts'>('theme');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => { setMounted(true); }, []);

  if (!presentation || !mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-6 opacity-30">
        <Palette size={28} className="mb-2" />
        <p className="text-[11px] font-bold uppercase tracking-widest">Generate a presentation first</p>
      </div>
    );
  }

  const palette     = presentation.colorPalette || ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'];
  const fontPairing = presentation.fontPairing   || { heading: 'Space Grotesk', body: 'Inter' };
  const currentSlide = presentation.slides[currentSlideIndex];

  const updateColor = (index: number, color: string) => {
    const next = [...palette];
    next[index] = color;
    updatePresentation({ colorPalette: next });
  };

  const applyTheme = (theme: typeof THEMES[0]) => {
    const oldPalette = palette;
    const newPalette = theme.palette;
    
    // Update global palette
    updatePresentation({ colorPalette: newPalette });

    // Globally update all elements to match the new theme mapping
    presentation.slides.forEach((slide) => {
      const newElements = (slide.elements || []).map(el => {
        let updated = { ...el };
        // Text Color mapping
        if (updated.type === 'text' && updated.textStyle) {
          const c = updated.textStyle.color;
          let newColor = c;
          if (c === oldPalette[1]) newColor = newPalette[1]; // Primary text
          else if (c === oldPalette[2]) newColor = newPalette[2]; // Accent
          else if (c === oldPalette[3]) newColor = newPalette[3]; // Secondary text
          else if (c === oldPalette[0]) newColor = newPalette[0]; // BG colored text
          updated.textStyle = { ...updated.textStyle, color: newColor };
        }
        // Shape Fill mapping
        if (updated.type === 'shape' && updated.shapeStyle) {
          const f = updated.shapeStyle.fill;
          let newFill = f;
          if (f === oldPalette[0]) newFill = newPalette[0];
          else if (f === oldPalette[1]) newFill = newPalette[1];
          else if (f === oldPalette[2]) newFill = newPalette[2];
          else if (f === oldPalette[3]) newFill = newPalette[3];
          updated.shapeStyle = { ...updated.shapeStyle, fill: newFill };
        }
        return updated;
      });
      updateSlide(slide.id, { elements: newElements }, false);
    });
    // Trigger history save after loop
    updatePresentation({});
  };

  const updateFont = (type: 'heading' | 'body', font: string) => {
    updatePresentation({ 
      fontPairing: { 
        ...fontPairing, 
        [type]: font 
      } 
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-primary" />
          <span className="text-[10px] font-bold text-black/30 uppercase tracking-[0.3em]">Design Studio</span>
        </div>
        <h2 className="text-[18px] font-bold text-black tracking-tight">Appearance</h2>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1 px-4 pt-3 pb-2">
        {(['theme', 'colors', 'fonts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-primary text-white shadow-sm'
                : 'text-black/40 hover:text-black/70 hover:bg-black/[0.04]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-8 pb-[max(2rem,env(safe-area-inset-bottom,0px))] custom-scrollbar">

        {/* ── Theme presets ────────────────────────────────────────── */}
        {activeTab === 'theme' && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-2">Style mode</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {STYLE_MODES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updatePresentation({ styleMode: s.id })}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                    presentation.styleMode === s.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-black/[0.06] text-black/50 hover:border-black/15'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="pt-4 mt-2 border-t border-black/[0.06] space-y-3">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Motion</p>
              <div>
                <label className="text-[8px] font-bold text-black/25 uppercase tracking-widest block mb-1">
                  Deck default transition
                </label>
                <select
                  value={presentation.defaultSlideTransition ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updatePresentation({
                      defaultSlideTransition: v ? (v as SlideTransition) : undefined,
                    });
                  }}
                  className="w-full bg-black/[0.02] border border-black/[0.08] rounded-lg px-2 py-2 text-[11px] font-semibold text-black/80 focus:outline-none focus:border-primary/40"
                >
                  <option value="">Auto (per slide)</option>
                  {SLIDE_TRANSITION_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
              {currentSlide && (
                <div>
                  <label className="text-[8px] font-bold text-black/25 uppercase tracking-widest block mb-1">
                    This slide
                  </label>
                  <select
                    value={currentSlide.slideTransition ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateSlide(currentSlide.id, {
                        slideTransition: v ? (v as SlideTransition) : undefined,
                      });
                    }}
                    className="w-full bg-black/[0.02] border border-black/[0.08] rounded-lg px-2 py-2 text-[11px] font-semibold text-black/80 focus:outline-none focus:border-primary/40"
                  >
                    <option value="">Use deck default</option>
                  {SLIDE_TRANSITION_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <div className="mt-2">
                  <label className="text-[8px] font-bold text-black/25 uppercase tracking-widest block mb-1">
                    Transition duration (ms)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={200}
                      max={2000}
                      step={50}
                      className="flex-1 accent-primary h-2"
                      value={currentSlide.slideTransitionDurationMs ?? 620}
                      onChange={(e) =>
                        updateSlide(currentSlide.id, {
                          slideTransitionDurationMs: Number(e.target.value),
                        })
                      }
                    />
                    <span className="text-[10px] font-bold text-black/60 tabular-nums w-12 text-right">
                      {currentSlide.slideTransitionDurationMs ?? 620}
                    </span>
                  </div>
                </div>
                </div>
              )}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-black/20 accent-primary"
                  checked={presentation.cinematicPresenterEffects !== false}
                  onChange={(e) =>
                    updatePresentation({ cinematicPresenterEffects: e.target.checked })
                  }
                />
                <span className="text-[11px] font-semibold text-black/70 group-hover:text-black/90">
                  Cinematic atmosphere in Present mode
                </span>
              </label>
            </div>

            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3 mt-4">1-Click Themes</p>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => {
                const active = palette[0] === theme.palette[0] && palette[2] === theme.palette[2];
                return (
                  <button
                    key={theme.name}
                    onClick={() => applyTheme(theme)}
                    className={`relative flex flex-col items-start gap-2 p-1.5 pb-3 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] text-left overflow-hidden ${
                      active
                        ? 'border-indigo-500 shadow-[0_8px_24px_rgba(99,102,241,0.2)] bg-indigo-50/50'
                        : 'border-transparent bg-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Visual Card Preview */}
                    <div className="flex gap-1 w-full h-16 rounded-xl overflow-hidden p-2" style={{ background: theme.palette[0] }}>
                      <div className="w-1/3 h-full rounded-md opacity-20" style={{ background: theme.palette[2] }} />
                      <div className="flex-1 flex flex-col gap-1.5 mt-1">
                        <div className="h-1.5 w-3/4 rounded-full" style={{ background: theme.palette[1] }} />
                        <div className="h-1 w-1/2 rounded-full" style={{ background: theme.palette[3] || theme.palette[1], opacity: 0.7 }} />
                        <div className="mt-auto h-2 w-1/3 rounded-full" style={{ background: theme.palette[2] }} />
                      </div>
                    </div>
                    
                    <div className="w-full px-2 flex items-center justify-between">
                      <span className={`text-[12px] font-bold ${active ? 'text-indigo-700' : 'text-neutral-700'}`}>
                        {theme.name}
                      </span>
                      {active && <Check size={14} className="text-indigo-500" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Color editor ─────────────────────────────────────────── */}
        {activeTab === 'colors' && (
          <div className="space-y-4 pt-2">
            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">Custom Colors</p>
            {PALETTE_LABELS.map((label, i) => (
              <ColorPicker
                key={label}
                label={label}
                color={palette[i] || '#FFFFFF'}
                onChange={(c) => updateColor(i, c)}
                palettePresets={palette}
              />
            ))}
            <p className="text-[10px] text-black/30 mt-4 leading-relaxed">
              Changes apply instantly to the canvas preview.
            </p>
          </div>
        )}

        {/* ── Typography & Fonts ─────────────────────────────────────────── */}
        {activeTab === 'fonts' && (
          <div className="space-y-4 pt-2">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-2 flex items-start gap-2">
              <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-primary/80 font-semibold leading-relaxed">
                Unlock thousands of free Google Fonts. Changes apply instantly to your canvas.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest block mb-2">
                Heading Font
              </label>
              <select
                value={fontPairing.heading}
                onChange={(e) => updateFont('heading', e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-black/80 shadow-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                style={{ fontFamily: fontPairing.heading }}
              >
                {EDITOR_GOOGLE_FONTS.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest block mb-2">
                Body Font
              </label>
              <select
                value={fontPairing.body}
                onChange={(e) => updateFont('body', e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-black/80 shadow-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                style={{ fontFamily: fontPairing.body }}
              >
                {EDITOR_GOOGLE_FONTS.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                Font changes affect new AI-generated elements automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
