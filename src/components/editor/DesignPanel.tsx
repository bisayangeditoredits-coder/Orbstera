'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Palette, Type, Sparkles, Check, RefreshCw } from 'lucide-react';
import { ColorPicker } from './ColorPicker';

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

// ── Font pairings ─────────────────────────────────────────────────────────────
const FONT_PAIRINGS = [
  { name: 'Modern',    heading: 'Space Grotesk', body: 'Inter'       },
  { name: 'Editorial', heading: 'Playfair Display', body: 'Lato'     },
  { name: 'Tech',      heading: 'JetBrains Mono', body: 'Inter'      },
  { name: 'Classic',   heading: 'Georgia', body: 'Palatino Linotype' },
  { name: 'Bold',      heading: 'Outfit', body: 'Roboto'             },
  { name: 'Minimal',   heading: 'DM Sans', body: 'DM Sans'           },
];

// ── Color swatch editor ───────────────────────────────────────────────────────
const PALETTE_LABELS = ['Background', 'Text', 'Accent', 'Secondary'];


// ── Main Design Panel ─────────────────────────────────────────────────────────
export function DesignPanel() {
  const { presentation, updatePresentation } = usePresentationStore();
  const [activeTab, setActiveTab] = useState<'theme' | 'colors' | 'fonts'>('theme');

  if (!presentation) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-center px-6 opacity-30">
        <Palette size={28} className="mb-2" />
        <p className="text-[11px] font-bold uppercase tracking-widest">Generate a presentation first</p>
      </div>
    );
  }

  const palette     = presentation.colorPalette || ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'];
  const fontPairing = presentation.fontPairing   || { heading: 'Space Grotesk', body: 'Inter' };

  const updateColor = (index: number, color: string) => {
    const next = [...palette];
    next[index] = color;
    updatePresentation({ colorPalette: next });
  };

  const applyTheme = (theme: typeof THEMES[0]) => {
    updatePresentation({ colorPalette: theme.palette });
  };

  const applyFont = (pair: typeof FONT_PAIRINGS[0]) => {
    updatePresentation({ fontPairing: { heading: pair.heading, body: pair.body } });
  };

  return (
    <div className="flex flex-col h-full">
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
      <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">

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
            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3">Preset Themes</p>
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

        {/* ── Font pairings ─────────────────────────────────────────── */}
        {activeTab === 'fonts' && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest mb-3">Font Pairings</p>
            {FONT_PAIRINGS.map((pair) => {
              const active =
                fontPairing.heading === pair.heading && fontPairing.body === pair.body;
              return (
                <button
                  key={pair.name}
                  onClick={() => applyFont(pair)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    active
                      ? 'border-primary bg-primary/[0.03]'
                      : 'border-black/[0.05] hover:border-black/10'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-[13px] font-bold truncate ${active ? 'text-primary' : 'text-black/80'}`}>
                      {pair.name}
                    </p>
                    <p className="text-[10px] text-black/35 mt-0.5 truncate">
                      {pair.heading} / {pair.body}
                    </p>
                  </div>
                  {active && <Check size={15} className="text-primary shrink-0" />}
                </button>
              );
            })}

            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                Font changes affect new AI-generated elements. Apply via <span className="font-black">Regenerate</span> to update all slides.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
