'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, CheckCircle2, Grid3x3 } from 'lucide-react';

// ─── Pattern Definitions ──────────────────────────────────────────────────────
type PatternDef = {
  id: string;
  label: string;
  build: (fg: string, scale: number) => string; // returns <pattern> inner SVG
};

const PATTERNS: PatternDef[] = [
  {
    id: 'dots', label: 'Dots',
    build: (fg, s) => `<circle cx="${s/2}" cy="${s/2}" r="${Math.max(1.5, s/8)}" fill="${fg}"/>`,
  },
  {
    id: 'grid', label: 'Grid',
    build: (fg, s) => `<path d="M ${s} 0 L 0 0 0 ${s}" fill="none" stroke="${fg}" stroke-width="1"/>`,
  },
  {
    id: 'diagonal', label: 'Diagonal',
    build: (fg, s) => `<line x1="0" y1="${s}" x2="${s}" y2="0" stroke="${fg}" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  {
    id: 'crosshatch', label: 'Cross-Hatch',
    build: (fg, s) => `<line x1="0" y1="0" x2="${s}" y2="${s}" stroke="${fg}" stroke-width="1"/>
      <line x1="${s}" y1="0" x2="0" y2="${s}" stroke="${fg}" stroke-width="1"/>`,
  },
  {
    id: 'horizontal', label: 'Lines',
    build: (fg, s) => `<line x1="0" y1="${s/2}" x2="${s}" y2="${s/2}" stroke="${fg}" stroke-width="1.5"/>`,
  },
  {
    id: 'hexagons', label: 'Hexagons',
    build: (fg, s) => {
      const r = s * 0.4;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (60 * i - 30);
        return `${s/2 + r * Math.cos(a)},${s/2 + r * Math.sin(a)}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="${fg}" stroke-width="1.2"/>`;
    },
  },
  {
    id: 'circles', label: 'Circles',
    build: (fg, s) => `<circle cx="${s/2}" cy="${s/2}" r="${s*0.4}" fill="none" stroke="${fg}" stroke-width="1.2"/>`,
  },
  {
    id: 'zigzag', label: 'Zigzag',
    build: (fg, s) => {
      const h = s / 2;
      return `<polyline points="0,${h} ${s/4},0 ${s/2},${h} ${3*s/4},0 ${s},${h}" fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round"/>`;
    },
  },
  {
    id: 'diamonds', label: 'Diamonds',
    build: (fg, s) => {
      const h = s / 2;
      return `<polygon points="${s/2},4 ${s-4},${h} ${s/2},${s-4} 4,${h}" fill="none" stroke="${fg}" stroke-width="1.2"/>`;
    },
  },
  {
    id: 'plus', label: 'Plus',
    build: (fg, s) => {
      const c = s / 2, t = s * 0.3;
      return `<line x1="${c}" y1="${c-t}" x2="${c}" y2="${c+t}" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>
        <line x1="${c-t}" y1="${c}" x2="${c+t}" y2="${c}" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>`;
    },
  },
  {
    id: 'checker', label: 'Checker',
    build: (fg, s) => {
      const h = s / 2;
      return `<rect x="0" y="0" width="${h}" height="${h}" fill="${fg}"/>
        <rect x="${h}" y="${h}" width="${h}" height="${h}" fill="${fg}"/>`;
    },
  },
  {
    id: 'triangles', label: 'Triangles',
    build: (fg, s) => `<polygon points="${s/2},4 ${s-4},${s-4} 4,${s-4}" fill="none" stroke="${fg}" stroke-width="1.2"/>`,
  },
  {
    id: 'waves', label: 'Waves',
    build: (fg, s) => `<path d="M 0 ${s*0.5} Q ${s*0.25} ${s*0.15} ${s*0.5} ${s*0.5} T ${s} ${s*0.5}" fill="none" stroke="${fg}" stroke-width="1.5"/>`,
  },
  {
    id: 'polka', label: 'Polka',
    build: (fg, s) => `<circle cx="${s/2}" cy="${s/2}" r="${s*0.35}" fill="${fg}" opacity="0.6"/>`,
  },
  {
    id: 'topo', label: 'Topography',
    build: (fg, s) => {
      const r1 = s * 0.45, r2 = s * 0.3, r3 = s * 0.15;
      return `<circle cx="${s/2}" cy="${s/2}" r="${r1}" fill="none" stroke="${fg}" stroke-width="1"/>
        <circle cx="${s/2}" cy="${s/2}" r="${r2}" fill="none" stroke="${fg}" stroke-width="1"/>
        <circle cx="${s/2}" cy="${s/2}" r="${r3}" fill="none" stroke="${fg}" stroke-width="1"/>`;
    },
  },
];

