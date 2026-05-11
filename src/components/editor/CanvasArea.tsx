'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon } from 'lucide-react';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { DeckGenerationLifecycle } from '@/types';
import { KonvaCanvas } from './KonvaCanvas';

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
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute bg-primary/10 rounded-full blur-[1px]"
            style={{
              width: Math.random() * 40 + 10,
              height: Math.random() * 40 + 10,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 50 - 25, 0],
              opacity: [0, 0.4, 0],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 8 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Visionary AI Backdrop (VR Man) */}
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
                {/* @ts-ignore */}
                <lottie-player
                  src="/robo (2).json"
                  background="transparent"
                  speed="1"
                  style={{ width: '100%', height: '100%' }}
                  loop
                  autoplay
                />
              </div>
           </motion.div>

           {/* Main Intelligence Orb */}
           {/* @ts-ignore */}
           <lottie-player
             src="/ai animation Flow 1.json"
             background="transparent"
             speed="1"
             style={{ width: '100%', height: '100%' }}
             loop
             autoplay
           />

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

export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 900, height: 600 });
  const [canvasPad, setCanvasPad] = useState(48);
  const { editor, setEditorState } = usePresentationStore();
  const { zoom, showGrid, isGenerating, generationBlockingOverlay } = editor;

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const startPanPos = useRef({ x: 0, y: 0 });

  // Measure container dimensions
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        setDims({ width, height });
        const edge = Math.min(width, height);
        setCanvasPad(Math.max(12, Math.min(60, Math.round(edge * 0.065))));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts (Space for Panning, Ctrl+/- for Zoom)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        if (!isSpacePressed) setIsSpacePressed(true);
        // Prevent scrolling with space
        if (e.target === document.body) e.preventDefault();
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setEditorState({ zoom: Math.min(2, zoom + 0.1) });
        } else if (e.key === '-') {
          e.preventDefault();
          setEditorState({ zoom: Math.max(0.2, zoom - 0.1) });
        } else if (e.key === '0') {
          e.preventDefault();
          setEditorState({ zoom: 0.7, pan: { x: 0, y: 0 } });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };

    const handleWheel = (e: WheelEvent) => {
      // Zoom with Ctrl + Wheel or just Wheel if it's the primary way
      // We'll allow both but prioritize Ctrl for precision if needed
      e.preventDefault();
      
      const isZoom = e.ctrlKey || e.metaKey || true; // Always allow for now
      if (isZoom) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.min(2, Math.max(0.1, zoom + delta));
        setEditorState({ zoom: newZoom });
      } else {
        // Pan with wheel (if not zooming)
        setEditorState({ 
          pan: { 
            x: editor.pan.x - e.deltaX, 
            y: editor.pan.y - e.deltaY 
          } 
        });
      }
    };

    const container = containerRef.current;
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [zoom, isSpacePressed, setEditorState, editor.pan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Pan with Middle Mouse Button (1) or Space + Left Click (0)
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      startPanPos.current = { x: e.clientX - editor.pan.x, y: e.clientY - editor.pan.y };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - startPanPos.current.x;
      const dy = e.clientY - startPanPos.current.y;
      setEditorState({ pan: { x: dx, y: dy } });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div 
      ref={containerRef} 
      id="tour-canvas"
      data-lenis-prevent
      className={`flex-1 relative overflow-hidden flex flex-col min-h-0 bg-[#FBFBFC] ${isPanning || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => isSpacePressed && e.preventDefault()}
    >
      <AnimatePresence>
        {isGenerating && generationBlockingOverlay && <GenerationLoader />}
        {isGenerating && !generationBlockingOverlay && <GenerationAssetsBanner key="asset-banner" />}
      </AnimatePresence>

      {/* Cinematic studio backdrop — optional subtle grid (no purple dots) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#F4F6FA]">
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

        {/* Technical VR Visionary Background (Watermark) */}
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

        {/* Ambient Studio Lighting */}
        <motion.div
          animate={{
            x: [0, 40, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-sky-400/[0.06] blur-[100px]"
        />
      </div>

      {/* Canvas area container */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative z-10 min-h-0"
        style={{ padding: canvasPad }}
      >
        <motion.div
          initial={false}
          animate={{
            x: editor.pan.x,
            y: editor.pan.y,
            scale: zoom
          }}
          transition={isPanning ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
          className="rounded-2xl max-w-full max-h-full"
          style={{
            transformOrigin: 'center center',
            boxShadow:
              '0 50px 120px -30px rgba(15,23,42,0.12), 0 25px 50px -25px rgba(59,130,246,0.08)',
          }}
        >
          <KonvaCanvas
            width={Math.max(120, dims.width - canvasPad * 2)}
            height={Math.max(68, dims.height - canvasPad * 2)}
          />
        </motion.div>
      </div>

      {/* Premium Floating Zoom Controls */}
      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] sm:bottom-10 sm:right-10 z-50 flex items-center gap-1 sm:gap-2 bg-white/70 backdrop-blur-xl border border-black/[0.05] p-1 sm:p-1.5 rounded-2xl shadow-premium touch-manipulation max-w-[calc(100vw-1rem)]">
        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.max(0.1, zoom - 0.1) })}
          className="w-9 h-9 sm:w-10 sm:h-10 min-w-9 flex items-center justify-center rounded-xl text-black/40 hover:text-black hover:bg-black/5 transition-all touch-manipulation"
          title="Zoom Out"
        >
          <span className="text-lg sm:text-xl font-medium">−</span>
        </button>
        
        <button
          type="button"
          onClick={() => setEditorState({ zoom: 0.7, pan: { x: 0, y: 0 } })}
          className="px-2 sm:px-3 h-9 sm:h-10 min-w-0 flex items-center justify-center rounded-xl text-[10px] sm:text-[11px] font-black text-black/40 hover:text-black hover:bg-black/5 transition-all uppercase tracking-widest touch-manipulation"
          title="Reset View"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={() => setEditorState({ zoom: Math.min(2, zoom + 0.1) })}
          className="w-9 h-9 sm:w-10 sm:h-10 min-w-9 flex items-center justify-center rounded-xl text-black/40 hover:text-black hover:bg-black/5 transition-all touch-manipulation"
          title="Zoom In"
        >
          <span className="text-lg sm:text-xl font-medium">+</span>
        </button>
      </div>
    </div>
  );
}
