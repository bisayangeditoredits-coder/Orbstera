'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon } from 'lucide-react';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { DeckGenerationLifecycle } from '@/types';
import { KonvaCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from './KonvaCanvas';

// ─── Generation Loader (deterministic milestones — no faux random %) ───────────────────

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
      Array.from({ length: 12 }, () => ({
        w: Math.random() * 40 + 10,
        h: Math.random() * 40 + 10,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        x2: Math.random() * 50 - 25,
        duration: 8 + Math.random() * 10,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-2xl overflow-hidden"
    >
      {/* 1. Ambient Workspace Background with Neural Streams */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(14,165,233,0.12), transparent)',
          }}
        />
        
        {/* Floating Shapes / Particles */}
        {particles.map((p, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute bg-primary/10 rounded-full blur-[1px]"
            style={{
              width: p.w,
              height: p.h,
              left: p.left,
              top: p.top,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, p.x2, 0],
              opacity: [0, 0.4, 0],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}

        {/* Visionary AI Backdrop (VR Man) */}
        {!reduceMotion && (
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] grayscale pointer-events-none mix-blend-overlay">
            {/* @ts-ignore */}
            <lottie-player
              src="/A Man with VR headset touches a holographic screen.json"
              background="transparent"
              speed="0.8"
              style={{ width: '100%', height: '100%' }}
              loop
              autoplay
            />
          </div>
        )}

        <motion.div
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/[0.03] blur-[100px]"
        />
      </div>

      <div className="relative flex flex-col items-center justify-center w-full max-w-4xl h-full z-10 px-6">
        
        {/* 2. Orchestration Core (Lottie AI Orb & Robot Assistant) */}
        <div className="relative flex items-center justify-center mb-6 sm:mb-8 w-[min(400px,88vw)] h-[min(400px,55dvh)] scale-[0.82] xs:scale-90 md:scale-110">
           {/* AI Robot Mascot Assistant (Centered in Orb) */}
           <motion.div 
             animate={{ 
               y: [0, -15, 0],
             }}
             transition={{ 
               duration: 4, 
               repeat: Infinity, 
               ease: "easeInOut" 
             }}
             className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]"
           >
              <div className="w-[180px] h-[180px]">
                {!reduceMotion && (
                  // @ts-ignore
                  <lottie-player
                    src="/robo (2).json"
                    background="transparent"
                    speed="1"
                    style={{ width: '100%', height: '100%' }}
                    loop
                    autoplay
                  />
                )}
              </div>
           </motion.div>

           {/* Main Intelligence Orb */}
           {!reduceMotion && (
            // @ts-ignore
            <lottie-player
              src="/ai animation Flow 1.json"
              background="transparent"
              speed="1"
              style={{ width: '100%', height: '100%' }}
              loop
              autoplay
            />
           )}

           {/* Floating Progress Pill */}
           <motion.div 
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className="absolute bottom-4 px-6 py-2.5 rounded-full bg-black text-white text-[12px] font-black tracking-widest uppercase shadow-2xl flex items-center gap-3 border border-white/10"
           >
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             {Math.round(pct)}% Complete
           </motion.div>
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
                { label: 'Progress', value: `${Math.round(((currentStepIndex + 1) / steps.length) * 100)}%` },
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


export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 900, h: 600 });
  const { editor, setEditorState } = usePresentationStore();
  const { zoom, showGrid, isGenerating, generationBlockingOverlay } = editor;

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const startPanPos = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(editor.pan);
  const isSpacePressedRef = useRef(false);

  useEffect(() => { isSpacePressedRef.current = isSpacePressed; }, [isSpacePressed]);

  // Smooth scroll-wheel 60fps interpolation refs
  const targetZoomRef = useRef(zoom);
  const isZoomingRef = useRef(false);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = editor.pan; }, [editor.pan]);

  // Synchronize target zoom if changed externally (e.g. controls/shortcuts)
  useEffect(() => {
    if (!isZoomingRef.current) {
      targetZoomRef.current = zoom;
    }
  }, [zoom]);

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

  // Compute the scale that fits the canvas in the container (base fit scale × user zoom)
  const baseFitScale = Math.min(
    (containerSize.w - PAD * 2) / CANVAS_WIDTH,
    (containerSize.h - PAD * 2) / CANVAS_HEIGHT,
  );
  const effectiveScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, baseFitScale * zoom));

  // Scaled canvas dimensions in the DOM
  const scaledW = CANVAS_WIDTH  * effectiveScale;
  const scaledH = CANVAS_HEIGHT * effectiveScale;

  // Apply zoom & re-center pan reset when fit changes
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
        if (e.key === '=' || e.key === '+') { e.preventDefault(); setEditorState({ zoom: Math.min(ZOOM_MAX, zoom + 0.15) }); }
        else if (e.key === '-')             { e.preventDefault(); setEditorState({ zoom: Math.max(ZOOM_MIN, zoom - 0.15) }); }
        else if (e.key === '0')             { e.preventDefault(); fitAndReset(); }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpacePressed(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); };
  }, [isSpacePressed, zoom, setEditorState, fitAndReset]);

  // Ultra-smooth 60fps scroll-wheel zoom interpolation loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // If panning with space key held, do panning instead
      if (isSpacePressedRef.current) {
        e.preventDefault();
        const p = panRef.current;
        setEditorState({ pan: { x: p.x - e.deltaX, y: p.y - e.deltaY } });
        return;
      }

      // Scroll wheel = zoom (smooth 60fps easing)
      e.preventDefault();

      // deltaY > 0 = scroll down = zoom out; < 0 = scroll up = zoom in
      // Gentle target calculation per detent
      const factor = 1 - e.deltaY * 0.0008;
      targetZoomRef.current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, targetZoomRef.current * factor));

      // Trigger continuous 60fps render tick if idle
      if (!isZoomingRef.current) {
        isZoomingRef.current = true;
        const tick = () => {
          const currentActual = zoomRef.current;
          const target = targetZoomRef.current;
          const diff = target - currentActual;

          // If extremely close, snap to target and finish loop
          if (Math.abs(diff) < 0.001) {
            setEditorState({ zoom: target });
            isZoomingRef.current = false;
          } else {
            // Silky smooth easing coefficient per frame
            setEditorState({ zoom: currentActual + diff * 0.24 });
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [setEditorState]);

  // Pan with middle mouse or Space+drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - editor.pan.x, y: e.clientY - editor.pan.y };
      e.preventDefault();
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) setEditorState({ pan: { x: e.clientX - startPanPos.current.x, y: e.clientY - startPanPos.current.y } });
  };
  const handleMouseUp = () => setIsPanning(false);

  return (
    <div
      ref={containerRef}
      id="tour-canvas"
      data-lenis-prevent
      className={`flex-1 relative overflow-hidden flex items-center justify-center min-h-0 bg-[#F4F6FA] ${
        isPanning || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''
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

      {/* Studio backdrop */}
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
        {/* Watermark */}
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

      {/* ── Canvas viewport: fixed-size box that clips the scaled canvas ─────── */}
      {/*
        Strategy (Figma-style):
        1. The KonvaCanvas always renders at CANVAS_WIDTH × CANVAS_HEIGHT.
        2. We apply CSS transform: scale(effectiveScale) with transformOrigin top-left.
        3. We centre it by translating by half the difference between
           the container size and the scaled canvas size, plus the user's pan offset.
      */}
      <div
        className="relative z-10 overflow-hidden"
        style={{
          // This viewport occupies the full flex area
          width:  '100%',
          height: '100%',
        }}
      >
        <div
          style={{
            position:  'absolute',
            left:      Math.round((containerSize.w - scaledW) / 2 + editor.pan.x),
            top:       Math.round((containerSize.h - scaledH) / 2 + editor.pan.y),
            width:     scaledW,
            height:    scaledH,
            // Drop shadow on the scaled canvas wrapper (not inside KonvaCanvas)
            boxShadow: '0 32px 80px -20px rgba(15,23,42,0.22), 0 0 0 1px rgba(255,255,255,0.06)',
            borderRadius: 4,
            overflow:  'hidden',
            // Micro-interpolation for buttery smooth 60fps+ visual response
            transition: 'all 0.08s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <KonvaCanvas scale={effectiveScale} />
        </div>
      </div>

      {/* ── Floating Zoom Controls ────────────────────────────────────────────── */}
      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] sm:bottom-6 sm:right-6 z-50 flex items-center gap-1 bg-white/80 backdrop-blur-xl border border-black/[0.06] p-1 rounded-2xl shadow-lg touch-manipulation">
        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.max(ZOOM_MIN, zoom - 0.15) })}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-black/40 hover:text-black hover:bg-black/5 transition-all touch-manipulation"
          title="Zoom Out (Ctrl/⌘ −)"
        >
          <span className="text-xl font-medium">−</span>
        </button>

        <button
          type="button"
          onClick={fitAndReset}
          className="px-3 h-9 flex items-center justify-center rounded-xl text-[11px] font-black text-black/40 hover:text-black hover:bg-black/5 transition-all uppercase tracking-widest touch-manipulation min-w-[52px]"
          title="Reset View (Ctrl/⌘ 0)"
        >
          {Math.round(effectiveScale * 100)}%
        </button>

        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.min(ZOOM_MAX, zoom + 0.15) })}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-black/40 hover:text-black hover:bg-black/5 transition-all touch-manipulation"
          title="Zoom In (Ctrl/⌘ +)"
        >
          <span className="text-xl font-medium">+</span>
        </button>
      </div>
    </div>
  );
}
