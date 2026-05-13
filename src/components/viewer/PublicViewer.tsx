'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { SlideElement, Slide, AnimationEntrance, ChartData, PresentationData } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Presentation,
} from 'lucide-react';
import {
  getElementEntranceVariants,
  getSlideTransitionVariants,
  inferSlideTransition,
  type MotionContext,
} from '@/lib/presentationMotion';

function ShapeEl({ el, accent, markerSuffix }: { el: SlideElement; accent: string; markerSuffix?: string }) {
  const ss = el.shapeStyle || {};
  const fill = ss.fill || accent;
  const sw = ss.strokeWidth || 0;
  const stroke = ss.stroke || 'transparent';
  const borderStyle = sw && stroke !== 'transparent' ? `${sw}px solid ${stroke}` : 'none';
  const corner = ss.cornerRadius || 0;

  if (!el.shapeType || el.shapeType === 'rect') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: fill,
          borderRadius: `${corner}px`,
          border: borderStyle,
        }}
      />
    );
  }
  if (el.shapeType === 'circle') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: fill,
          borderRadius: '50%',
          border: borderStyle,
        }}
      />
    );
  }
  if (el.shapeType === 'triangle') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
        <polygon points="50,2 98,98 2,98" fill={fill} stroke={stroke !== 'transparent' ? stroke : 'none'} strokeWidth={sw ? Math.min(sw, 3) : 0} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  if (el.shapeType === 'star') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        <polygon
          points="50,6 61,35 92,35 68,54 79,88 50,70 21,88 32,54 8,35 39,35"
          fill={fill}
          stroke={stroke !== 'transparent' ? stroke : 'none'}
          strokeWidth={sw ? Math.min(sw, 2.5) : 0}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }
  if (el.shapeType === 'line') {
    const c = stroke !== 'transparent' ? stroke : fill;
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
        <line x1="0" y1="50" x2="100" y2="50" stroke={c} strokeWidth={Math.max(sw || 4, 2) / 4} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  if (el.shapeType === 'arrow') {
    const c = fill;
    const w = Math.max(sw || 4, 2) / 4;
    const mid = `arr-${(markerSuffix || 'x').replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <marker id={mid} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={c} />
          </marker>
        </defs>
        <line x1="2" y1="50" x2="88" y2="50" stroke={c} strokeWidth={w * 2} strokeLinecap="round" markerEnd={`url(#${mid})`} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: fill, border: borderStyle, borderRadius: `${corner}px` }} />
  );
}

function ChartEl({ el, accent }: { el: SlideElement; accent: string }) {
  const cd: ChartData = el.chartData || {
    type: 'bar',
    labels: ['A', 'B', 'C', 'D'],
    datasets: [{ label: 'S', data: [4, 7, 5, 9], backgroundColor: accent }],
  };
  const pad = 8;
  const maxVal = Math.max(1, ...cd.datasets.flatMap((d) => d.data));
  const fills = Array.isArray(cd.datasets[0]?.backgroundColor)
    ? (cd.datasets[0]?.backgroundColor as string[])
    : [accent];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'rgba(15,23,42,0.55)',
        borderRadius: 10,
        border: '1px solid rgba(148,163,184,0.35)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: pad,
        gap: 6,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.9)' }}>Chart</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: 4 }}>
        {cd.labels.map((label, i) => {
          const v = cd.datasets[0]?.data[i] ?? 0;
          const hPct = (v / maxVal) * 100;
          const bg = fills[i % fills.length] || accent;
          return (
            <div
              key={`${label}-${i}`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: '78%',
                  height: `${hPct}%`,
                  minHeight: 2,
                  background: bg,
                  borderRadius: 4,
                }}
              />
              <div
                style={{
                  fontSize: 8,
                  color: 'rgba(148,163,184,0.95)',
                  marginTop: 4,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
            transition={{ delay: wi * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
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

function PresentSlideView({
  slide,
  palette,
  animationsOn,
}: {
  slide: Slide;
  palette: string[];
  animationsOn: boolean;
}) {
  const bg = palette[0] || '#05050A';
  const accent = palette[2] || '#7B61FF';
  const bgEl = findDeckBackgroundElement(slide.elements);
  const elements = (slide.elements || []).filter((el) => el.visible !== false && el !== bgEl);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0" style={{ background: bg }} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}33 0%, transparent 55%, ${accent}22 100%)` }} />

      {bgEl?.src && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={false}
          animate={animationsOn ? { scale: [1, 1.035, 1] } : { scale: 1 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src={bgEl.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: typeof bgEl.opacity === 'number' ? bgEl.opacity : 0.18 }}
          />
        </motion.div>
      )}

      {elements.map((el, i) => {
        const entrance = el.animation?.entrance;
        const durationMs = el.animation?.duration ?? 600;
        const delayMs = el.animation?.delay ?? i * 80;
        const baseOpacity = el.opacity ?? 1;
        const rawVariants = animationsOn
          ? getElementEntranceVariants(entrance, durationMs, delayMs)
          : { hidden: { opacity: baseOpacity }, visible: { opacity: baseOpacity } };

        const variants = {
          hidden: { ...(rawVariants as any).hidden },
          visible: { ...(rawVariants as any).visible },
        };
        variants.visible.opacity = baseOpacity;

        const textBase: React.CSSProperties = {
          width: '100%',
          height: '100%',
          fontFamily: el.textStyle?.fontFamily || 'Inter, sans-serif',
          fontSize: `${el.textStyle?.fontSize || 24}px`,
          fontWeight: el.textStyle?.fontWeight || 'normal',
          fontStyle: el.textStyle?.fontStyle || 'normal',
          textDecoration: el.textStyle?.textDecoration || 'none',
          color: el.textStyle?.color || '#FFFFFF',
          textAlign: (el.textStyle?.textAlign as React.CSSProperties['textAlign']) || 'left',
          lineHeight: el.textStyle?.lineHeight || 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
        };

        const rot = el.rotation || 0;

        const inner =
          el.type === 'text' ? (
            <AnimatedTextContent content={el.content || ''} entrance={entrance} baseStyle={textBase} />
          ) : el.type === 'image' && el.src ? (
            <motion.img
              src={el.src}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              initial={animationsOn && entrance === 'cinematicImageZoom' ? { scale: 1.08 } : false}
              animate={animationsOn && entrance === 'cinematicImageZoom' ? { scale: [1.08, 1] } : {}}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : el.type === 'shape' ? (
            <ShapeEl el={el} accent={accent} markerSuffix={el.id} />
          ) : el.type === 'chart' ? (
            <ChartEl el={el} accent={accent} />
          ) : el.type === 'icon' ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accent,
                fontSize: Math.min(el.width, el.height) * 0.45,
                fontWeight: 700,
              }}
            >
              ✦
            </div>
          ) : null;

        return (
          <motion.div
            key={el.id}
            variants={variants}
            initial={animationsOn ? 'hidden' : 'visible'}
            animate="visible"
            style={{
              position: 'absolute',
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              zIndex: el.zIndex ?? 1,
              overflow: 'visible',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                transform: rot ? `rotate(${rot}deg)` : undefined,
                transformOrigin: 'center center',
              }}
            >
              {inner}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function PublicViewer({ presentation }: { presentation: PresentationData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [scale, setScale] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  
  const shellRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = presentation?.slides || [];
  const slide = slides[currentIndex];
  const palette = presentation?.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];

  const motionCtx: MotionContext = useMemo(
    () => ({
      animationStyle: presentation?.animationStyle,
      presentationType: presentation?.presentationType,
      styleMode: presentation?.styleMode,
      defaultSlideTransition: presentation?.defaultSlideTransition,
    }),
    [presentation]
  );

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
    } catch { }
  }, []);

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
    const onKey = (e: KeyboardEvent) => {
      resetHideTimer();
      if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) goNext();
      else if (['ArrowLeft', 'Backspace', 'PageUp'].includes(e.key)) goPrev();
      else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFs(); }
      else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setAutoplay((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, resetHideTimer, toggleFs]);

  useEffect(() => {
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => window.removeEventListener('mousemove', resetHideTimer);
  }, [resetHideTimer]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!autoplay || slides.length === 0) return;
    const id = window.setInterval(() => {
      setCurrentIndex((c) => {
        if (c >= slides.length - 1) { setAutoplay(false); return c; }
        setDirection(1);
        return c + 1;
      });
    }, 9000);
    return () => clearInterval(id);
  }, [autoplay, slides.length]);

  if (!presentation || !slide) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold">Presentation not found.</div>;

  const progress = slides.length > 1 ? currentIndex / (slides.length - 1) : 1;

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#010104]"
      onClick={() => resetHideTimer()}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] z-[210] bg-black/40">
        <motion.div
          className="h-full rounded-b-full"
          style={{ background: `linear-gradient(90deg, ${palette[2]}aa, ${palette[1]}66)`, boxShadow: `0 0 24px ${palette[2]}55` }}
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <motion.div
        animate={{ scale }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: 1280, height: 720,
          transformOrigin: 'center center', position: 'relative',
          boxShadow: `0 80px 160px -20px rgba(0,0,0,0.95), 0 0 120px -30px ${palette[2]}22`,
          borderRadius: fullscreen ? 0 : 8,
          overflow: 'hidden', flexShrink: 0,
          border: fullscreen ? 'none' : '1px solid rgba(255,255,255,0.08)',
          willChange: 'transform',
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
          >
            <PresentSlideView slide={slide} palette={palette} animationsOn={true} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Orbstera Watermark */}
      <a 
        href="/" 
        target="_blank" 
        className="absolute bottom-6 right-6 z-[210] flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-black/70 transition-colors pointer-events-auto shadow-xl"
      >
        <span className="text-white/60 text-[11px] font-medium tracking-wide">Made with</span>
        <span className="text-white font-bold text-[13px] tracking-tight">Orbstera AI</span>
      </a>

      {showControls && slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[204] flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
          <button onClick={goPrev} className="text-white/70 hover:text-white p-2 transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-white/90 text-sm font-bold tabular-nums min-w-[3rem] text-center">{currentIndex + 1} / {slides.length}</span>
          <button onClick={goNext} className="text-white/70 hover:text-white p-2 transition-colors"><ChevronRight size={20} /></button>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <button onClick={() => setAutoplay(a => !a)} className={`p-2 transition-colors ${autoplay ? 'text-primary' : 'text-white/70 hover:text-white'}`}>
             {autoplay ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={toggleFs} className="text-white/70 hover:text-white p-2 transition-colors"><Maximize2 size={18} /></button>
        </div>
      )}
    </div>
  );
}
