'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { SlideElement, Slide, AnimationEntrance, ChartData } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Presentation,
  Users,
  Sparkles,
  Zap,
  ZapOff,
} from 'lucide-react';
import {
  getElementEntranceVariants,
  getSlideTransitionVariants,
  inferSlideTransition,
  durSec,
  type MotionContext,
} from '@/lib/presentationMotion';

// ── Shape renderer — matches Konva canvas shapes ──────────────────────────────
function ShapeEl({ el, accent }: { el: SlideElement; accent: string }) {
  const ss   = el.shapeStyle || {};
  const fill = ss.fill || accent;

  const borderStyle = ss.strokeWidth && ss.stroke
    ? `${ss.strokeWidth}px solid ${ss.stroke}`
    : 'none';

  if (!el.shapeType || el.shapeType === 'rect') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: fill,
        borderRadius: `${ss.cornerRadius || 0}px`,
        border: borderStyle,
        boxShadow: ss.shadowBlur ? `${ss.shadowOffsetX||0}px ${ss.shadowOffsetY||0}px ${ss.shadowBlur}px ${ss.shadowColor||'rgba(0,0,0,0.5)'}` : undefined,
      }} />
    );
  }

  if (el.shapeType === 'circle') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: fill,
        borderRadius: '50%',
        border: borderStyle,
      }} />
    );
  }

  if (el.shapeType === 'triangle') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: fill,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      }} />
    );
  }

  if (el.shapeType === 'star') {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
        <polygon
          points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
          fill={fill}
          stroke={ss.stroke || 'none'}
          strokeWidth={ss.strokeWidth || 0}
        />
      </svg>
    );
  }

  if (el.shapeType === 'line') {
    return (
      <svg viewBox={`0 0 ${el.width} ${el.height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
        <line
          x1={0} y1={el.height / 2}
          x2={el.width} y2={el.height / 2}
          stroke={ss.stroke || fill}
          strokeWidth={ss.strokeWidth || 3}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (el.shapeType === 'arrow') {
    const hw = Math.min(20, el.height * 0.7);
    return (
      <svg viewBox={`0 0 ${el.width} ${el.height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <marker id={`arrowhead-${el.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={fill} />
          </marker>
        </defs>
        <line
          x1={0} y1={el.height / 2}
          x2={el.width - hw} y2={el.height / 2}
          stroke={fill}
          strokeWidth={ss.strokeWidth || 3}
          strokeLinecap="round"
          markerEnd={`url(#arrowhead-${el.id})`}
        />
      </svg>
    );
  }

  return <div style={{ width: '100%', height: '100%', backgroundColor: fill }} />;
}

function splitWords(text: string) {
  return text.split(/(\s+)/).filter((w) => w.length > 0);
}

function AnimatedTextContent({
  content,
  entrance,
  baseStyle,
}: {
  content: string;
  entrance: AnimationEntrance | undefined;
  baseStyle: React.CSSProperties;
}) {
  if (entrance === 'typewriterWords') {
    const words = splitWords(content || '');
    return (
      <div style={{ ...baseStyle, overflow: 'hidden' }}>
        {words.map((w, wi) => (
          <motion.span
            key={`${wi}-${w.slice(0, 8)}`}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              delay: wi * 0.04,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ display: 'inline', willChange: 'opacity, transform' }}
          >
            {w}
          </motion.span>
        ))}
      </div>
    );
  }

  const lines = (content || '').split('\n');
  if (entrance === 'staggerLines' && lines.length > 1) {
    return (
      <div style={{ ...baseStyle, overflow: 'hidden' }}>
        {lines.map((line, li) => (
          <motion.div
            key={li}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: li * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: 'opacity, transform' }}
          >
            {line || '\u00a0'}
          </motion.div>
        ))}
      </div>
    );
  }

  return <div style={baseStyle}>{content}</div>;
}

