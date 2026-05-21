'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { SLIDE_TRANSITION_OPTIONS } from '@/lib/presentationMotion';
import type { SlideTransition } from '@/types';
import { Palette, Type, Sparkles, Check, RefreshCw } from 'lucide-react';
import { ColorPicker } from './ColorPicker';
import { EDITOR_GOOGLE_FONTS } from '@/lib/editor-fonts';

// ── Preset themes ─────────────────────────────────────────────────────────────
const STYLE_MODES: { id: string; label: string }[] = [
  { id: 'apple_keynote', label: 'Apple Keynote' },
  { id: 'startup_pitch', label: 'Startup Pitch' },
  { id: 'minimal_dark', label: 'Minimal Dark' },
  { id: 'glassmorphism', label: 'Glass' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'editorial', label: 'Editorial' },
];

const THEMES = [
  { name: 'Midnight',  palette: ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'], preview: ['#05050A', '#38BDF8'] },
  { name: 'Ocean',     palette: ['#0A1628', '#FFFFFF', '#3B82F6', '#93C5FD'], preview: ['#0A1628', '#3B82F6'] },
  { name: 'Ember',     palette: ['#0F0A00', '#FFFFFF', '#F97316', '#FED7AA'], preview: ['#0F0A00', '#F97316'] },
  { name: 'Forest',    palette: ['#071A0F', '#FFFFFF', '#22C55E', '#BBF7D0'], preview: ['#071A0F', '#22C55E'] },
  { name: 'Rose',      palette: ['#130A10', '#FFFFFF', '#EC4899', '#FBCFE8'], preview: ['#130A10', '#EC4899'] },
  { name: 'Slate',     palette: ['#0F172A', '#FFFFFF', '#64748B', '#CBD5E1'], preview: ['#0F172A', '#64748B'] },
  { name: 'Gold',      palette: ['#0D0900', '#FFFFFF', '#EAB308', '#FEF08A'], preview: ['#0D0900', '#EAB308'] },
  { name: 'Arctic',    palette: ['#F8FAFC', '#0F172A', '#0EA5E9', '#E0F2FE'], preview: ['#F8FAFC', '#0EA5E9'] },
];

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

// ── Color swatch editor ───────────────────────────────────────────────────────
const PALETTE_LABELS = ['Background', 'Text', 'Accent', 'Secondary'];


// ── Main Design Panel ─────────────────────────────────────────────────────────
export function DesignPanel() {
  const { presentation, updatePresentation, currentSlideIndex, updateSlide } = usePresentationStore();
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
    updatePresentation({ colorPalette: theme.palette });
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
      <FontLoader fonts={[fontPairing.heading, fontPairing.body]} />
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-primary" />
          <span className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em]">Design Studio</span>
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
                <label className="text-[8px] font-black text-black/25 uppercase tracking-widest block mb-1">
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
                  <label className="text-[8px] font-black text-black/25 uppercase tracking-widest block mb-1">
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
                  <label className="text-[8px] font-black text-black/25 uppercase tracking-widest block mb-1">
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

            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3 mt-4">Preset Themes</p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((theme) => {
                const active = palette[0] === theme.palette[0] && palette[2] === theme.palette[2];
                return (
                  <button
                    key={theme.name}
                    onClick={() => applyTheme(theme)}
                    className={`relative flex flex-col items-start gap-2 p-3 rounded-xl border-2 transition-all hover:shadow-md text-left ${
                      active
                        ? 'border-primary shadow-primary/10 shadow-md'
                        : 'border-black/[0.06] hover:border-black/15'
                    }`}
                  >
                    {/* Color preview */}
                    <div className="flex gap-1 w-full">
                      <div className="h-8 flex-1 rounded-lg" style={{ background: theme.preview[0] }} />
                      <div className="h-8 w-8 rounded-lg shrink-0" style={{ background: theme.preview[1] }} />
                    </div>
                    <span className="text-[11px] font-bold text-black/70">{theme.name}</span>
                    {active && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
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
