'use client';

import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Sparkles } from 'lucide-react';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { DeckGenerationLifecycle } from '@/types';
import { KonvaCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from './KonvaCanvas';
import { FloatingPropertiesBar } from './FloatingPropertiesBar';
import { AlignmentToolbar } from './AlignmentToolbar';
import { ComponentErrorBoundary } from './ComponentErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { DRAG_TYPE_PEXELS_VIDEO, normalizeVideoSrc } from './VideosPanel';

// ─── Generation Loader (deterministic milestones — no faux random %) ───────────────────

/** Public asset path — encode spaces for reliable fetches across hosts/CDNs. */
const GENERATION_ORB_LOTTIE_SRC = encodeURI('/ai animation Flow 1.json');
/** From `ai animation Flow 1.json` — keep box matching comp to avoid non-uniform scale (canvas blur banding). */
const FLOW1_LOTTIE_W = 316.81;
const FLOW1_LOTTIE_H = 319.05;

function deriveGenerationUi(
  life: DeckGenerationLifecycle,
  slideLen: number,
  targetSlides: number,
  imgTot: number,
  imgCompleted: number,
  _imgPending: number,
): { pct: number; label: string; stepIndex: number } {
  const target = Math.max(targetSlides || 5, 1);
  switch (life) {
    case 'idle':
      return { pct: 0, label: 'Ready', stepIndex: 0 };
    case 'streaming': {
      const ratio = Math.min(1, slideLen / target);
      const pct = Math.round(Math.min(66, ratio * 60 + 6));
      return {
        pct,
        label: 'Composing slides',
        stepIndex: Math.min(4, Math.max(0, Math.floor(ratio * 4))),
      };
    }
    case 'building':
      return { pct: 71, label: 'Parsing deck JSON', stepIndex: 2 };
    case 'polishing':
      return { pct: 78, label: 'Elite polish pass', stepIndex: 3 };
    case 'images': {
      if (imgTot <= 0) {
        return { pct: Math.min(99, 96), label: 'Finalizing deck', stepIndex: 4 };
      }
      const frac = Math.max(0, Math.min(1, imgCompleted / imgTot));
      const pct = Math.round(78 + frac * 21);
      return {
        pct: Math.min(99, pct),
        label: 'AI visuals',
        stepIndex: 4,
      };
    }
    case 'connecting':
    default:
      return { pct: 4, label: 'Connecting to model', stepIndex: 0 };
  }
}

function GenerationStatusChip() {
  const editor = usePresentationStore((s) => s.editor);
  if (!editor.isGenerating || editor.generationBlockingOverlay) return null;
  const msg = editor.orchestrationMessage?.trim();
  if (!msg) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-none absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[91] flex -translate-x-1/2 max-w-[min(92vw,520px)] items-center gap-2 rounded-full border border-primary/20 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
      <span className="text-[11px] font-semibold text-black/80 truncate">
        {editor.activeModelLabel ? `${editor.activeModelLabel} — ` : ''}
        {msg}
      </span>
    </motion.div>
  );
}

function GenerationAssetsBanner() {
  const editor = usePresentationStore((s) => s.editor);
  const total = editor.generationImageJobsTotal;
  const done = Math.min(editor.generationImageJobsCompleted, total);
  const failed = editor.generationImageJobsFailed ?? 0;
  if (total <= 0 || editor.generationPendingImages <= 0) return null;

  const pct = Math.round((done / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="pointer-events-none absolute bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-1/2 z-[92] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-black/[0.08] bg-white/90 px-4 py-2.5 text-black shadow-xl backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <ImageIcon size={14} strokeWidth={1.85} className="shrink-0 text-primary" aria-hidden />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-black/55">Live AI visuals</span>
        <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap">
          {done}/{total} rendered
          {failed > 0 ? ` · ${failed} failed` : ''} · streaming to canvas ({pct}%)
        </span>
      </div>
      <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.07] shrink-0">
        <motion.span className="absolute inset-y-0 left-0 rounded-full bg-primary" initial={{ width: '0%' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.35 }} />
      </span>
    </motion.div>
  );
}

