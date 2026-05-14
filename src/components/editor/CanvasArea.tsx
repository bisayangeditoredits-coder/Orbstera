'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon } from 'lucide-react';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { DeckGenerationLifecycle } from '@/types';
import { KonvaCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from './KonvaCanvas';

// ─── Generation Loader (deterministic milestones — no faux random %) ───────────────────

/** Public asset paths — encode spaces for reliable fetches across hosts/CDNs. */
const GENERATION_ORB_LOTTIE_SRC = encodeURI('/ai animation Flow 1.json');
const GENERATION_ROBOT_LOTTIE_SRC = encodeURI('/robo (2).json');

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

function GenerationAssetsBanner() {
  const editor = usePresentationStore((s) => s.editor);
  const total = editor.generationImageJobsTotal;
  const done = Math.min(editor.generationImageJobsCompleted, total);
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
        <span className="text-[10px] font-black uppercase tracking-widest text-black/55">Live AI visuals</span>
        <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap">
          {done}/{total} rendered · streaming to canvas ({pct}%)
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

  const particles = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        w: 16 + (i % 3) * 12,
        h: 16 + (i % 2) * 10,
        left: `${15 + i * 18}%`,
        top: `${10 + (i * 17) % 70}%`,
        x2: (i % 5) * 8 - 16,
        duration: 10 + i * 2,
        delay: i * 0.8,
      })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-100 via-neutral-50 to-neutral-100/95"
    >
      {/* Light ambient — CSS only + few particles (no extra full-screen Lottie) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 70% 45% at 50% 12%, rgba(59,130,246,0.35), transparent), radial-gradient(ellipse 50% 35% at 92% 78%, rgba(139,92,246,0.12), transparent)',
          }}
        />

        {particles.map((p, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full bg-primary/15 blur-[1px]"
            style={{
              width: p.w,
              height: p.h,
              left: p.left,
              top: p.top,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, p.x2, 0],
              opacity: [0, 0.18, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 22% 28%, rgba(0,0,0,0.12), transparent 55%)',
          }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full max-w-4xl flex-col items-center justify-center px-6">
        
        {/* Dual Lottie: flow (rear) + robot (front); orb always visible (reduced motion = slower orb, no mascot) */}
        <div className="relative mb-5 flex h-[min(320px,52dvh)] w-[min(320px,82vw)] items-center justify-center sm:mb-7 sm:h-[min(360px,50dvh)] sm:w-[min(360px,78vw)] md:h-[min(400px,48dvh)] md:w-[min(400px,72vw)]">
          <>
            {/* @ts-expect-error custom element — swirl / orb behind mascot */}
            <lottie-player
              className="absolute inset-0 z-0 h-full w-full"
              src={GENERATION_ORB_LOTTIE_SRC}
              background="transparent"
              speed={reduceMotion ? '0.35' : '1'}
              loop
              autoplay
              renderer="canvas"
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-neutral-100/35 via-transparent to-transparent" />
          </>

          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 flex h-[46%] w-[46%] max-w-[200px] items-center justify-center drop-shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
          >
            {!reduceMotion && (
              // @ts-expect-error custom element
              <lottie-player
                src={GENERATION_ROBOT_LOTTIE_SRC}
                background="transparent"
                speed="1"
                style={{ width: '100%', height: '100%' }}
                loop
                autoplay
                renderer="canvas"
              />
            )}
          </motion.div>

          <div className="pointer-events-none absolute inset-x-0 bottom-1 z-20 flex justify-center px-2">
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-neutral-950 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/20 sm:text-xs sm:tracking-[0.24em]"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]" aria-hidden />
              <span className="tabular-nums text-center">{Math.round(pct)}% complete</span>
            </motion.div>
          </div>
        </div>

        {/* 3. Narrative Progress Architecture */}
        <div className="w-full max-w-xl text-center space-y-6">
           <div className="space-y-2">
              <motion.div 
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.4em]"
              >
                Orchestrating Narrative
              </motion.div>
              <h2 className="text-[clamp(1.35rem,5vw,2.25rem)] font-semibold text-black tracking-[-0.04em] leading-[1.15] text-balance px-1">
                {label}
              </h2>
           </div>

           <div className="relative w-full h-[1px] bg-black/[0.05] mt-6 mb-12">
              <motion.div 
                className="absolute h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]" 
                initial={{ width: "0%" }}
                animate={{ width: `${(currentStepIndex + 1) * (100 / steps.length)}%` }}
                transition={{ duration: 0.8, ease: "circOut" }}
              />
              <div className="absolute top-1/2 left-0 w-full flex justify-between -translate-y-1/2 px-1">
                 {steps.map((_, i) => (
                   <div 
                     key={i} 
                     className={`w-1.5 h-1.5 rounded-full border transition-all duration-500 ${
                       i <= currentStepIndex ? 'bg-primary border-primary scale-110' : 'bg-white border-black/10'
                     }`} 
                   />
                 ))}
              </div>
           </div>

           <div className="min-h-[60px] flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={editor.reasoning ? 'real' : 'fake'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col items-center max-w-lg"
                >
                  {vizLine && (
                    <p className="text-[11px] font-semibold text-primary/85 tracking-tight mb-2">
                      {vizLine}
                    </p>
                  )}
                  <p className="text-[12px] font-medium text-black/40 italic tracking-tight leading-relaxed text-center">
                    {editor.reasoning 
                      ? editor.reasoning.slice(-120) 
                      : reasoningSteps[currentStepIndex]
                    }
                    <span className="inline-block w-[1.5px] h-[12px] bg-primary ml-1 translate-y-[2px] animate-blink" />
                  </p>
                </motion.div>
              </AnimatePresence>
           </div>

           <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 xs:gap-8 pt-6 border-t border-black/[0.03] w-full max-w-xl mx-auto">
              {[
                { label: 'Progress', value: `${Math.round(pct)}%` },
                {
                  label: 'Engine',
                  value: editor.orchestrationPhase
                    ? String(editor.orchestrationPhase)
                        .replace(/_/g, ' ')
                        .replace(/^\w/, (c) => c.toUpperCase())
                    : 'Orbstera',
                },
                { label: 'Status', value: 'ACTIVE', color: 'text-emerald-500' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col gap-1">
                   <span className="text-[8px] font-bold text-black/25 uppercase tracking-widest">{stat.label}</span>
                   <span className={`text-[14px] font-black tracking-tight ${stat.color || 'text-black'}`}>{stat.value}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Brand Credit - Anchored to bottom to avoid clipping */}
        <div className="absolute bottom-[max(3rem,env(safe-area-inset-bottom))] left-0 right-0 flex justify-center opacity-20 px-4">
          <span className="text-[8px] sm:text-[9px] font-black tracking-[0.2em] sm:tracking-[0.6em] text-black uppercase text-center">
            Orbstera presentation engine
          </span>
        </div>
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
  const [containerSize, setContainerSize] = useState({ w: 900, h: 600 });
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const undo = usePresentationStore((s) => s.undo);
  const redo = usePresentationStore((s) => s.redo);
  const pan = usePresentationStore((s) => s.editor.pan);
  const zoom = usePresentationStore((s) => s.editor.zoom);
  const showGrid = usePresentationStore((s) => s.editor.showGrid);
  const isGenerating = usePresentationStore((s) => s.editor.isGenerating);
  const generationBlockingOverlay = usePresentationStore((s) => s.editor.generationBlockingOverlay);

  // ─── Interaction State ───
  const [isPanning, setIsPanning] = useState(false);
  const [isWheelActive, setIsWheelActive] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevContainerWRef = useRef<number | null>(null);

  // Refs for logic
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const isSpacePressedRef = useRef(false);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPanPosRef = useRef({ x: 0, y: 0 });
  const rafMomentumRef = useRef<number | null>(null);

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { isSpacePressedRef.current = isSpacePressed; }, [isSpacePressed]);

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /** Keep slide visually anchored when the main column width changes (e.g. right panel open/close). */
  useEffect(() => {
    const w = containerSize.w;
    if (prevContainerWRef.current === null) {
      prevContainerWRef.current = w;
      return;
    }
    const prev = prevContainerWRef.current;
    const dw = w - prev;
    prevContainerWRef.current = w;
    if (Math.abs(dw) < 12) return;
    const p = usePresentationStore.getState().editor.pan;
    setEditorState({ pan: { x: p.x - dw / 2, y: p.y } });
  }, [containerSize.w, setEditorState]);

  const baseFitScale = Math.min(
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
      
      // ── Undo / Redo Shortcuts ──
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
        // Existing zoom shortcuts
        else if (e.key === '=' || e.key === '+') { e.preventDefault(); setEditorState({ zoom: Math.min(ZOOM_MAX, zoom * 1.2) }); }
        else if (e.key === '-')             { e.preventDefault(); setEditorState({ zoom: Math.max(ZOOM_MIN, zoom / 1.2) }); }
        else if (e.key === '0')             { e.preventDefault(); fitAndReset(); }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [isSpacePressed, zoom, setEditorState, fitAndReset, undo, redo]);

  // ─── Refined Zoom-to-Cursor Handler ───
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Mark wheel as active to disable transitions
      setIsWheelActive(true);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      wheelTimeoutRef.current = setTimeout(() => setIsWheelActive(false), 150);

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Logic: Zoom if Ctrl is held OR if simple scroll (depending on preference)
      // Most users with wheel-zoom issues want Scroll = Zoom
      const isZooming = e.ctrlKey || e.metaKey || true; // Set to true to always zoom on scroll

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

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      applyMomentum();
    }
  };

  return (
    <div
      ref={containerRef}
      id="tour-canvas"
      data-lenis-prevent
      className={`flex-1 relative overflow-hidden flex items-center justify-center min-h-0 bg-[#F4F6FA] ${
        isPanning || isSpacePressed ? 'cursor-grabbing' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <AnimatePresence>
        {isGenerating && generationBlockingOverlay && <GenerationLoader />}
        {isGenerating && !generationBlockingOverlay && <GenerationAssetsBanner key="asset-banner" />}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(59,130,246,0.14), transparent 55%), radial-gradient(ellipse 90% 60% at 100% 0%, rgba(14,165,233,0.08), transparent 50%), radial-gradient(ellipse 70% 50% at 0% 100%, rgba(15,23,42,0.04), transparent 45%)',
          }}
        />
        {showGrid && (
          <div
            className="absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] grayscale pointer-events-none mix-blend-multiply">
          {/* @ts-ignore */}
          <lottie-player
            src="/A Man with VR headset touches a holographic screen.json"
            background="transparent"
            speed="0.5"
            style={{ width: '110%', height: '110%' }}
            loop
            autoplay
          />
        </div>
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-sky-400/[0.06] blur-[100px]"
        />
      </div>

      <div className="relative z-10 w-full h-full overflow-hidden">
        <motion.div
          animate={{
            left: (containerSize.w - scaledW) / 2 + pan.x,
            top: (containerSize.h - scaledH) / 2 + pan.y,
            width: scaledW,
            height: scaledH,
          }}
          transition={{
            type: 'spring',
            damping: 35,
            stiffness: 400,
            mass: 0.8,
            // Skip animation during high-frequency wheel or pan events for zero latency
            duration: (isPanning || isWheelActive) ? 0 : 0.15 
          }}
          style={{
            position: 'absolute',
            boxShadow: '0 32px 80px -20px rgba(15,23,42,0.25), 0 0 0 1px rgba(255,255,255,0.08)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <KonvaCanvas scale={effectiveScale} />
        </motion.div>
      </div>

      <div className="absolute bottom-6 right-6 z-50 flex items-center gap-1 bg-white/90 backdrop-blur-2xl border border-black/[0.05] p-1.5 rounded-2xl shadow-2xl scale-90 sm:scale-100">
        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.max(ZOOM_MIN, zoom / 1.2) })}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 hover:text-black hover:bg-black/5 transition-all"
        >
          <span className="text-xl font-medium">−</span>
        </button>

        <button
          type="button"
          onClick={fitAndReset}
          className="px-3 h-9 flex items-center justify-center rounded-xl text-[11px] font-black text-neutral-800 hover:bg-black/5 transition-all uppercase tracking-widest min-w-[58px]"
        >
          {Math.round(effectiveScale * 100)}%
        </button>

        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.min(ZOOM_MAX, zoom * 1.2) })}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-neutral-400 hover:text-black hover:bg-black/5 transition-all"
        >
          <span className="text-xl font-medium">+</span>
        </button>
      </div>
    </div>
  );
}

