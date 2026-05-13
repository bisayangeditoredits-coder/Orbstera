'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  X, FileText, Loader2, ChevronRight, Monitor,
  Presentation, LayoutGrid, Sun, Moon,
} from 'lucide-react';

// ── Preset themes ─────────────────────────────────────────────────────────────
const THEMES = [
  {
    id: 'dark',
    label: 'Dark',
    icon: Moon,
    bg: '#05050A',
    palette: ['#05050A', '#FFFFFF', '#7B61FF', '#A390FF'],
    preview: 'bg-[#05050A]',
    accent: '#7B61FF',
  },
  {
    id: 'light',
    label: 'Light',
    icon: Sun,
    bg: '#FFFFFF',
    palette: ['#FFFFFF', '#0F0F1A', '#3B82F6', '#93C5FD'],
    preview: 'bg-white border border-neutral-200',
    accent: '#3B82F6',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    icon: Moon,
    bg: '#0D0D1A',
    palette: ['#0D0D1A', '#E8E8FF', '#6366F1', '#A5B4FC'],
    preview: 'bg-[#0D0D1A]',
    accent: '#6366F1',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    icon: LayoutGrid,
    bg: '#061B2E',
    palette: ['#061B2E', '#E0F2FE', '#0EA5E9', '#7DD3FC'],
    preview: 'bg-[#061B2E]',
    accent: '#0EA5E9',
  },
  {
    id: 'ember',
    label: 'Ember',
    icon: LayoutGrid,
    bg: '#1A0900',
    palette: ['#1A0900', '#FFF7ED', '#F97316', '#FED7AA'],
    preview: 'bg-[#1A0900]',
    accent: '#F97316',
  },
  {
    id: 'forest',
    label: 'Forest',
    icon: LayoutGrid,
    bg: '#0A1A0F',
    palette: ['#0A1A0F', '#F0FDF4', '#22C55E', '#86EFAC'],
    preview: 'bg-[#0A1A0F]',
    accent: '#22C55E',
  },
] as const;

