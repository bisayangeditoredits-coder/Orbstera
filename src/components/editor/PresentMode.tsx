'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { SlideElement, Slide, AnimationEntrance } from '@/types';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Animation variants — duration & delay are element-driven ──────────────────
function getVariants(entrance: AnimationEntrance | undefined, durationMs: number, delayMs: number) {
  const dur = Math.max(0.1, durationMs / 1000);
  const del = delayMs / 1000;

  switch (entrance) {
    case 'fadeSlideUp':
      return {
        hidden:  { opacity: 0, y: 60 },
        visible: { opacity: 1, y: 0,
          transition: { delay: del, duration: dur, ease: [0.16, 1, 0.3, 1] } },
      };
    case 'fadeSlideLeft':
      return {
        hidden:  { opacity: 0, x: 70 },
        visible: { opacity: 1, x: 0,
          transition: { delay: del, duration: dur, ease: [0.16, 1, 0.3, 1] } },
      };
    case 'zoomIn':
      return {
        hidden:  { opacity: 0, scale: 0.6 },
        visible: { opacity: 1, scale: 1,
          transition: { delay: del, duration: dur, ease: [0.16, 1, 0.3, 1] } },
      };
    case 'elasticScale':
      return {
        hidden:  { opacity: 0, scale: 0.1 },
        visible: { opacity: 1, scale: 1,
          transition: { delay: del, type: 'spring', damping: 8, stiffness: 70 } },
      };
    case 'flipIn':
      return {
        hidden:  { opacity: 0, rotateX: -90, perspective: 1200 },
        visible: { opacity: 1, rotateX: 0,
          transition: { delay: del, duration: dur, ease: 'easeOut' } },
      };
    case 'reveal':
      return {
        hidden:  { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
        visible: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)',
          transition: { delay: del, duration: dur, ease: [0.16, 1, 0.3, 1] } },
      };
    case 'blurIn':
      return {
        hidden:  { opacity: 0, filter: 'blur(28px)', scale: 1.06 },
        visible: { opacity: 1, filter: 'blur(0px)', scale: 1,
          transition: { delay: del, duration: dur, ease: 'easeOut' } },
      };
    case 'glitch':
      return {
        hidden:  { opacity: 0, x: -14, skewX: 18 },
        visible: {
          opacity: 1, x: [0, -4, 4, -1, 0], skewX: [0, 6, -6, 2, 0],
          transition: { delay: del, duration: dur,
            times: [0, 0.25, 0.5, 0.75, 1] },
        },
      };
    case 'bounceIn':
      return {
        hidden:  { opacity: 0, scale: 0.3, y: -30 },
        visible: { opacity: 1, scale: 1, y: 0,
          transition: { delay: del, type: 'spring', damping: 7, stiffness: 120 } },
      };
    case 'none':
      return {
        hidden:  { opacity: 1 },
        visible: { opacity: 1 },
      };
    default: // fadeIn
      return {
        hidden:  { opacity: 0 },
        visible: { opacity: 1, transition: { delay: del, duration: dur } },
      };
  }
}

// ── Shape renderer — matches Konva canvas shapes ──────────────────────────────
function ShapeEl({ el, accent }: { el: SlideElement; accent: string }) {
  const ss   = el.shapeStyle || {};
  const fill = ss.fill || accent;

  const borderStyle = ss.strokeWidth && ss.stroke
    ? `${ss.strokeWidth}px solid ${ss.stroke}`
    : 'none';

  // RECT
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

  // CIRCLE — use border-radius 50%
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

  // TRIANGLE — CSS clip-path
  if (el.shapeType === 'triangle') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: fill,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      }} />
    );
  }

  // STAR — SVG
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

  // LINE — SVG horizontal line
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

  // ARROW — SVG arrow
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

  // Fallback: rect
  return <div style={{ width: '100%', height: '100%', backgroundColor: fill }} />;
}

