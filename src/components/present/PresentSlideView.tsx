'use client';

import 'animate.css';
import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SlideElement, Slide, AnimationEntrance } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';
import { editorImageFetchUrl } from '@/lib/r2-public-url';
import {
  buildElementEntranceVariants,
  elementAnimationDelayMs,
  elementAnimationDurationMs,
  elementPresentZIndex,
  durSec,
  MOTION_EASE_OUT,
} from '@/lib/presentationMotion';

function ShapeEl({ el, accent }: { el: SlideElement; accent: string }) {
  const ss = el.shapeStyle || {};
  const fill = ss.fill || accent;
  const borderStyle =
    ss.strokeWidth && ss.stroke ? `${ss.strokeWidth}px solid ${ss.stroke}` : 'none';

  if (!el.shapeType || el.shapeType === 'rect') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: fill,
          borderRadius: `${ss.cornerRadius || 0}px`,
          border: borderStyle,
          boxSizing: 'border-box',
          boxShadow: ss.shadowBlur
            ? `${ss.shadowOffsetX || 0}px ${ss.shadowOffsetY || 0}px ${ss.shadowBlur}px ${ss.shadowColor || 'rgba(0,0,0,0.5)'}`
            : undefined,
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
          boxSizing: 'border-box',
        }}
      />
    );
  }
  if (el.shapeType === 'triangle') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: fill,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        }}
      />
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
          x1={0}
          y1={el.height / 2}
          x2={el.width}
          y2={el.height / 2}
          stroke={ss.stroke || fill}
          strokeWidth={ss.strokeWidth || 3}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (el.shapeType === 'path') {
    return (
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          d={el.content || ''}
          fill={fill}
          stroke={ss.stroke || 'none'}
          strokeWidth={ss.strokeWidth || 0}
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
          x1={0}
          y1={el.height / 2}
          x2={el.width - hw}
          y2={el.height / 2}
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
      <div style={{ ...baseStyle, overflow: 'visible' }}>
        {words.map((w, wi) => (
          <motion.span
            key={`${wi}-${w.slice(0, 8)}`}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: wi * 0.04, duration: 0.35, ease: MOTION_EASE_OUT }}
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
      <div style={{ ...baseStyle, overflow: 'visible' }}>
        {lines.map((line, li) => (
          <motion.div
            key={li}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: li * 0.08, duration: 0.45, ease: MOTION_EASE_OUT }}
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

const PresentElementLayer = memo(function PresentElementLayer({
  el,
  orderIndex,
  accent,
  animationsOn,
  resolveImageUrl,
}: {
  el: SlideElement;
  orderIndex: number;
  accent: string;
  animationsOn: boolean;
  resolveImageUrl: (src: string) => string;
}) {
  const entrance = el.animation?.entrance;
  const isAnimateCss = animationsOn && !!entrance?.startsWith('animate__');
  const durationMs = elementAnimationDurationMs(el.animation);
  const delayMs = elementAnimationDelayMs(el.animation, orderIndex);
  const baseOpacity = el.opacity ?? 1;

  const variants = useMemo(
    () =>
      isAnimateCss
        ? { hidden: { opacity: baseOpacity }, visible: { opacity: baseOpacity } }
        : buildElementEntranceVariants(entrance, durationMs, delayMs, baseOpacity, animationsOn),
    [isAnimateCss, entrance, durationMs, delayMs, baseOpacity, animationsOn],
  );

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
    letterSpacing: el.textStyle?.letterSpacing ? `${el.textStyle.letterSpacing}px` : undefined,
    whiteSpace: 'pre-wrap',
    wordBreak: 'normal',
    overflowWrap: 'break-word',
    overflow: 'hidden',
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    display: 'block',
  };

  const inner =
    el.type === 'text' ? (
      entrance === 'typewriterWords' || entrance === 'staggerLines' ? (
        <AnimatedTextContent content={el.content || ''} entrance={entrance} baseStyle={textBase} />
      ) : (
        <div style={textBase}>{el.content}</div>
      )
    ) : el.type === 'image' && el.src ? (
      el.src.includes('youtube.com/embed/') ? (
        <iframe
          src={el.src}
          allow="autoplay; encrypted-media"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', pointerEvents: 'auto' }}
        />
      ) : el.src.split('?')[0].endsWith('.mp4') ? (
        <video
          src={el.src}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: el.objectFit || 'cover',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <motion.img
          src={resolveImageUrl(el.src)}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: (el.objectFit ?? 'cover') as React.CSSProperties['objectFit'],
            display: 'block',
          }}
          initial={animationsOn && entrance === 'cinematicImageZoom' ? { scale: 1.08 } : false}
          animate={animationsOn && entrance === 'cinematicImageZoom' ? { scale: 1 } : {}}
          transition={{ duration: durSec(durationMs), delay: delayMs / 1000, ease: MOTION_EASE_OUT }}
        />
      )
    ) : el.type === 'draw' ? (
      <svg width="100%" height="100%" viewBox={`0 0 ${el.width} ${el.height}`} style={{ overflow: 'visible' }}>
        <polyline
          points={(el.points || []).reduce((acc, p, i) => acc + (i % 2 === 0 ? `${p},` : `${p} `), '')}
          fill="none"
          stroke={el.shapeStyle?.stroke || '#fff'}
          strokeWidth={el.shapeStyle?.strokeWidth || 4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : el.type === 'shape' ? (
      <ShapeEl el={el} accent={accent} />
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
      layout={false}
      variants={variants}
      initial={animationsOn && !isAnimateCss ? 'hidden' : 'visible'}
      animate="visible"
      className={isAnimateCss ? `animate__animated ${entrance}` : undefined}
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        zIndex: elementPresentZIndex(el, orderIndex),
        rotate: el.rotation || 0,
        overflow: 'visible',
        willChange: animationsOn && !isAnimateCss ? 'opacity, transform, filter' : undefined,
        animationDuration: isAnimateCss ? `${durSec(durationMs)}s` : undefined,
        animationDelay: isAnimateCss ? `${delayMs / 1000}s` : undefined,
        animationFillMode: isAnimateCss ? 'both' : undefined,
      }}
    >
      {inner}
    </motion.div>
  );
});

export type PresentSlideViewProps = {
  slide: Slide;
  palette: string[];
  animationsOn: boolean;
  resolveImageUrl?: (src: string) => string;
};

function PresentSlideViewInner({
  slide,
  palette,
  animationsOn,
  resolveImageUrl = editorImageFetchUrl,
}: PresentSlideViewProps) {
  const bg = palette[0] || '#05050A';
  const accent = palette[2] || '#7B61FF';
  const bgEl = findDeckBackgroundElement(slide.elements);
  const elements = (slide.elements || []).filter((el) => el.visible !== false && el !== bgEl);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="absolute inset-0" style={{ background: bg }} />
      {bgEl?.src && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          initial={false}
          animate={animationsOn ? { scale: [1, 1.035, 1] } : { scale: 1 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          style={{ willChange: animationsOn ? 'transform' : undefined }}
        >
          <img
            src={resolveImageUrl(bgEl.src)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: bgEl.opacity ?? 1 }}
          />
        </motion.div>
      )}
      {elements.map((el, i) => (
        <PresentElementLayer
          key={el.id}
          el={el}
          orderIndex={i}
          accent={accent}
          animationsOn={animationsOn}
          resolveImageUrl={resolveImageUrl}
        />
      ))}
    </div>
  );
}

export const PresentSlideView = memo(PresentSlideViewInner);