function GenerationLoader() {
  const editor = usePresentationStore((s) => s.editor);
  const slideLen = usePresentationStore((s) => s.presentation?.slides?.length ?? 0);
  const {
    deckGenerationLifecycle,
    generationTargetSlides,
    generationImageJobsTotal,
    generationImageJobsCompleted,
    generationPendingImages,
  } = editor;

  const { pct, label, stepIndex } = deriveGenerationUi(
    deckGenerationLifecycle,
    slideLen,
    generationTargetSlides,
    generationImageJobsTotal,
    generationImageJobsCompleted,
    generationPendingImages,
  );

  const steps = [
    { label: 'Connect', min: 0 },
    { label: 'Compose slides', min: 1 },
    { label: 'Parse JSON', min: 2 },
    { label: 'Polish', min: 3 },
    { label: 'AI visuals', min: 4 },
  ];

  const reasoningSteps = [
    'Reading intent and emotional arc from your brief…',
    'Shaping narrative rhythm and slide flow…',
    'Applying layout, typography, and motion intelligence…',
    'Tuning transitions for a keynote feel…',
    'Locking cinematic polish before you edit…',
  ];

  const currentStepIndex =
    deckGenerationLifecycle === 'idle' ? 0 : Math.min(stepIndex, steps.length - 1);

  const vizLine =
    deckGenerationLifecycle === 'images' && generationImageJobsTotal > 0
      ? `AI visuals ${Math.min(generationImageJobsCompleted, generationImageJobsTotal)}/${generationImageJobsTotal}`
      : deckGenerationLifecycle === 'streaming'
        ? `Slides streamed ${slideLen} / ~${generationTargetSlides || '?'}`
        : null;

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#f0f2f5]"
    >
      {/* ── Shimmering Skeleton Grid Background ── */}
      <div className="absolute inset-0 z-0 flex flex-wrap content-start justify-center gap-8 p-12 overflow-hidden opacity-60">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.6 }}
            className="relative w-[320px] shrink-0 aspect-[16/9] bg-white rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-200/50 p-6 flex flex-col gap-4 overflow-hidden"
          >
            {/* Shimmer Effect */}
            <motion.div 
              className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-[-20deg]"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}
            />
            <div className="h-4 w-2/3 bg-slate-100 rounded-md" />
            <div className="space-y-2 mt-2">
              <div className="h-2.5 w-full bg-slate-100 rounded-sm" />
              <div className="h-2.5 w-5/6 bg-slate-100 rounded-sm" />
              <div className="h-2.5 w-4/6 bg-slate-100 rounded-sm" />
            </div>
            <div className="mt-auto h-16 w-full bg-slate-100/50 rounded-lg" />
          </motion.div>
        ))}
      </div>

      {/* ── Premium Glass Overlay Panel ── */}
      <div className="relative z-10 w-full max-w-2xl px-6">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.2 }}
          className="bg-white/95 backdrop-blur-md border border-white shadow-[0_30px_60px_-15px_rgba(99,102,241,0.2)] rounded-[2.5rem] p-8 sm:p-12 w-full text-center"
        >
          {/* Animated Percentage Badge */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-indigo-100 bg-indigo-50/50 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-700 shadow-sm sm:text-xs"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse" aria-hidden />
              <span className="tabular-nums text-center">{Math.round(pct)}% complete</span>
            </motion.div>
          </div>

          <div className="space-y-2 mb-8">
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[10.5px] font-semibold text-indigo-500 uppercase tracking-[0.3em]"
            >
              Orchestrating Narrative
            </motion.div>
            <h2 className="text-[clamp(1.5rem,5vw,2.5rem)] font-semibold text-slate-900 tracking-tight leading-[1.1] text-balance px-1">
              {label}
            </h2>
          </div>

          {/* Stepper Progress Bar */}
          <div className="relative w-full h-[3px] bg-slate-200/50 rounded-full mb-10">
            <motion.div 
              className="absolute h-full rounded-full" 
              style={{ background: 'linear-gradient(90deg, #4f46e5, #a855f7, #ec4899)' }}
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStepIndex + 1) * (100 / steps.length)}%` }}
              transition={{ duration: 0.8, ease: "circOut" }}
            />
            <div className="absolute top-1/2 left-0 w-full flex justify-between -translate-y-1/2 px-0">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full border-2 transition-all duration-500 ${
                      i <= currentStepIndex ? 'bg-white border-purple-500 scale-125 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-slate-100 border-transparent'
                    }`} 
                  />
                ))}
            </div>
          </div>

          <div className="min-h-[50px] flex flex-col items-center justify-center mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={editor.reasoning ? 'real' : 'fake'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center max-w-lg"
              >
                {vizLine && (
                  <p className="text-[12px] font-bold text-indigo-600 tracking-tight mb-2 bg-indigo-50 px-3 py-1 rounded-full">
                    {vizLine}
                  </p>
                )}
                <p className="text-[13px] font-medium text-slate-500 italic tracking-tight leading-relaxed text-center">
                  {editor.reasoning 
                    ? editor.reasoning.slice(-120) 
                    : reasoningSteps[currentStepIndex]
                  }
                  <span className="inline-block w-[2px] h-[14px] bg-indigo-500 ml-1.5 translate-y-[2px] animate-blink" />
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 xs:gap-8 pt-6 border-t border-slate-200/50 w-full mx-auto">
            {[
              { label: 'Progress', value: `${Math.round(pct)}%` },
              {
                label: 'Engine',
                value: editor.orchestrationPhase
                  ? String(editor.orchestrationPhase)
                      .replace(/_/g, ' ')
                      .replace(/^\w/, (c) => c.toUpperCase())
                  : 'Orbstera AI',
              },
              { label: 'Status', value: 'ACTIVE', color: 'text-emerald-500' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col gap-1">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                  <span className={`text-[15px] font-bold tracking-tight ${stat.color || 'text-slate-800'}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Brand Credit */}
      <div className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] left-0 right-0 flex justify-center opacity-40 px-4">
        <span className="text-[10px] font-semibold tracking-[0.4em] text-slate-500 uppercase text-center flex items-center gap-2">
          <Sparkles size={12} className="text-indigo-400" />
          Orbstera Presentation Engine
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Canvas Area Component ──────────────────────────

// How much padding (in canvas-pixels) to leave around the slide at zoom=1
const PAD = 48;
// Zoom boundaries
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 3;
// Snappy zoom speed (higher = faster zoom per scroll tick)
const SCROLL_ZOOM_SPEED = 0.0075;

export function CanvasArea() {
  // ── Global keyboard shortcuts (Ctrl+Z/Y, Delete, Escape, etc.) ──────────
  useKeyboardShortcuts();

  /** Start at 0 so first layout pass does not run centering math with a fake width (avoids bad pan from ResizeObserver). */
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const pan = usePresentationStore((s) => s.editor.pan);
  const zoom = usePresentationStore((s) => s.editor.zoom);
  const showGrid = usePresentationStore((s) => s.editor.showGrid);
  const activeTool = usePresentationStore((s) => s.editor.activeTool);
  const isGenerating = usePresentationStore((s) => s.editor.isGenerating);
  const generationBlockingOverlay = usePresentationStore((s) => s.editor.generationBlockingOverlay);
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  // ─── Interaction State ───
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const prevContainerSizeRef = useRef<{ w: number; h: number } | null>(null);

  // Refs for logic
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasDivRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const isSpacePressedRef = useRef(false);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPanPosRef = useRef({ x: 0, y: 0 });
  const rafMomentumRef = useRef<number | null>(null);
  const [canvasDivRect, setCanvasDivRect] = useState({ left: 0, top: 0 });

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { isSpacePressedRef.current = isSpacePressed; }, [isSpacePressed]);

  // Track canvas div bounding rect for FloatingTextToolbar absolute positioning.
  useEffect(() => {
    const el = canvasDivRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setCanvasDivRect({ left: r.left, top: r.top });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', update, true);
    };
  }, [pan, zoom]);

  // Measure container before paint so centering uses real dimensions (main column + sidebars).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const cr = el.getBoundingClientRect();
      setContainerSize({ w: cr.width, h: cr.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * When the canvas box resizes, `scaledW` / `scaledH` change with `baseFitScale`, so the old
   * `pan.x -= dw/2` correction (constant slide size) drifted the slide off-center. Recenter by
   * clearing pan on meaningful layout changes (panel toggle, window resize).
   */
  useLayoutEffect(() => {
    const { w, h } = containerSize;
    if (w <= 0 || h <= 0) return;
    const prev = prevContainerSizeRef.current;
    prevContainerSizeRef.current = { w, h };
    if (!prev) return;
    if (Math.abs(w - prev.w) < 12 && Math.abs(h - prev.h) < 12) return;
    setEditorState({ pan: { x: 0, y: 0 } });
  }, [containerSize, setEditorState]);

  const baseFitScale =
    containerSize.w <= PAD * 2 || containerSize.h <= PAD * 2
      ? 0.01
      : Math.min(
          (containerSize.w - PAD * 2) / CANVAS_WIDTH,
          (containerSize.h - PAD * 2) / CANVAS_HEIGHT,
        );
  const effectiveScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, baseFitScale * zoom));

  const scaledW = CANVAS_WIDTH  * effectiveScale;
  const scaledH = CANVAS_HEIGHT * effectiveScale;

  const fitAndReset = useCallback(() => {
    setEditorState({ zoom: 1, pan: { x: 0, y: 0 } });
  }, [setEditorState]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        if (!isSpacePressed) setIsSpacePressed(true);
        if (e.target === document.body) e.preventDefault();
      }
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); setEditorState({ zoom: Math.min(ZOOM_MAX, zoom * 1.2) }); }
        else if (e.key === '-') { e.preventDefault(); setEditorState({ zoom: Math.max(ZOOM_MIN, zoom / 1.2) }); }
        else if (e.key === '0') { e.preventDefault(); fitAndReset(); }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [isSpacePressed, zoom, setEditorState, fitAndReset]);

  // ─── Refined Zoom-to-Cursor Handler ───
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isZooming = e.ctrlKey || e.metaKey;

      if (isZooming && !isSpacePressedRef.current) {
        const currentZoom = zoomRef.current;
        const delta = -e.deltaY * SCROLL_ZOOM_SPEED;
        const zoomFactor = Math.pow(1.1, delta);
        const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, currentZoom * zoomFactor));
        
        if (Math.abs(nextZoom - currentZoom) < 0.0001) return;

        const pan = panRef.current;
        const centerX = containerSize.w / 2 + pan.x;
        const centerY = containerSize.h / 2 + pan.y;
        
        const dx = (mouseX - centerX) / (baseFitScale * currentZoom);
        const dy = (mouseY - centerY) / (baseFitScale * currentZoom);
        
        const newPanX = mouseX - (containerSize.w / 2 + dx * (baseFitScale * nextZoom));
        const newPanY = mouseY - (containerSize.h / 2 + dy * (baseFitScale * nextZoom));

        setEditorState({ zoom: nextZoom, pan: { x: newPanX, y: newPanY } });
      } else {
        // Pan
        const p = panRef.current;
        setEditorState({ pan: { x: p.x - e.deltaX, y: p.y - e.deltaY } });
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [setEditorState, baseFitScale, containerSize.w, containerSize.h]);

  // ─── Panning with Momentum ───
  const startPanPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
      if (rafMomentumRef.current) cancelAnimationFrame(rafMomentumRef.current);
      e.preventDefault();
    } else if (e.target === e.currentTarget) {
      // Clicked on the gray area outside the canvas, so deselect any active element
      usePresentationStore.getState().selectElement(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - startPanPos.current.x;
      const newY = e.clientY - startPanPos.current.y;
      velocityRef.current = { x: e.clientX - lastPanPosRef.current.x, y: e.clientY - lastPanPosRef.current.y };
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      setEditorState({ pan: { x: newX, y: newY } });
    }
  };

  const applyMomentum = useCallback(() => {
    const friction = 0.94;
    const v = velocityRef.current;
    if (Math.abs(v.x) > 0.1 || Math.abs(v.y) > 0.1) {
      const p = panRef.current;
      velocityRef.current = { x: v.x * friction, y: v.y * friction };
      setEditorState({ pan: { x: p.x + v.x, y: p.y + v.y } });
      rafMomentumRef.current = requestAnimationFrame(applyMomentum);
    } else {
      rafMomentumRef.current = null;
    }
  }, [setEditorState]);

  // Cleanup RAF momentum on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (rafMomentumRef.current) {
        cancelAnimationFrame(rafMomentumRef.current);
        rafMomentumRef.current = null;
      }
    };
  }, []);

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      applyMomentum();
    }
  };

  // ─── Video Drag-and-Drop onto Canvas ───────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE_PEXELS_VIDEO)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const raw = e.dataTransfer.getData(DRAG_TYPE_PEXELS_VIDEO);
    if (!raw) return;
    e.preventDefault();

    let payload: { link: string; width: number; height: number; duration?: number };
    try { payload = JSON.parse(raw); } catch { return; }
    if (!payload?.link) return;

    const slideId = presentation?.slides?.[currentSlideIndex]?.id;
    if (!slideId) return;

    // Convert viewport drop coordinates to slide-space coordinates
    const containerEl = containerRef.current;
    const canvasEl = canvasDivRef.current;
    if (!containerEl || !canvasEl) return;

    const canvasRect = canvasEl.getBoundingClientRect();

    // Drop point relative to slide canvas div
    const dropRelX = e.clientX - canvasRect.left;
    const dropRelY = e.clientY - canvasRect.top;

    // Convert from screen pixels to slide units (1280x720 space)
    const scale = canvasRect.width / CANVAS_WIDTH;
    const slideX = dropRelX / scale;
    const slideY = dropRelY / scale;

    const SLIDE_W = CANVAS_WIDTH, SLIDE_H = CANVAS_HEIGHT;
    const MAX_W = 800, MAX_H = 450;
    let w = payload.width || 800;
    let h = payload.height || 450;
    if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
    if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H; }

    const x = Math.max(0, Math.min(SLIDE_W - w, slideX - w / 2));
    const y = Math.max(0, Math.min(SLIDE_H - h, slideY - h / 2));

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      x,
      y,
      width: w,
      height: h,
      src: normalizeVideoSrc(payload.link),
      zIndex: 100,
    });
  }, [addElement, currentSlideIndex, presentation]);

  return (
    <div
      ref={containerRef}
      id="tour-canvas"
      data-lenis-prevent
      className={`flex-1 relative flex items-center justify-center min-h-0 ${
        isPanning || isSpacePressed
          ? 'cursor-grabbing'
          : activeTool !== 'select'
            ? 'cursor-crosshair'
            : 'cursor-default'
      }`}
      style={{ overflow: 'clip', background: '#D8DEE6' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isGenerating && generationBlockingOverlay && <GenerationLoader />}
        {isGenerating && !generationBlockingOverlay && <GenerationStatusChip key="status-chip" />}
        {isGenerating && !generationBlockingOverlay && <GenerationAssetsBanner key="asset-banner" />}
      </AnimatePresence>

      {showGrid && (
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      )}

      {/* overflow:visible so transformer handles can extend outside the slide boundary */}
      <div className="relative z-10 w-full h-full" style={{ overflow: 'visible' }}>
        <div
          ref={canvasDivRef}
          style={{
            position: 'absolute',
            left: (containerSize.w - scaledW) / 2 + pan.x,
            top: (containerSize.h - scaledH) / 2 + pan.y,
            width: scaledW,
            height: scaledH,
            boxShadow: '0 8px 32px -8px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.12)',
            borderRadius: 2,
            // overflow:visible lets transformer handles render outside the slide edge.
            // Slide content is visually clipped by clip-path so nothing bleeds outside the white area.
            overflow: 'visible',
            backgroundColor: '#ffffff',
            // clip-path on the inner canvas content only (set on KonvaCanvas wrapper below)
          }}
        >
          {/* Clip slide content to the slide boundary without clipping transformer handles */}
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 0,
          }} />
          <ComponentErrorBoundary region="Canvas">
            <KonvaCanvas scale={effectiveScale} />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* ── Floating Toolbars ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-[201] pointer-events-none">
        {/* Alignment toolbar — top-center, visible when 2+ elements selected */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <AlignmentToolbar />
        </div>
      </div>

      {/* Floating properties bar — rendered at fixed position in viewport, above selected element */}
      <FloatingPropertiesBar
        scale={effectiveScale}
        canvasLeft={canvasDivRect.left}
        canvasTop={canvasDivRect.top}
      />

      <div className="absolute bottom-3 left-3 right-3 z-50 flex items-end justify-between gap-3 pointer-events-none">
        <p className="hidden sm:block text-[10px] font-medium text-neutral-600/90 bg-white/90 border border-neutral-200/80 rounded-md px-2.5 py-1 shadow-sm">
          Space + drag to pan · Ctrl + scroll to zoom · Shift constrains shapes
        </p>
      </div>

      <div className="absolute bottom-3 right-3 z-50 flex items-center gap-0.5 bg-white/95 border border-neutral-200/90 p-1 rounded-md shadow-md pointer-events-auto">
        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.max(ZOOM_MIN, zoom / 1.2) })}
          className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
        >
          <span className="text-lg font-medium leading-none">−</span>
        </button>

        <button
          type="button"
          onClick={fitAndReset}
          className="px-2.5 h-8 flex items-center justify-center rounded-md text-[11px] font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors min-w-[52px]"
          title="Fit slide (Ctrl+0)"
        >
          {Math.round(effectiveScale * 100)}%
        </button>

        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.min(ZOOM_MAX, zoom * 1.2) })}
          className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
        >
          <span className="text-xl font-medium">+</span>
        </button>
      </div>
    </div>
  );
}