function buildPatternSVG(patternId: string, fg: string, bg: string, scale: number, opacity: number, W = 1280, H = 720): string {
  const pat = PATTERNS.find((p) => p.id === patternId) ?? PATTERNS[0];
  const inner = pat.build(fg, scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <defs>
    <pattern id="pat" x="0" y="0" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
      ${inner}
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#pat)" opacity="${opacity}"/>
</svg>`;
}

function toDataUrl(svg: string) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SVGPatternPanel({ onClose }: { onClose?: () => void }) {
  const addElement = usePresentationStore((s) => s.addElement);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const [selectedId, setSelectedId] = useState('dots');
  const [fg, setFg] = useState('#94a3b8');
  const [bg, setBg] = useState('#ffffff');
  const [scale, setScale] = useState(24);
  const [opacity, setOpacity] = useState(0.6);
  const [inserted, setInserted] = useState(false);
  const [mode, setMode] = useState<'bg' | 'element'>('bg');

  const previewSvg = useMemo(() => buildPatternSVG(selectedId, fg, bg, scale, opacity, 400, 200), [selectedId, fg, bg, scale, opacity]);

  const handleInsert = useCallback(() => {
    if (currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    if (!slide) return;
    const fullSvg = buildPatternSVG(selectedId, fg, bg, scale, opacity);
    const src = toDataUrl(fullSvg);

    if (mode === 'bg') {
      updateSlide(slide.id, { background: src } as any);
    } else {
      addElement(slide.id, {
        id: `el-pattern-${Date.now()}`,
        type: 'image', x: 0, y: 0, width: 1280, height: 720, src, zIndex: 0,
      } as any);
    }
    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  }, [selectedId, fg, bg, scale, opacity, mode, currentSlideIndex, presentation, addElement, updateSlide]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Grid3x3 size={15} className="text-neutral-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-neutral-900 leading-none">Pattern Generator</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">SVG background patterns</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-all">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6 space-y-4">

          {/* Pattern Grid */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Pattern</p>
            <div className="grid grid-cols-3 gap-2">
              {PATTERNS.map((p) => {
                const mini = buildPatternSVG(p.id, fg, bg, scale, opacity, 80, 52);
                const active = selectedId === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedId(p.id)}
                    className={`rounded-xl overflow-hidden border-2 transition-all ${active ? 'border-neutral-900 shadow-md' : 'border-neutral-200 hover:border-neutral-400'}`}>
                    <div dangerouslySetInnerHTML={{ __html: mini }} className="w-full" />
                    <div className={`py-1 text-[10px] font-bold text-center ${active ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500'}`}>
                      {p.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white border border-neutral-200 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-neutral-400 mb-1">Pattern Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={fg} onChange={(e) => setFg(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-200" style={{ padding: 2 }} />
                  <span className="text-[11px] font-mono text-neutral-500">{fg}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-neutral-400 mb-1">Background Color</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={bg} onChange={(e) => setBg(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-200" style={{ padding: 2 }} />
                  <span className="text-[11px] font-mono text-neutral-500">{bg}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-neutral-400">Scale</p>
                <span className="text-[10px] font-mono text-neutral-500">{scale}px</span>
              </div>
              <input type="range" min="8" max="80" value={scale} onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-neutral-900" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-neutral-400">Opacity</p>
                <span className="text-[10px] font-mono text-neutral-500">{Math.round(opacity * 100)}%</span>
              </div>
              <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-neutral-900" />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-neutral-100">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Preview</p>
            </div>
            <div className="p-2" dangerouslySetInnerHTML={{ __html: previewSvg }} />
          </div>

          {/* Insert mode */}
          <div className="flex rounded-xl border border-neutral-200 overflow-hidden bg-white">
            <button onClick={() => setMode('bg')}
              className={`flex-1 py-2.5 text-[11px] font-bold transition-all ${mode === 'bg' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>
              Set as BG
            </button>
            <button onClick={() => setMode('element')}
              className={`flex-1 py-2.5 text-[11px] font-bold transition-all ${mode === 'element' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}>
              Insert Element
            </button>
          </div>

          {/* Insert button */}
          <AnimatePresence mode="wait">
            {inserted ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="h-12 rounded-2xl bg-neutral-900 flex items-center justify-center gap-2 shadow-md">
                <CheckCircle2 size={15} className="text-white" />
                <span className="text-white font-bold text-[13px]">Applied!</span>
              </motion.div>
            ) : (
              <motion.button key="insert"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                onClick={handleInsert}
                whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-2xl bg-neutral-900 text-white font-bold text-[13px] hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-md">
                <ArrowRight size={15} strokeWidth={2.5} />
                {mode === 'bg' ? 'Apply as Background' : 'Insert as Element'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
