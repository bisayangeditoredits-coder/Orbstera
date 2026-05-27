'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { PresentationData } from '@/types';
import { PresentSlideView } from '@/components/present/PresentSlideView';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Presentation,
  Layers,
  Sparkles,
  ExternalLink,
  Download,
  CheckCircle,
  X,
  PackageCheck,
  FileDown,
  Loader2,
} from 'lucide-react';
import {
  getSlideTransitionVariants,
  inferSlideTransition,
  type MotionContext,
} from '@/lib/presentationMotion';
import { createClient } from '@/lib/supabase';
import { exportToPptx } from '@/lib/export';
import { ShareWatermarkBadge } from './ShareWatermarkBadge';
import { ShareVisitorCtaBar } from './ShareVisitorCtaBar';

// ── Export Progress Modal ─────────────────────────────────────────────────────
const EXPORT_STEPS = [
  { icon: Sparkles,     label: 'Analyzing layout',       detail: 'Mapping slide elements & coordinates'   },
  { icon: PackageCheck, label: 'Building PPTX',           detail: 'Embedding fonts, shapes & HD images'    },
  { icon: FileDown,     label: 'Finalizing download',     detail: 'Transferring to your device'             },
];

function ExportModal({ step, done, error, onClose }: {
  step: number; done: boolean; error: string | null; onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 safe-pad-y"
      style={{ background: 'rgba(15,15,20,0.65)', backdropFilter: 'blur(16px)' }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        className="relative w-full max-w-[360px] rounded-[28px] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
          boxShadow: '0 32px 80px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15) inset',
        }}
      >
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #3b5bdb, #6366f1, #8b5cf6)' }} />
        <div className="p-7 flex flex-col items-center gap-6">
          {done && !error ? (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 180, delay: 0.05 }}
                className="relative w-20 h-20 flex items-center justify-center"
              >
                <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }} />
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-100">
                  <CheckCircle size={38} className="text-emerald-500" strokeWidth={1.75} />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center">
                <h3 className="text-[18px] font-bold text-neutral-900 tracking-tight">Ready to present!</h3>
                <p className="text-[13px] text-neutral-500 mt-1.5 leading-snug">Your PPTX is fully editable in PowerPoint,<br/>Keynote & LibreOffice.</p>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                onClick={onClose}
                className="w-full h-11 rounded-2xl text-white font-bold text-[14px] tracking-tight hover:opacity-90 transition-all active:scale-[0.97] shadow-lg"
                style={{ background: 'linear-gradient(135deg, #3b5bdb, #6366f1)' }}
              >
                Done
              </motion.button>
            </>
          ) : error ? (
            <>
              <div className="w-18 h-18 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center" style={{ width: 72, height: 72 }}>
                <X size={32} className="text-red-500" strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <h3 className="text-[17px] font-bold text-neutral-900">Export Failed</h3>
                <p className="text-[12px] text-red-500/90 mt-2 max-w-[280px] text-center break-words leading-snug">{error}</p>
                {error.includes('Sign in required') && (
                  <a href="/login" className="block mt-4 text-sm font-bold text-indigo-600 hover:underline">Go to Login</a>
                )}
              </div>
              <button onClick={onClose} className="w-full h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-[14px] transition-all active:scale-[0.97]">
                Close
              </button>
            </>
          ) : (
            <>
              <p className="w-full text-[11px] leading-relaxed text-indigo-700/90 bg-indigo-50/90 border border-indigo-100 rounded-xl px-3.5 py-2.5 text-center text-pretty">
                Note: Slide animations and transitions will not be applied to the exported Microsoft PowerPoint file. Animations are exclusively experienced beautifully here in Orbstera.
              </p>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'conic-gradient(from 0deg, transparent 60%, rgba(99,102,241,0.5) 100%)', borderRadius: '50%' }}
                />
                <div className="absolute inset-[3px] rounded-full bg-white" />
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}>
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
                    <FileDown size={22} className="text-indigo-600" strokeWidth={1.75} />
                  </motion.div>
                </div>
              </div>
              <div className="w-full space-y-2">
                {EXPORT_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const active = i === step;
                  const isDone = i < step;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: active || isDone ? 1 : 0.35, x: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all ${active ? 'border' : 'bg-transparent'}`}
                      style={active ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))', borderColor: 'rgba(99,102,241,0.18)' } : {}}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${isDone ? 'bg-emerald-50' : active ? 'bg-indigo-50' : 'bg-neutral-100'}`}>
                        {isDone ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                            <CheckCircle size={15} className="text-emerald-500" strokeWidth={2} />
                          </motion.div>
                        ) : active ? (
                          <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}>
                            <Icon size={15} className="text-indigo-600" strokeWidth={1.75} />
                          </motion.div>
                        ) : (
                          <Icon size={15} className="text-neutral-300" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-semibold leading-tight ${active ? 'text-indigo-700' : isDone ? 'text-neutral-800' : 'text-neutral-300'}`}>{s.label}</p>
                        {active && <motion.p initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] text-neutral-400 mt-0.5">{s.detail}</motion.p>}
                      </div>
                      {isDone && <span className="text-[10px] font-semibold text-emerald-500 shrink-0">Done</span>}
                    </motion.div>
                  );
                })}
              </div>
              <div className="w-full h-[3px] rounded-full bg-neutral-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #3b5bdb, #6366f1, #8b5cf6)' }}
                  initial={{ width: '5%' }} animate={{ width: `${Math.round(((step + 1) / EXPORT_STEPS.length) * 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 font-medium -mt-2">Step {step + 1} of {EXPORT_STEPS.length}</p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PublicViewer({
  presentation,
  ownerPlan,
}: {
  presentation: PresentationData;
  ownerPlan?: string;
}) {
  const [started, setStarted] = useState(false);
  const [visitorCtaVisible, setVisitorCtaVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [scale, setScale] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  // Export State
  const [exportStep, setExportStep] = useState(-1);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSlideNavigated = useRef(false);

  const slides = presentation?.slides || [];
  const slide = slides[currentIndex];
  const palette = presentation?.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
  const accent = palette[2] || '#7B61FF';
  const title = presentation?.title || 'Untitled Presentation';

  const motionCtx: MotionContext = useMemo(() => ({
    animationStyle: presentation?.animationStyle,
    presentationType: presentation?.presentationType,
    styleMode: presentation?.styleMode,
    defaultSlideTransition: presentation?.defaultSlideTransition,
  }), [presentation]);

  const activeTransition = useMemo(() => {
    if (!slide) return 'fade';
    return inferSlideTransition(slide, motionCtx);
  }, [slide, motionCtx]);

  const slideVariants = useMemo(
    () => getSlideTransitionVariants(activeTransition, slide?.slideTransitionDurationMs),
    [activeTransition, slide?.slideTransitionDurationMs],
  );

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      hasSlideNavigated.current = true;
      setDirection(1);
      setCurrentIndex((c) => c + 1);
    }
  }, [currentIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      hasSlideNavigated.current = true;
      setDirection(-1);
      setCurrentIndex((c) => c - 1);
    }
  }, [currentIndex]);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  const toggleFs = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch { }
  }, []);

  const handleExportCheck = async () => {
    if (!presentation || exportStep >= 0) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      let isPaidUser = false;
      let credits = 0;
      
      if (user) {
        credits = user.user_metadata?.watermark_free_exports || 0;
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        const plan = profile?.plan?.toLowerCase() || 'free';
        isPaidUser = plan === 'pro' || plan === 'creator_pro' || plan === 'student_pro';
      }

      if (!isPaidUser && credits <= 0) {
        setShowWatermarkModal(true);
        return;
      }
      
      startExport();
    } catch (err) {
      startExport(); // fallback to export (watermarked by server)
    }
  };

  const startExport = async () => {
    setShowWatermarkModal(false);
    setExportStep(0);
    setExportDone(false);
    setExportError(null);

    try {
      await new Promise((r) => setTimeout(r, 600));
      setExportStep(1);

      await exportToPptx(presentation!);
      setExportStep(2);

      await new Promise((r) => setTimeout(r, 500));
      setExportDone(true);
    } catch (err) {
      setExportError(
        err instanceof Error && err.message?.trim()
          ? err.message.trim()
          : 'Export failed. Please try again.',
      );
    }
  };

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'one_time_export' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch (err) {
      alert('Failed to initiate checkout. Please try again later.');
    }
  };

  useEffect(() => {
    const calc = () => {
      const pad = fullscreen ? 0 : 32;
      const sw = Math.min((window.innerWidth - pad) / 1280, (window.innerHeight - pad) / 720);
      setScale(Math.min(sw, fullscreen ? 2.2 : 1.5));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [fullscreen]);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      resetHideTimer();
      if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) goNext();
      else if (['ArrowLeft', 'Backspace', 'PageUp'].includes(e.key)) goPrev();
      else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFs(); }
      else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setAutoplay(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, goNext, goPrev, resetHideTimer, toggleFs]);

  useEffect(() => {
    if (!started) return;
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => window.removeEventListener('mousemove', resetHideTimer);
  }, [started, resetHideTimer]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!autoplay || slides.length === 0) return;
    const id = window.setInterval(() => {
      setCurrentIndex((c) => {
        if (c >= slides.length - 1) {
          setAutoplay(false);
          return c;
        }
        hasSlideNavigated.current = true;
        setDirection(1);
        return c + 1;
      });
    }, 9000);
    return () => clearInterval(id);
  }, [autoplay, slides.length]);

  if (!presentation || !slide) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #08090f 0%, #0d1117 100%)' }}>
        <div className="text-white/30 mb-6"><Presentation size={48} strokeWidth={1} /></div>
        <h1 className="text-2xl font-bold text-white mb-3">Presentation Not Found</h1>
        <p className="text-white/50 text-sm max-w-xs text-center mb-8">This link may have expired or the deck was deleted.</p>
        <a href="/" className="px-6 py-3 rounded-full text-white text-sm font-bold transition-opacity hover:opacity-80" style={{ background: 'linear-gradient(135deg, #3b5bdb, #6366f1)' }}>
          Create your own with Orbstera AI
        </a>
      </div>
    );
  }

  const progress = slides.length > 1 ? currentIndex / (slides.length - 1) : 1;
  const firstSlide = slides[0];
  const bgEl = firstSlide ? (firstSlide.elements || []).find(
    el => el.type === 'image' && el.zIndex === 0 && el.x <= 2 && el.y <= 2
  ) : undefined;

  // ── Splash / Intro Screen ────────────────────────────────────────────
  if (!started) {
    return (
      <div
        ref={shellRef}
        className="fixed inset-0 overflow-hidden flex flex-col bg-white"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-[0.06]" style={{ background: `radial-gradient(circle, ${accent}, transparent 65%)`, filter: 'blur(60px)' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.04]" style={{ background: `radial-gradient(circle, ${accent}, transparent 65%)`, filter: 'blur(80px)' }} />
        </div>

        {/* Top nav */}
        <div className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 shrink-0">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png.png" alt="Orbstera" className="h-7 w-auto object-contain" />
          </a>
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-neutral-700 border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm transition-all"
          >
            <Sparkles size={12} className="text-indigo-600" />
            <span>Make your own</span>
          </a>
        </div>

        {/* Main hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center gap-8">
          {/* Slide count badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm"
            style={{ borderColor: `${accent}30`, background: `${accent}08`, color: `${accent}` }}
          >
            <Layers size={13} />
            {slides.length} slides
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-neutral-900 tracking-tight leading-[1.12] max-w-3xl text-balance"
          >
            {title}
          </motion.h1>

          {/* Slide preview strip */}
          {bgEl?.src && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="w-full max-w-[420px] rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 shadow-xl"
            >
              <div className="relative" style={{ aspectRatio: '16/9' }}>
                <img src={bgEl.src} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/30 backdrop-blur-md border border-white/50 shadow-lg">
                    <Play size={22} className="text-white" style={{ marginLeft: 3 }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={() => setStarted(true)}
              className="group flex items-center gap-3 px-8 py-4 rounded-full text-white font-bold text-base shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${palette[1] === '#FFFFFF' ? accent : palette[1] || accent})`,
              }}
            >
              <Play size={18} className="fill-white group-hover:scale-110 transition-transform" />
              View Presentation
            </button>
            <button
              onClick={handleExportCheck}
              className="flex items-center gap-2 px-6 py-4 rounded-full text-neutral-600 font-semibold text-sm border border-neutral-200 bg-white hover:bg-neutral-50 hover:text-neutral-900 shadow-sm transition-all"
            >
              <Download size={15} />
              Download PPTX
            </button>
          </motion.div>

          {/* Keyboard hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-neutral-400 text-xs font-medium"
          >
            Use ← → arrow keys to navigate Â· F for fullscreen
          </motion.p>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-center pb-6 pt-2">
          <a href="/" className="flex items-center gap-1.5 text-neutral-400 text-xs hover:text-neutral-600 transition-colors">
            <span>Made with</span>
            <span className="font-bold text-neutral-700">Orbstera AI</span>
            <ExternalLink size={10} />
          </a>
        </div>

        <ShareVisitorCtaBar onVisibilityChange={setVisitorCtaVisible} />
        <ShareWatermarkBadge ownerPlan={ownerPlan} hasBottomBar={visitorCtaVisible} />
      </div>
    );
  }

  // ── Viewer ────────────────────────────────────────────────────────────
  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-neutral-100"
      onClick={() => resetHideTimer()}
    >
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[4px] z-[210] bg-neutral-200">
        <motion.div
          className="h-full rounded-r-full"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}dd)`, boxShadow: `0 0 12px ${accent}40` }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Top HUD — title + slide X/Y */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 left-0 right-0 z-[210] flex items-center justify-between px-6 pointer-events-none"
          >
            <a href="/" target="_blank" className="pointer-events-auto">
              <img src="/logo.png.png" alt="Orbstera" className="h-6 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity drop-shadow-sm" />
            </a>
            <div className="flex items-center gap-3 pointer-events-none bg-white/80 backdrop-blur-md border border-neutral-200/60 px-4 py-1.5 rounded-full shadow-sm">
              <span className="text-neutral-700 text-xs font-semibold truncate max-w-[180px] sm:max-w-xs">{title}</span>
              <div className="w-px h-3 bg-neutral-300" />
              <span className="text-neutral-500 text-xs tabular-nums">{currentIndex + 1} / {slides.length}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide canvas */}
      <motion.div
        animate={{ scale }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 1280, height: 720,
          transformOrigin: 'center center', position: 'relative',
          boxShadow: fullscreen ? 'none' : '0 24px 64px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
          borderRadius: fullscreen ? 0 : 12,
          overflow: 'hidden', flexShrink: 0,
          border: fullscreen ? 'none' : '1px solid rgba(0,0,0,0.05)',
          willChange: 'transform',
          backgroundColor: '#fff',
          perspective: 1200,
          transformStyle: 'preserve-3d',
        }}
      >
        <AnimatePresence mode="sync" custom={direction} initial={false}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial={hasSlideNavigated.current ? 'enter' : false}
            animate="center"
            exit="exit"
            layout={false}
            className="absolute inset-0"
            style={{ willChange: 'opacity, transform, filter', backfaceVisibility: 'hidden' }}
          >
            <PresentSlideView slide={slide} palette={palette} animationsOn={true} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Bottom controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[210] flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-xl pointer-events-auto"
            style={{ 
              background: 'rgba(255,255,255,0.85)', 
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(0,0,0,0.08)'
            }}
          >
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Dot navigation */}
            <div className="flex items-center gap-1.5 px-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                  className="transition-all rounded-full"
                  style={{
                    width: i === currentIndex ? 24 : 6,
                    height: 6,
                    background: i === currentIndex ? accent : 'rgba(0,0,0,0.15)',
                  }}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={currentIndex === slides.length - 1}
              className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={18} />
            </button>

            <div className="w-px h-5 bg-neutral-200 mx-1" />

            <button
              onClick={() => setAutoplay(a => !a)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                autoplay ? 'text-indigo-600 bg-indigo-50' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
              }`}
              title={autoplay ? 'Pause autoplay' : 'Autoplay'}
            >
              {autoplay ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <button
              onClick={toggleFs}
              className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-all"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watermark + CTA */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-6 right-6 z-[210] flex flex-col items-end gap-2 pointer-events-auto"
          >
            <a
              href="/"
              target="_blank"
              className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-all shadow-sm"
              style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}
            >
              <Sparkles size={11} className="text-indigo-600" />
              Make your own — it's free
              <ExternalLink size={10} />
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Watermark Upsell Modal ── */}
      <AnimatePresence>
        {showWatermarkModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 safe-pad-y"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-black/[0.06] p-6 sm:p-8 w-full max-w-sm max-h-[min(90dvh,640px)] overflow-y-auto flex flex-col items-center gap-6 relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <Sparkles size={28} className="text-amber-500" />
              </div>
              <div className="text-center min-w-0">
                <h3 className="text-xl font-bold text-black text-balance">Remove Watermark</h3>
                <p className="text-sm text-gray-500 mt-2 text-pretty">
                  Export your presentation without the Orbstera watermark.
                </p>
              </div>
              
              <div className="w-full space-y-3 shrink-0">
                <button
                  onClick={handleCheckout}
                  className="w-full min-h-12 py-3 rounded-xl bg-primary text-white font-bold text-[15px] hover:bg-primary/90 transition-all active:scale-[0.97] flex items-center justify-center gap-2 touch-manipulation"
                >
                  Pay ₱30 once
                </button>
                <button
                  onClick={startExport}
                  className="w-full min-h-12 py-3 rounded-xl bg-black/[0.03] text-gray-600 font-semibold text-[14px] hover:bg-black/[0.06] transition-all active:scale-[0.97] touch-manipulation text-balance px-2"
                >
                  Export with watermark (Free)
                </button>
              </div>
              
              <button type="button" onClick={() => setShowWatermarkModal(false)} className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] p-2 text-gray-400 hover:text-black touch-manipulation">
                <X size={20} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Export Modal ── */}
      <AnimatePresence>
        {exportStep >= 0 && (
          <ExportModal
            step={exportStep}
            done={exportDone}
            error={exportError}
            onClose={() => setExportStep(-1)}
          />
        )}
      </AnimatePresence>

      <ShareVisitorCtaBar onVisibilityChange={setVisitorCtaVisible} />
      <ShareWatermarkBadge ownerPlan={ownerPlan} hasBottomBar={visitorCtaVisible} />
    </div>
  );
}