function PresentChartEl({ el, accent }: { el: SlideElement; accent: string }) {
  const cd: ChartData | undefined = el.chartData;
  const values = cd?.datasets?.[0]?.data?.length
    ? cd.datasets[0].data
    : [0.55, 0.78, 0.42, 0.88, 0.62];
  const labels = cd?.labels?.length ? cd.labels : values.map((_, i) => String(i + 1));
  const max = Math.max(...values, 1);
  const n = values.length;

  return (
    <div
      className="flex flex-col justify-end h-full w-full rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 12,
      }}
    >
      <div className="flex items-end flex-1 gap-2 w-full min-h-0">
        {values.map((v, i) => {
          const h = (v / max) * (el.height * 0.62);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end min-w-0">
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{
                  delay: 0.15 + i * 0.07,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: '100%',
                  height: Math.max(4, h),
                  borderRadius: 6,
                  background: `linear-gradient(180deg, ${accent} 0%, ${accent}99 100%)`,
                  transformOrigin: 'bottom',
                  willChange: 'transform',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2 text-[9px] font-bold uppercase tracking-wider text-white/35 truncate w-full">
        {labels.slice(0, n).map((lb, i) => (
          <span key={i} className="flex-1 text-center truncate min-w-0">{lb}</span>
        ))}
      </div>
    </div>
  );
}

// ── Single rendered slide (background + elements) ─────────────────────────────
function PresentSlideView({
  slide,
  palette,
  animationsOn,
}: {
  slide: Slide;
  palette: string[];
  animationsOn: boolean;
}) {
  const bg     = palette[0] || '#05050A';
  const accent = palette[2] || '#7B61FF';

  const bgEl = findDeckBackgroundElement(slide.elements);
  const elements = (slide.elements || []).filter((el) => el.visible !== false && el !== bgEl);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">

      <div className="absolute inset-0" style={{ background: bg }} />

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accent}33 0%, transparent 55%, ${accent}22 100%)`,
        }}
      />

      {bgEl?.src && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={false}
          animate={animationsOn ? { scale: [1, 1.035, 1] } : { scale: 1 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          style={{ willChange: animationsOn ? 'transform' : undefined }}
        >
          <img
            src={bgEl.src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: bgEl.opacity ?? 0.18 }}
          />
        </motion.div>
      )}

      {elements.map((el, i) => {
        const entrance   = el.animation?.entrance;
        const durationMs = el.animation?.duration ?? 600;
        const delayMs    = el.animation == null ? i * 80 : (el.animation.delay ?? 0);
        const baseOpacity = el.opacity ?? 1;
        const rawVariants = animationsOn
          ? getElementEntranceVariants(entrance, durationMs, delayMs)
          : { hidden: { opacity: baseOpacity }, visible: { opacity: baseOpacity } };

        // IMPORTANT: don't set `style.opacity` when animating — it can override the variant opacity
        // and make entrance effects appear to "not work" in PresentMode.
        const variants = (() => {
          // clone to avoid mutating shared objects from helpers
          const v: any = {
            hidden: { ...(rawVariants as any).hidden },
            visible: { ...(rawVariants as any).visible },
          };
          if (entrance === 'none' || !animationsOn) {
            v.hidden.opacity = baseOpacity;
            v.visible.opacity = baseOpacity;
            return v;
          }
          // Ensure the final opacity matches the element opacity (slider).
          v.visible.opacity = baseOpacity;
          return v;
        })();

        const textBase: React.CSSProperties = {
          width:          '100%',
          height:         '100%',
          fontFamily:     el.textStyle?.fontFamily || 'Inter, sans-serif',
          fontSize:       `${el.textStyle?.fontSize || 24}px`,
          fontWeight:     el.textStyle?.fontWeight || 'normal',
          fontStyle:      el.textStyle?.fontStyle  || 'normal',
          textDecoration: el.textStyle?.textDecoration || 'none',
          color:          el.textStyle?.color || '#FFFFFF',
          textAlign:      (el.textStyle?.textAlign as React.CSSProperties['textAlign']) || 'left',
          lineHeight:     el.textStyle?.lineHeight || 1.4,
          letterSpacing:  el.textStyle?.letterSpacing ? `${el.textStyle.letterSpacing}px` : undefined,
          whiteSpace:     'pre-wrap',
          wordBreak:      'break-word',
          overflow:       'hidden',
        };

        const inner =
          el.type === 'text' ? (
            entrance === 'typewriterWords' || entrance === 'staggerLines' ? (
              <AnimatedTextContent content={el.content || ''} entrance={entrance} baseStyle={textBase} />
            ) : (
              <div style={textBase}>{el.content}</div>
            )
          ) : el.type === 'image' && el.src ? (
            <motion.img
              src={el.src}
              alt=""
              style={{
                width:     '100%',
                height:    '100%',
                objectFit: 'cover',
                display:   'block',
              }}
              initial={animationsOn && entrance === 'cinematicImageZoom' ? { scale: 1.08 } : false}
              animate={animationsOn && entrance === 'cinematicImageZoom' ? { scale: [1.08, 1] } : {}}
              transition={{ duration: durSec(durationMs), ease: [0.22, 1, 0.36, 1] }}
            />
          ) : el.type === 'shape' ? (
            <ShapeEl el={el} accent={accent} />
          ) : el.type === 'chart' ? (
            <PresentChartEl el={el} accent={accent} />
          ) : el.type === 'icon' ? (
            <div
              className="w-full h-full flex items-center justify-center text-white/90"
              style={{ fontSize: Math.min(el.width, el.height) * 0.55 }}
            >
              {el.content || '◆'}
            </div>
          ) : null;

        return (
          <motion.div
            key={el.id}
            variants={variants}
            initial={animationsOn ? 'hidden' : 'visible'}
            animate="visible"
            style={{
              position:  'absolute',
              left:      el.x,
              top:       el.y,
              width:     el.width,
              height:    el.height,
              zIndex:    el.zIndex || 1,
              // Don't set `transform` directly; it overrides Framer Motion transforms (x/y/scale/etc).
              // Use `rotate` so motion can compose transforms and entrances actually animate.
              rotate:    el.rotation || 0,
              overflow:  'visible',
              willChange: animationsOn ? 'opacity, transform, filter' : undefined,
            }}
          >
            {inner}
          </motion.div>
        );
      })}
    </div>
  );
}

function CinematicBackdrop({
  palette,
  enabled,
}: {
  palette: string[];
  enabled: boolean;
}) {
  const accent = palette[2] || '#7B61FF';
  if (!enabled) return null;

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: `${(i * 37) % 100}%`,
        y: `${(i * 23) % 100}%`,
        s: 1 + (i % 4) * 0.4,
        d: 18 + (i % 9) * 4,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          background: [
            `radial-gradient(circle at 20% 30%, ${accent}22 0%, transparent 45%)`,
            `radial-gradient(circle at 80% 40%, ${accent}28 0%, transparent 50%)`,
            `radial-gradient(circle at 50% 70%, ${accent}18 0%, transparent 48%)`,
            `radial-gradient(circle at 20% 30%, ${accent}22 0%, transparent 45%)`,
          ],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/[0.04]"
          style={{
            width: p.s,
            height: p.s,
            left: p.x,
            top: p.y,
            willChange: 'transform, opacity',
          }}
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.45, 0.15] }}
          transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut', delay: p.id * 0.12 }}
        />
      ))}
    </div>
  );
}

// ── Main Present Mode ─────────────────────────────────────────────────────────
export function PresentMode() {
  const { presentation, editor, setEditorState } = usePresentationStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction,    setDirection]    = useState(1);
  const [scale,        setScale]        = useState(1);
  const [showPresenterChrome, setShowPresenterChrome] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [booting, setBooting]           = useState(false);
  const [fullscreen, setFullscreen]     = useState(false);
  const [autoplay, setAutoplay]         = useState(false);
  const [speakerView, setSpeakerView]   = useState(true);
  const [audienceMode, setAudienceMode] = useState(false);
  const [effectsOn, setEffectsOn]       = useState(true);
  const [animationsOn, setAnimationsOn] = useState(true);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shellRef  = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const slides       = presentation?.slides || [];
  const slide        = slides[currentIndex];
  const isPresenting = editor.isPresenting;
  const palette      = presentation?.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];

  const motionCtx: MotionContext = useMemo(
    () => ({
      animationStyle: presentation?.animationStyle,
      presentationType: presentation?.presentationType,
      styleMode: presentation?.styleMode,
      defaultSlideTransition: presentation?.defaultSlideTransition,
    }),
    [presentation?.animationStyle, presentation?.presentationType, presentation?.styleMode, presentation?.defaultSlideTransition],
  );

  const activeTransition = useMemo(() => {
    if (!slide) return 'fade';
    // The presenter must honor user-selected motion; do not hard-disable transitions here.
    return inferSlideTransition(slide, motionCtx);
  }, [slide, motionCtx]);

  const slideVariants = useMemo(
    () => getSlideTransitionVariants(activeTransition, slide?.slideTransitionDurationMs),
    [activeTransition, slide?.slideTransitionDurationMs],
  );

  const cinematicEffects =
    (presentation?.cinematicPresenterEffects !== false) && effectsOn;

  const notes = (slide?.speakerNotes || '').trim();

  const close = useCallback(() => {
    setEditorState({ isPresenting: false });
    setCurrentIndex(0);
    setAutoplay(false);
    if (document.fullscreenElement && shellRef.current?.contains(document.fullscreenElement)) {
      void document.exitFullscreen();
    }
  }, [setEditorState]);

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setDirection(1);
      setCurrentIndex((c) => c + 1);
    }
  }, [currentIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((c) => c - 1);
    }
  }, [currentIndex]);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3200);
  }, []);

  const toggleFs = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isPresenting) return;
    const calc = () => {
      const pad = fullscreen ? 8 : 32;
      const sw = Math.min(
        (window.innerWidth  - pad) / 1280,
        (window.innerHeight - pad) / 720,
      );
      setScale(Math.min(sw, fullscreen ? 2.2 : 1.5));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isPresenting, fullscreen]);

  useEffect(() => {
    if (!isPresenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (showPresenterChrome) resetHideTimer();
      if (e.key === 'Escape') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else close();
      } else if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) goNext();
      else if (['ArrowLeft', 'Backspace', 'PageUp'].includes(e.key)) goPrev();
      else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFs();
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAutoplay((v) => !v);
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowPresenterChrome((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPresenting, close, goNext, goPrev, resetHideTimer, toggleFs, showPresenterChrome]);

  useEffect(() => {
    if (!isPresenting || !showPresenterChrome) return;
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => window.removeEventListener('mousemove', resetHideTimer);
  }, [isPresenting, resetHideTimer, showPresenterChrome]);

  useEffect(() => {
    if (!isPresenting) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      const el = shellRef.current;
      if (cancelled || !el || document.fullscreenElement) return;
      void el.requestFullscreen().catch(() => {});
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isPresenting]);

  useEffect(() => {
    if (!isPresenting) return;
    setCurrentIndex(0);
    setBooting(true);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setBooting(false));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [isPresenting]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!autoplay || !isPresenting || slides.length === 0) return;
    const id = window.setInterval(() => {
      setCurrentIndex((c) => {
        if (c >= slides.length - 1) {
          setAutoplay(false);
          return c;
        }
        setDirection(1);
        return c + 1;
      });
    }, 9000);
    return () => clearInterval(id);
  }, [autoplay, isPresenting, slides.length]);

  useEffect(() => {
    if (presentation?.cinematicPresenterEffects === false) setEffectsOn(false);
    else setEffectsOn(true);
  }, [presentation?.cinematicPresenterEffects]);

  if (!isPresenting || !presentation || !slide) return null;

  const dotCount = Math.min(slides.length, 32);
  const progress = slides.length > 1 ? currentIndex / (slides.length - 1) : 1;

  return (
    <AnimatePresence>
      <motion.div
        ref={shellRef}
        key="present-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#010104]"
        onClick={() => {
          if (showPresenterChrome) resetHideTimer();
        }}
      >
        <CinematicBackdrop palette={palette} enabled={cinematicEffects} />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${palette[2]}14 0%, transparent 62%)`,
          }}
        />

        <AnimatePresence>
          {booting && (
            <motion.div
              key="boot"
              className="absolute inset-0 z-[220] flex flex-col items-center justify-center bg-[#020208]/95 backdrop-blur-xl pointer-events-none"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-white/10 border-t-white/70"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              />
              <p className="mt-6 text-[10px] font-black tracking-[0.45em] uppercase text-white/35">
                Present
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {showPresenterChrome && (
        <div className="absolute top-0 left-0 right-0 h-[3px] z-[210] bg-black/40">
          <motion.div
            className="h-full rounded-b-full"
            style={{
              background: `linear-gradient(90deg, ${palette[2]}aa, ${palette[1]}66)`,
              boxShadow: `0 0 24px ${palette[2]}55`,
            }}
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        )}

        <motion.div
          animate={{ scale }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width:           1280,
            height:          720,
            transformOrigin: 'center center',
            position:        'relative',
            boxShadow:       `0 80px 160px -20px rgba(0,0,0,0.95), 0 0 120px -30px ${palette[2]}22`,
            borderRadius:    8,
            overflow:        'hidden',
            flexShrink:      0,
            border:          '1px solid rgba(255,255,255,0.08)',
            willChange:      'transform',
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
              style={{ willChange: 'opacity, transform, filter' }}
            >
              <PresentSlideView
                slide={slide}
                palette={palette}
                // "Motion" toggle should control element entrances even if OS prefers reduced motion.
                animationsOn={animationsOn}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Speaker notes */}
        <AnimatePresence>
          {showPresenterChrome && speakerView && !audienceMode && notes && showControls && (
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35 }}
              className="absolute bottom-[108px] left-1/2 -translate-x-1/2 z-[205] w-[min(92vw,560px)] max-h-[22vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/55 backdrop-blur-2xl px-5 py-4 text-left pointer-events-auto shadow-2xl"
            >
              <p className="text-[8px] font-black tracking-[0.35em] uppercase text-white/30 mb-2">Speaker</p>
              <p className="text-[13px] leading-relaxed text-white/85 whitespace-pre-wrap">{notes}</p>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Thumbnail filmstrip */}
        {showPresenterChrome && showControls && slides.length > 1 && (
          <div className="absolute bottom-[102px] left-1/2 -translate-x-1/2 z-[204] flex gap-2 max-w-[min(94vw,920px)] overflow-x-auto pb-1 px-2 pointer-events-auto scrollbar-none opacity-90">
            {slides.slice(0, dotCount).map((s, i) => (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => {
                  setDirection(i > currentIndex ? 1 : -1);
                  setCurrentIndex(i);
                }}
                whileHover={{ y: -2, scale: 1.03 }}
                className={`relative shrink-0 w-[72px] aspect-video rounded-lg overflow-hidden border transition-colors ${
                  i === currentIndex ? 'border-white/40 ring-2 ring-white/20' : 'border-white/10 opacity-70 hover:opacity-100'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[2]}33 100%)`,
                }}
              >
                <span className="absolute bottom-1 right-1 text-[8px] font-black text-white/50 tabular-nums">
                  {i + 1}
                </span>
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showPresenterChrome && showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="absolute inset-0 pointer-events-none"
            >
              <button
                type="button"
                onClick={close}
                className="absolute top-6 right-6 z-50 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/50 hover:text-white border border-white/10 backdrop-blur-2xl transition-all pointer-events-auto group"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>

              <div className="absolute top-6 left-6 z-50 flex flex-wrap gap-2 pointer-events-auto max-w-[min(92vw,520px)]">
                <button
                  type="button"
                  onClick={toggleFs}
                  className="h-9 px-3 rounded-full bg-black/45 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl flex items-center gap-2"
                >
                  {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => setAutoplay((v) => !v)}
                  className={`h-9 px-3 rounded-full border text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl flex items-center gap-2 ${
                    autoplay ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-100' : 'bg-black/45 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {autoplay ? <Pause size={14} /> : <Play size={14} />}
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setAudienceMode((v) => !v)}
                  className={`h-9 px-3 rounded-full border text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl flex items-center gap-2 ${
                    audienceMode ? 'bg-violet-500/25 border-violet-300/35 text-violet-100' : 'bg-black/45 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {audienceMode ? <Users size={14} /> : <Presentation size={14} />}
                  {audienceMode ? 'Audience' : 'Presenter'}
                </button>
                <button
                  type="button"
                  onClick={() => setSpeakerView((v) => !v)}
                  disabled={audienceMode}
                  className="h-9 px-3 rounded-full bg-black/45 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl disabled:opacity-25 flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Notes
                </button>
                <button
                  type="button"
                  onClick={() => setEffectsOn((v) => !v)}
                  className={`h-9 px-3 rounded-full border text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl flex items-center gap-2 ${
                    effectsOn ? 'bg-black/45 border-white/10 text-white/80' : 'bg-black/45 border-white/10 text-white/35'
                  }`}
                >
                  {effectsOn ? <Zap size={14} /> : <ZapOff size={14} />}
                  FX
                </button>
                <button
                  type="button"
                  onClick={() => setAnimationsOn((v) => !v)}
                  className={`h-9 px-3 rounded-full border text-[10px] font-bold uppercase tracking-widest backdrop-blur-xl ${
                    animationsOn ? 'bg-black/45 border-white/10 text-amber-100/90' : 'bg-black/45 border-white/10 text-white/35'
                  }`}
                >
                  Motion
                </button>
              </div>

              <button
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="absolute left-0 top-0 h-full w-1/5 pointer-events-auto opacity-0 cursor-w-resize disabled:cursor-default z-30"
              />
              <button
                type="button"
                onClick={goNext}
                disabled={currentIndex === slides.length - 1}
                className="absolute right-0 top-0 h-full w-1/5 pointer-events-auto opacity-0 cursor-e-resize disabled:cursor-default z-30"
              />

              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-auto">
                <div className="text-white/25 text-[9px] font-black tracking-[0.45em] uppercase">
                  {currentIndex + 1} — {slides.length}
                </div>

                <div className="flex items-center gap-4 bg-black/50 backdrop-blur-[28px] px-6 py-3 rounded-full border border-white/10 shadow-[0_24px_48px_-8px_rgba(0,0,0,0.55)]">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={currentIndex === 0}
                    className="text-white/45 hover:text-white disabled:opacity-10 transition-all active:scale-90"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {slides.slice(0, dotCount).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDirection(i > currentIndex ? 1 : -1);
                          setCurrentIndex(i);
                        }}
                        className="transition-all duration-500 rounded-sm"
                        style={{
                          width:        i === currentIndex ? 26 : 5,
                          height:       4,
                          background:   i === currentIndex ? (palette[2] || '#7B61FF') : 'rgba(255,255,255,0.16)',
                          boxShadow:    i === currentIndex ? `0 0 12px ${palette[2]}66` : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={currentIndex === slides.length - 1}
                    className="text-white/45 hover:text-white disabled:opacity-10 transition-all active:scale-90"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showPresenterChrome && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="absolute left-0 top-0 h-full w-1/5 z-[215] pointer-events-auto opacity-0 cursor-w-resize disabled:cursor-default"
            />
            <button
              type="button"
              aria-label="Next slide"
              onClick={goNext}
              disabled={currentIndex === slides.length - 1}
              className="absolute right-0 top-0 h-full w-1/5 z-[215] pointer-events-auto opacity-0 cursor-e-resize disabled:cursor-default"
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
