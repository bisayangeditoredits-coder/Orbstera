'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Cpu } from 'lucide-react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { KonvaCanvas } from './KonvaCanvas';

// ─── Generation Loader (World-Class SaaS Orchestration) ───────────────────

function GenerationLoader() {
  const { editor } = usePresentationStore();
  const [percent, setPercent] = useState(0);
  const steps = [
    { label: "Core Analysis", min: 0 },
    { label: "Structural Synthesis", min: 20 },
    { label: "Visual Orchestration", min: 45 },
    { label: "Neural Refinement", min: 70 },
    { label: "Final Deployment", min: 92 }
  ];

  const reasoningSteps = [
    "Deconstructing user prompt into semantic logical nodes...",
    "Cross-referencing elite SaaS architectural layout patterns...",
    "Synthesizing visual assets with Sonnet-3.5 neural mapping...",
    "Optimizing narrative hierarchy for cinematic impact...",
    "Finalizing structural refinement and deployment protocols..."
  ];

  const currentStepIndex = steps.findIndex((s, i) => {
    const nextStep = steps[i + 1];
    return percent >= s.min && (!nextStep || percent < nextStep.min);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((p) => {
        if (p >= 100) return 100;
        const inc = Math.random() * 1.8;
        return Math.min(100, p + inc);
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
        <div className="relative flex items-center justify-center mb-8 w-[400px] h-[400px] scale-90 md:scale-110">
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
             {Math.round(percent)}% Complete
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
              <h2 className="text-4xl font-semibold text-black tracking-[-0.04em] leading-[1.1] text-balance">
                {steps[currentStepIndex]?.label}
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

           <div className="grid grid-cols-3 gap-8 pt-6 border-t border-black/[0.03]">
              {[
                { label: 'Progress', value: `${Math.round(((currentStepIndex + 1) / steps.length) * 100)}%` },
                { label: 'Model', value: editor.activeModelLabel ? editor.activeModelLabel.split('/').pop() || 'Orchestra' : 'Orchestra' },
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
        <div className="absolute bottom-12 left-0 right-0 flex justify-center opacity-20">
          <span className="text-[9px] font-black tracking-[0.6em] text-black uppercase">
            Synthesized via CrelDesk Neural Architecture
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
  const { editor, setEditorState } = usePresentationStore();
  const { zoom, showGrid, isGenerating } = editor;

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const startPanPos = useRef({ x: 0, y: 0 });

  // Measure container dimensions
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
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
        {isGenerating && <GenerationLoader />}
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
      <div className="flex-1 flex items-center justify-center overflow-hidden relative z-10" style={{ padding: '60px' }}>
        <motion.div
          initial={false}
          animate={{
            x: editor.pan.x,
            y: editor.pan.y,
            scale: zoom
          }}
          transition={isPanning ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
          className="rounded-2xl"
          style={{
            transformOrigin: 'center center',
            boxShadow:
              '0 50px 120px -30px rgba(15,23,42,0.12), 0 25px 50px -25px rgba(59,130,246,0.08)',
          }}
        >
          <KonvaCanvas
            width={dims.width - 120}
            height={dims.height - 120}
          />
        </motion.div>
      </div>

      {/* Premium Floating Zoom Controls */}
      <div className="absolute bottom-10 right-10 z-50 flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-black/[0.05] p-1.5 rounded-2xl shadow-premium">
        <button
          onClick={() => setEditorState({ zoom: Math.max(0.1, zoom - 0.1) })}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-black/40 hover:text-black hover:bg-black/5 transition-all"
          title="Zoom Out"
        >
          <span className="text-xl font-medium">−</span>
        </button>
        
        <button
          onClick={() => setEditorState({ zoom: 0.7, pan: { x: 0, y: 0 } })}
          className="px-3 h-10 flex items-center justify-center rounded-xl text-[11px] font-black text-black/40 hover:text-black hover:bg-black/5 transition-all uppercase tracking-widest"
          title="Reset View"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={() => setEditorState({ zoom: Math.min(2, zoom + 0.1) })}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-black/40 hover:text-black hover:bg-black/5 transition-all"
          title="Zoom In"
        >
          <span className="text-xl font-medium">+</span>
        </button>
      </div>
    </div>
  );
}
