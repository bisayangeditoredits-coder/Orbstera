'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { X, Loader2, ArrowRight, Check } from 'lucide-react';

const THEMES = [
  {
    id: 'dark',
    label: 'Obsidian',
    description: 'Deep black with violet',
    bg: '#05050A',
    text: '#FFFFFF',
    subtext: '#A390FF',
    accent: '#7B61FF',
    palette: ['#05050A', '#FFFFFF', '#7B61FF', '#A390FF'],
  },
  {
    id: 'light',
    label: 'Pearl',
    description: 'Clean white & blue',
    bg: '#FFFFFF',
    text: '#0F172A',
    subtext: '#0009fa',
    accent: '#0009fa',
    palette: ['#FFFFFF', '#0F172A', '#0009fa', '#93C5FD'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Navy with indigo',
    bg: '#0D0D1A',
    text: '#E8E8FF',
    subtext: '#A5B4FC',
    accent: '#6366F1',
    palette: ['#0D0D1A', '#E8E8FF', '#6366F1', '#A5B4FC'],
  },
  {
    id: 'ocean',
    label: 'Abyss',
    description: 'Dark teal & sky blue',
    bg: '#061B2E',
    text: '#E0F2FE',
    subtext: '#7DD3FC',
    accent: '#0EA5E9',
    palette: ['#061B2E', '#E0F2FE', '#0EA5E9', '#7DD3FC'],
  },
  {
    id: 'ember',
    label: 'Ember',
    description: 'Warm dark & orange',
    bg: '#1A0900',
    text: '#FFF7ED',
    subtext: '#FED7AA',
    accent: '#F97316',
    palette: ['#1A0900', '#FFF7ED', '#F97316', '#FED7AA'],
  },
  {
    id: 'forest',
    label: 'Aurora',
    description: 'Forest & emerald',
    bg: '#0A1A0F',
    text: '#F0FDF4',
    subtext: '#86EFAC',
    accent: '#22C55E',
    palette: ['#0A1A0F', '#F0FDF4', '#22C55E', '#86EFAC'],
  },
] as const;

const CANVAS_W = 1280;
const CANVAS_H = 720;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewDeckModal({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [themeId, setThemeId] = useState<typeof THEMES[number]['id']>('dark');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setError(null);
      setCreating(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const selected = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const handleCreate = async () => {
    const trimmed = title.trim() || 'Untitled Presentation';
    setCreating(true);
    setError(null);
    const now = new Date().toISOString();
    const slideId = `slide-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const deckId = `deck-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const deck = {
      id: deckId,
      title: trimmed,
      theme: selected.id,
      colorPalette: [...selected.palette],
      fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
      animationStyle: 'cinematic-reveal',
      source: 'manual' as const,
      createdAt: now,
      updatedAt: now,
      slides: [{
        id: slideId,
        type: 'hero',
        title: trimmed,
        subtitle: '',
        bullets: [],
        elements: [
          { id: `bg-${slideId}`, type: 'shape', shapeType: 'rect', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: 0, visible: true, shapeStyle: { fill: selected.bg, stroke: 'transparent', strokeWidth: 0 } },
          { id: `ttl-${slideId}`, type: 'text', x: 80, y: CANVAS_H / 2 - 64, width: CANVAS_W - 160, height: 128, content: trimmed, zIndex: 1, visible: true, textStyle: { fontFamily: 'Space Grotesk', fontSize: 72, fontWeight: 'bold', color: selected.text, textAlign: 'center', lineHeight: 1.15 } },
          { id: `sub-${slideId}`, type: 'text', x: 200, y: CANVAS_H / 2 + 76, width: CANVAS_W - 400, height: 60, content: 'Click to add a subtitle', zIndex: 2, visible: true, textStyle: { fontFamily: 'Inter', fontSize: 24, fontWeight: 'normal', color: selected.subtext, textAlign: 'center', lineHeight: 1.5 } },
        ],
      }],
    };

    try {
      const res = await fetch('/api/presentations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deck), cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `Error ${res.status}`);
      onClose();
      router.push(`/editor?id=${encodeURIComponent(deckId)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
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
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[600] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
          onClick={() => !creating && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-white w-full mx-4 flex overflow-hidden"
            style={{
              maxWidth: 780,
              borderRadius: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ─── Left Column: Form ─────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between px-8 pt-8 pb-6">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-neutral-400 mb-1.5">
                    New Project
                  </p>
                  <h2 className="text-[22px] font-bold text-neutral-900 leading-tight tracking-tight">
                    Create a presentation
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={creating}
                  className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-neutral-100 mx-8" />

              {/* Fields */}
              <div className="px-8 py-6 flex flex-col gap-6 flex-1">
                {/* Title */}
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-2">
                    Title
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) handleCreate(); }}
                    disabled={creating}
                    placeholder="e.g. Q3 Marketing Strategy"
                    className="w-full text-[14px] font-medium text-slate-900 placeholder:text-slate-400 bg-white outline-none transition-all border border-slate-200 rounded-lg px-3.5 py-2.5 focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-3">
                    Color style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((t) => {
                      const active = themeId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={creating}
                          onClick={() => setThemeId(t.id)}
                          className={`relative group text-left p-2 rounded-xl transition-all duration-150 outline-none border ${
                            active ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {/* Mini slide — exact colors */}
                          <div
                            className="w-full rounded-lg overflow-hidden mb-2 relative"
                            style={{ aspectRatio: '16/9', background: t.bg }}
                          >
                            {/* radial glow */}
                            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 60% 40%, ${t.accent}30 0%, transparent 65%)` }} />
                            {/* Text lines */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                              <div className="h-[5px] rounded-full w-3/4" style={{ background: t.text, opacity: 0.88 }} />
                              <div className="h-[3px] rounded-full w-1/2" style={{ background: t.subtext, opacity: 0.7 }} />
                            </div>
                            {/* Accent bottom bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-[2.5px]" style={{ background: t.accent }} />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold" style={{ color: active ? t.accent : '#6b7280' }}>
                              {t.label}
                            </span>
                            {active && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-primary"
                              >
                                <Check size={10} className="text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                    {error}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={creating}
                  className="px-4 py-2.5 text-[13px] font-medium text-neutral-500 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !title.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98] bg-primary hover:bg-primaryHover shadow-sm"
                >
                  {creating ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                  <span>{creating ? 'Creating…' : 'Create Presentation'}</span>
                  {!creating && <ArrowRight size={13} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {/* ─── Right Column: Live Preview ────────── */}
            <div
              className="w-[220px] shrink-0 flex flex-col items-center justify-center gap-6 p-7 bg-slate-50 border-l border-slate-100"
            >
              {/* Large accurate slide preview */}
              <div className="w-full">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-3 text-center">
                  Preview
                </p>
                <motion.div
                  key={themeId}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="w-full rounded-xl overflow-hidden relative shadow-sm border border-slate-200"
                  style={{
                    aspectRatio: '16/9',
                    background: selected.bg,
                  }}
                >
                  {/* Accurate gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(ellipse at 65% 35%, ${selected.accent}28 0%, transparent 60%)` }}
                  />
                  {/* Title + subtitle */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
                    <div
                      className="text-[9px] font-bold leading-snug tracking-tight"
                      style={{ color: selected.text, opacity: 0.92, maxWidth: '85%' }}
                    >
                      {title.trim() || 'Your Presentation'}
                    </div>
                    <div
                      className="text-[6px] leading-snug"
                      style={{ color: selected.subtext, opacity: 0.75 }}
                    >
                      Subtitle goes here
                    </div>
                  </div>
                  {/* Bottom accent bar */}
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: 3, background: selected.accent, opacity: 0.9 }}
                  />
                </motion.div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-neutral-200" />

              {/* Palette + info */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {selected.palette.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-full border border-black/10"
                      style={{
                        width: i === 0 ? 20 : 15,
                        height: i === 0 ? 20 : 15,
                        background: c,
                        boxShadow: i === 2 ? `0 0 10px ${c}70` : undefined,
                      }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <p
                    className="text-[12px] font-semibold tracking-tight"
                    style={{ color: selected.accent }}
                  >
                    {selected.label}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{selected.description}</p>
                </div>
              </div>

              {/* Canvas size info */}
              <div
                className="w-full rounded-lg px-3 py-2.5 text-center"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <p className="text-[10px] font-medium text-neutral-500">Standard 16:9</p>
                <p className="text-[11px] font-semibold text-neutral-700 mt-0.5">1280 Ã— 720 px</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