// ── Single rendered slide (background + elements) ─────────────────────────────
function PresentSlide({ slide, palette }: { slide: Slide; palette: string[] }) {
  const bg     = palette[0] || '#05050A';
  const accent = palette[2] || '#7B61FF';

  // Separate background image from regular elements
  const bgEl = slide.elements?.find(
    (el) => el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0 && el.src,
  );
  const elements = (slide.elements || [])
    .filter((el) => el.visible !== false && !(el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0))
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">

      {/* ── BG Layer 1: solid color ─────────────────────────────────── */}
      <div className="absolute inset-0" style={{ background: bg }} />

      {/* ── BG Layer 2: accent diagonal gradient (matches canvas) ───── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accent}33 0%, transparent 55%, ${accent}22 100%)`,
        }}
      />

      {/* ── BG Layer 3: hero image at 18% (matches canvas) ─────────── */}
      {bgEl?.src && (
        <img
          src={bgEl.src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18 }}
        />
      )}

      {/* ── Elements ─────────────────────────────────────────────────── */}
      {elements.map((el, i) => {
        const entrance  = el.animation?.entrance;
        const durationMs = el.animation?.duration ?? 600;
        const delayMs    = el.animation?.delay    ?? (i * 80);
        const variants   = getVariants(entrance, durationMs, delayMs);

        return (
          <motion.div
            key={el.id}
            variants={variants}
            initial="hidden"
            animate="visible"
            style={{
              position:  'absolute',
              left:      el.x,
              top:       el.y,
              width:     el.width,
              height:    el.height,
              zIndex:    el.zIndex || 1,
              opacity:   entrance === 'none' ? 1 : (el.opacity ?? 1),
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              overflow:  'visible',
            }}
          >
            {/* TEXT */}
            {el.type === 'text' && (
              <div
                style={{
                  width:          '100%',
                  height:         '100%',
                  fontFamily:     el.textStyle?.fontFamily || 'Inter, sans-serif',
                  fontSize:       `${el.textStyle?.fontSize || 24}px`,
                  fontWeight:     el.textStyle?.fontWeight || 'normal',
                  fontStyle:      el.textStyle?.fontStyle  || 'normal',
                  textDecoration: el.textStyle?.textDecoration || 'none',
                  color:          el.textStyle?.color || '#FFFFFF',
                  textAlign:      (el.textStyle?.textAlign as any) || 'left',
                  lineHeight:     el.textStyle?.lineHeight || 1.4,
                  letterSpacing:  el.textStyle?.letterSpacing ? `${el.textStyle.letterSpacing}px` : undefined,
                  whiteSpace:     'pre-wrap',
                  wordBreak:      'break-word',
                  overflow:       'hidden',
                }}
              >
                {el.content}
              </div>
            )}

            {/* IMAGE */}
            {el.type === 'image' && el.src && (
              <img
                src={el.src}
                alt=""
                style={{
                  width:     '100%',
                  height:    '100%',
                  objectFit: 'cover',
                  display:   'block',
                  opacity:   el.opacity ?? 1,
                }}
              />
            )}

            {/* SHAPE — delegates to ShapeEl for accurate rendering */}
            {el.type === 'shape' && (
              <ShapeEl el={el} accent={accent} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main Present Mode ─────────────────────────────────────────────────────────
export function PresentMode() {
  const { presentation, editor, setEditorState } = usePresentationStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction,    setDirection]    = useState(1);
  const [scale,        setScale]        = useState(1);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides       = presentation?.slides || [];
  const slide        = slides[currentIndex];
  const isPresenting = editor.isPresenting;
  const palette      = presentation?.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];

  const close = useCallback(() => {
    setEditorState({ isPresenting: false });
    setCurrentIndex(0);
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
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Responsive scale — fills screen while keeping 16:9
  useEffect(() => {
    if (!isPresenting) return;
    const calc = () => {
      const sw = Math.min(
        (window.innerWidth  - 32) / 1280,
        (window.innerHeight - 32) / 720,
      );
      setScale(Math.min(sw, 1.5));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isPresenting]);

  // Keyboard navigation
  useEffect(() => {
    if (!isPresenting) return;
    const onKey = (e: KeyboardEvent) => {
      resetHideTimer();
      if (e.key === 'Escape')                               close();
      else if (['ArrowRight', ' ', 'Enter'].includes(e.key)) goNext();
      else if (['ArrowLeft',  'Backspace'].includes(e.key))  goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPresenting, close, goNext, goPrev, resetHideTimer]);

  useEffect(() => {
    if (!isPresenting) return;
    resetHideTimer();
    window.addEventListener('mousemove', resetHideTimer);
    return () => window.removeEventListener('mousemove', resetHideTimer);
  }, [isPresenting, resetHideTimer]);

  useEffect(() => {
    if (isPresenting) setCurrentIndex(0);
  }, [isPresenting]);

  if (!isPresenting || !presentation || !slide) return null;

  const dotCount = Math.min(slides.length, 24);

  return (
    <AnimatePresence>
      <motion.div
        key="present-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
        style={{ background: '#010104' }}
      >
        {/* Ambient glow matching palette accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${palette[2]}18 0%, transparent 65%)`,
          }}
        />

        {/* ── Slide frame ──────────────────────────────────────────── */}
        <motion.div
          animate={{ scale }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width:           1280,
            height:          720,
            transformOrigin: 'center center',
            position:        'relative',
            boxShadow:       `0 80px 160px -20px rgba(0,0,0,0.95), 0 0 120px -30px ${palette[2]}25`,
            borderRadius:    6,
            overflow:        'hidden',
            flexShrink:      0,
            border:          '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={{
                enter:  (d: number) => ({ opacity: 0, x: d * 120, filter: 'blur(12px)', scale: 1.02 }),
                center: { opacity: 1, x: 0, filter: 'blur(0px)', scale: 1,
                  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
                exit:   (d: number) => ({ opacity: 0, x: d * -120, filter: 'blur(12px)', scale: 0.98,
                  transition: { duration: 0.35 } }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0"
            >
              <PresentSlide slide={slide} palette={palette} />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── Controls (auto-hide) ─────────────────────────────────── */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Close */}
              <button
                onClick={close}
                className="absolute top-7 right-7 z-50 w-11 h-11 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/50 hover:text-white border border-white/10 backdrop-blur-2xl transition-all pointer-events-auto group"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
              </button>

              {/* Left / Right click zones */}
              <button
                onClick={goPrev} disabled={currentIndex === 0}
                className="absolute left-0 top-0 h-full w-1/5 pointer-events-auto opacity-0 cursor-w-resize disabled:cursor-default z-30"
              />
              <button
                onClick={goNext} disabled={currentIndex === slides.length - 1}
                className="absolute right-0 top-0 h-full w-1/5 pointer-events-auto opacity-0 cursor-e-resize disabled:cursor-default z-30"
              />

              {/* Navigation pill */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-auto">
                <div className="text-white/20 text-[9px] font-black tracking-[0.5em] uppercase">
                  {currentIndex + 1} &mdash; {slides.length}
                </div>

                <div className="flex items-center gap-5 bg-black/50 backdrop-blur-[32px] px-7 py-3.5 rounded-full border border-white/10 shadow-[0_24px_48px_-8px_rgba(0,0,0,0.6)]">
                  <button
                    onClick={goPrev} disabled={currentIndex === 0}
                    className="text-white/40 hover:text-white disabled:opacity-10 transition-all active:scale-75"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  {/* Dot indicators */}
                  <div className="flex items-center gap-1.5">
                    {slides.slice(0, dotCount).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                        className="transition-all duration-500"
                        style={{
                          width:        i === currentIndex ? 28 : 6,
                          height:       4,
                          borderRadius: 2,
                          background:   i === currentIndex ? (palette[2] || '#7B61FF') : 'rgba(255,255,255,0.18)',
                          boxShadow:    i === currentIndex ? `0 0 12px ${palette[2]}80` : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={goNext} disabled={currentIndex === slides.length - 1}
                    className="text-white/40 hover:text-white disabled:opacity-10 transition-all active:scale-75"
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