// ── Slide size presets ────────────────────────────────────────────────────────
const SIZES = [
  { id: 'widescreen', label: 'Widescreen 16:9', icon: Monitor, w: 1280, h: 720 },
  { id: 'standard',  label: 'Standard 4:3',    icon: Presentation, w: 960,  h: 720 },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewDeckModal({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title,    setTitle]    = useState('Untitled Presentation');
  const [themeId,  setThemeId]  = useState<typeof THEMES[number]['id']>('dark');
  const [sizeId,   setSizeId]   = useState<typeof SIZES[number]['id']>('widescreen');
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Focus & select title text when modal opens
  useEffect(() => {
    if (open) {
      setTitle('Untitled Presentation');
      setError(null);
      setCreating(false);
      setTimeout(() => {
        inputRef.current?.select();
      }, 80);
    }
  }, [open]);

  const selectedTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const selectedSize  = SIZES.find((s) => s.id === sizeId)   ?? SIZES[0];

  const handleCreate = async () => {
    const trimmed = title.trim() || 'Untitled Presentation';
    setCreating(true);
    setError(null);

    // Build a minimal blank presentation with one empty hero slide
    const now = new Date().toISOString();
    const slideId = `slide-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const deckId  = `deck-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    // A single blank title slide with just a title text box
    const blankSlide = {
      id: slideId,
      type: 'hero',
      title: trimmed,
      subtitle: '',
      bullets: [],
      elements: [
        // Background rectangle
        {
          id: `el-bg-${slideId}`,
          type: 'shape',
          shapeType: 'rect',
          x: 0, y: 0,
          width: selectedSize.w,
          height: selectedSize.h,
          zIndex: 0,
          visible: true,
          shapeStyle: { fill: selectedTheme.bg, stroke: 'transparent', strokeWidth: 0 },
        },
        // Title text element
        {
          id: `el-title-${slideId}`,
          type: 'text',
          x: 80,
          y: selectedSize.h / 2 - 60,
          width: selectedSize.w - 160,
          height: 120,
          content: trimmed,
          zIndex: 1,
          visible: true,
          textStyle: {
            fontFamily: 'Space Grotesk',
            fontSize: 72,
            fontWeight: 'bold',
            color: selectedTheme.palette[1],
            textAlign: 'center',
            lineHeight: 1.15,
          },
        },
        // Subtitle placeholder
        {
          id: `el-sub-${slideId}`,
          type: 'text',
          x: 200,
          y: selectedSize.h / 2 + 70,
          width: selectedSize.w - 400,
          height: 60,
          content: 'Click to add a subtitle',
          zIndex: 2,
          visible: true,
          textStyle: {
            fontFamily: 'Inter',
            fontSize: 24,
            fontWeight: 'normal',
            color: selectedTheme.palette[3] ?? selectedTheme.palette[1],
            textAlign: 'center',
            lineHeight: 1.5,
          },
        },
      ],
    };

    const deck = {
      id: deckId,
      title: trimmed,
      theme: selectedTheme.id,
      colorPalette: selectedTheme.palette,
      fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
      animationStyle: 'cinematic-reveal',
      source: 'manual' as const,
      slides: [blankSlide],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const res = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deck),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : `Failed to create (${res.status})`);
      }

      // Navigate to the editor with the new deck
      onClose();
      router.push(`/editor?id=${encodeURIComponent(deckId)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !creating && onClose()}
        >
          <motion.div
            initial={{ scale: 0.93, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.93, y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="w-full max-w-2xl bg-[#FAFAFA] rounded-2xl shadow-2xl border border-black/[0.07] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText size={16} className="text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-neutral-900 leading-tight">New Presentation</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Start with a blank canvas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.05] transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-col md:flex-row min-h-0">
              {/* Left — settings */}
              <div className="flex-1 p-6 space-y-6 min-w-0">

                {/* Project name */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 mb-2">
                    Project name
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                    disabled={creating}
                    placeholder="My Presentation"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/[0.1] bg-white text-[14px] font-semibold text-neutral-900 placeholder:text-neutral-300 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
                  />
                </div>

                {/* Slide size */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 mb-2">
                    Slide size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SIZES.map((s) => {
                      const Icon = s.icon;
                      const active = sizeId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSizeId(s.id)}
                          disabled={creating}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[12px] font-semibold transition-all ${
                            active
                              ? 'border-primary/40 bg-primary/6 text-primary shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                              : 'border-black/[0.08] bg-white text-neutral-600 hover:border-black/15 hover:bg-neutral-50'
                          }`}
                        >
                          <Icon size={14} strokeWidth={1.75} className={active ? 'text-primary' : 'text-neutral-400'} />
                          <span className="truncate">{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 mb-2">
                    Color theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((t) => {
                      const active = themeId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThemeId(t.id)}
                          disabled={creating}
                          className={`group relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                            active
                              ? 'border-primary/40 bg-primary/6 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                              : 'border-black/[0.07] bg-white hover:border-black/15 hover:bg-neutral-50'
                          }`}
                        >
                          {/* Mini slide preview */}
                          <div
                            className="w-full aspect-video rounded-lg overflow-hidden flex items-center justify-center relative"
                            style={{ background: t.bg }}
                          >
                            {/* Accent bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: t.accent }} />
                            {/* Fake slide lines */}
                            <div className="flex flex-col gap-1 items-center opacity-60">
                              <div className="w-10 h-1.5 rounded-full" style={{ background: t.palette[1], opacity: 0.9 }} />
                              <div className="w-7 h-1 rounded-full" style={{ background: t.palette[1], opacity: 0.5 }} />
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold ${active ? 'text-primary' : 'text-neutral-500'}`}>
                            {t.label}
                          </span>
                          {active && (
                            <motion.div
                              layoutId="theme-check"
                              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm"
                            >
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-[12px] text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
                    {error}
                  </p>
                )}
              </div>

              {/* Right — preview */}
              <div className="hidden md:flex flex-col items-center justify-center gap-4 px-6 py-8 border-l border-black/[0.06] w-[200px] shrink-0 bg-neutral-100/60">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">Preview</p>
                {/* Slide preview */}
                <div
                  className="w-full aspect-video rounded-xl overflow-hidden shadow-md border border-white/30 relative flex items-center justify-center"
                  style={{ background: selectedTheme.bg }}
                >
                  {/* Accent bottom bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: selectedTheme.accent }} />
                  {/* Fake title */}
                  <div className="flex flex-col items-center gap-2 px-3 text-center">
                    <div
                      className="h-2 rounded-full w-24 opacity-90"
                      style={{ background: selectedTheme.palette[1] }}
                    />
                    <div
                      className="h-1 rounded-full w-16 opacity-50"
                      style={{ background: selectedTheme.palette[1] }}
                    />
                  </div>
                </div>

                {/* Color dots */}
                <div className="flex gap-1.5">
                  {selectedTheme.palette.map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 font-medium text-center">{selectedTheme.label} theme</p>
                <p className="text-[10px] text-neutral-400 font-medium text-center">{selectedSize.label}</p>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-black/[0.06] bg-white">
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-b from-[#5B7CFF] to-primary text-white text-[13px] font-bold shadow-[0_4px_14px_-4px_rgba(59,130,246,0.55)] hover:from-primary hover:to-[#3d5ef0] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ChevronRight size={14} />
                )}
                {creating ? 'Creating…' : 'Create Presentation'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
