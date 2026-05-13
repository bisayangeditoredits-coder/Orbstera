import type { Variants } from 'framer-motion';
import type {
  AnimationConfig,
  AnimationEntrance,
  PresentationData,
  Slide,
  SlideElement,
  SlideLayoutType,
  SlideTransition,
} from '@/types';

/** Labels for Design panel & presenter settings. */
export const SLIDE_TRANSITION_OPTIONS: { id: SlideTransition; label: string }[] = [
  { id: 'fade', label: 'Fade' },
  { id: 'crossDissolve', label: 'Cross dissolve' },
  { id: 'smoothSlide', label: 'Smooth slide' },
  { id: 'horizontalCinematic', label: 'Horizontal cinematic' },
  { id: 'verticalFlow', label: 'Vertical flow' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'dynamicScale', label: 'Dynamic scale' },
  { id: 'blurReveal', label: 'Blur reveal' },
  { id: 'parallaxFlow', label: 'Parallax flow' },
  { id: 'glassSwipe', label: 'Glass swipe' },
  { id: 'depth', label: 'Depth' },
  { id: 'layerReveal', label: 'Layer reveal' },
  { id: 'morph', label: 'Morph' },
  { id: 'floating', label: 'Floating' },
  { id: 'keynote', label: 'Keynote' },
];

const SLIDE_TRANSITION_SET = new Set<SlideTransition>([
  'fade',
  'smoothSlide',
  'zoom',
  'blurReveal',
  'parallaxFlow',
  'morph',
  'crossDissolve',
  'glassSwipe',
  'depth',
  'dynamicScale',
  'verticalFlow',
  'horizontalCinematic',
  'layerReveal',
  'floating',
  'keynote',
]);

/** Normalize AI / legacy strings → SlideTransition */
export function coerceSlideTransition(raw: unknown): SlideTransition | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim();
  if (SLIDE_TRANSITION_SET.has(s as SlideTransition)) return s as SlideTransition;
  const k = s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
  const aliases: Record<string, SlideTransition> = {
    'apple-keynote': 'keynote',
    keynote: 'keynote',
    dissolve: 'crossDissolve',
    'cross-dissolve': 'crossDissolve',
    slide: 'smoothSlide',
    'smooth-slide': 'smoothSlide',
    push: 'smoothSlide',
    swipe: 'glassSwipe',
    'glass-swipe': 'glassSwipe',
    parallax: 'parallaxFlow',
    'parallax-flow': 'parallaxFlow',
    depth: 'depth',
    'depth-transition': 'depth',
    vertical: 'verticalFlow',
    'vertical-flow': 'verticalFlow',
    horizontal: 'horizontalCinematic',
    'horizontal-cinematic': 'horizontalCinematic',
    cinematic: 'horizontalCinematic',
    float: 'floating',
    'floating-transition': 'floating',
    layers: 'layerReveal',
    'layer-reveal': 'layerReveal',
    morph: 'morph',
    blur: 'blurReveal',
    'blur-reveal': 'blurReveal',
    zoom: 'zoom',
    fade: 'fade',
    scale: 'dynamicScale',
    'dynamic-scale': 'dynamicScale',
  };
  return aliases[k];
}

const ENTRANCE_SET = new Set<string>([
  'fadeSlideUp',
  'fadeSlideLeft',
  'fadeIn',
  'zoomIn',
  'slideRight',
  'bounceIn',
  'glitch',
  'reveal',
  'elasticScale',
  'flipIn',
  'blurIn',
  'none',
  'parallaxDrift',
  'verticalRise',
  'horizontalReveal',
  'depthRise',
  'glassBlur',
  'floatGentle',
  'scaleSoft',
  'morphBlend',
  'cinematicImageZoom',
  'typewriterWords',
  'staggerLines',
]);

export function coerceAnimationEntrance(raw: unknown): AnimationEntrance {
  if (typeof raw !== 'string' || !ENTRANCE_SET.has(raw)) return 'fadeIn';
  return raw as AnimationEntrance;
}

const easeOut = [0.22, 1, 0.36, 1] as const;
const easeInOut = [0.45, 0, 0.55, 1] as const;

export function durSec(ms: number) {
  return Math.max(0.12, ms / 1000);
}

const DEFAULT_SLIDE_TRANSITION_MS = 620;

/** Framer Motion variants for slide-level transitions (uses `custom` = direction ±1). */
export function getSlideTransitionVariants(transition: SlideTransition, durationMs?: number): Variants {
  const scale =
    Math.max(200, Math.min(4000, durationMs ?? DEFAULT_SLIDE_TRANSITION_MS)) / DEFAULT_SLIDE_TRANSITION_MS;
  const cs = (sec: number) => Math.max(0.06, sec * scale);
  const baseEnter = { transition: { duration: cs(0.62), ease: easeOut } };
  const baseExit = { transition: { duration: cs(0.42), ease: easeInOut } };

  switch (transition) {
    case 'fade':
      return {
        enter:  () => ({ opacity: 0, scale: 0.992, ...baseEnter }),
        center: { opacity: 1, scale: 1, transition: { duration: cs(0.55), ease: easeOut } },
        exit:   () => ({ opacity: 0, scale: 0.988, ...baseExit }),
      };
    case 'smoothSlide':
      return {
        enter:  (d: number) => ({ opacity: 0, x: d * 72, filter: 'blur(6px)', ...baseEnter }),
        center: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: cs(0.58), ease: easeOut } },
        exit:   (d: number) => ({ opacity: 0, x: d * -56, filter: 'blur(5px)', ...baseExit }),
      };
    case 'zoom':
      return {
        enter:  () => ({ opacity: 0, scale: 0.9, ...baseEnter }),
        center: { opacity: 1, scale: 1, transition: { duration: cs(0.6), ease: easeOut } },
        exit:   () => ({ opacity: 0, scale: 1.04, ...baseExit }),
      };
    case 'blurReveal':
      return {
        enter:  () => ({ opacity: 0, filter: 'blur(22px)', scale: 1.02, ...baseEnter }),
        center: { opacity: 1, filter: 'blur(0px)', scale: 1, transition: { duration: cs(0.68), ease: easeOut } },
        exit:   () => ({ opacity: 0, filter: 'blur(14px)', scale: 0.98, ...baseExit }),
      };
    case 'parallaxFlow':
      return {
        enter:  (d: number) => ({ opacity: 0, x: d * 140, y: 18, scale: 0.97, ...baseEnter }),
        center: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: cs(0.72), ease: easeOut } },
        exit:   (d: number) => ({ opacity: 0, x: d * -100, y: -12, scale: 0.96, ...baseExit }),
      };
    case 'morph':
      return {
        enter:  () => ({ opacity: 0, scale: 0.94, rotate: -0.4, ...baseEnter }),
        center: { opacity: 1, scale: 1, rotate: 0, transition: { duration: cs(0.64), ease: easeOut } },
        exit:   () => ({ opacity: 0, scale: 1.03, rotate: 0.3, ...baseExit }),
      };
    case 'crossDissolve':
      return {
        enter:  () => ({ opacity: 0, ...baseEnter }),
        center: { opacity: 1, transition: { duration: cs(0.52), ease: easeOut } },
        exit:   () => ({ opacity: 0, transition: { duration: cs(0.48), ease: easeInOut } }),
      };
    case 'glassSwipe':
      return {
        enter:  (d: number) => ({
          opacity: 0,
          x: d * 110,
          skewX: d * -2,
          filter: 'blur(10px) brightness(1.08)',
          ...baseEnter,
        }),
        center: {
          opacity: 1,
          x: 0,
          skewX: 0,
          filter: 'blur(0px) brightness(1)',
          transition: { duration: cs(0.66), ease: easeOut },
        },
        exit: (d: number) => ({
          opacity: 0,
          x: d * -90,
          skewX: d * 1.5,
          filter: 'blur(8px)',
          ...baseExit,
        }),
      };
    case 'depth':
      return {
        enter:  () => ({
          opacity: 0,
          scale: 0.86,
          z: -80,
          rotateX: 6,
          perspective: 1200,
          ...baseEnter,
        }),
        center: {
          opacity: 1,
          scale: 1,
          z: 0,
          rotateX: 0,
          perspective: 1200,
          transition: { duration: cs(0.7), ease: easeOut },
        },
        exit: () => ({
          opacity: 0,
          scale: 0.92,
          rotateX: -4,
          perspective: 1200,
          ...baseExit,
        }),
      };
    case 'dynamicScale':
      return {
        enter:  () => ({ opacity: 0, scale: 1.06, ...baseEnter }),
        center: { opacity: 1, scale: 1, transition: { duration: cs(0.58), ease: easeOut } },
        exit:   () => ({ opacity: 0, scale: 0.94, ...baseExit }),
      };
    case 'verticalFlow':
      return {
        enter:  (d: number) => ({ opacity: 0, y: d * 90, filter: 'blur(4px)', ...baseEnter }),
        center: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: cs(0.6), ease: easeOut } },
        exit:   (d: number) => ({ opacity: 0, y: d * -70, filter: 'blur(4px)', ...baseExit }),
      };
    case 'horizontalCinematic':
      return {
        enter:  (d: number) => ({ opacity: 0, x: d * 200, scale: 0.965, filter: 'blur(8px)', ...baseEnter }),
        center: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)', transition: { duration: cs(0.74), ease: easeOut } },
        exit:   (d: number) => ({ opacity: 0, x: d * -160, scale: 0.97, filter: 'blur(10px)', ...baseExit }),
      };
    case 'layerReveal':
      return {
        enter:  () => ({
          opacity: 0,
          clipPath: 'inset(0% 0% 100% 0%)',
          y: 24,
          ...baseEnter,
        }),
        center: {
          opacity: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          y: 0,
          transition: { duration: cs(0.68), ease: easeOut },
        },
        exit: () => ({
          opacity: 0,
          clipPath: 'inset(100% 0% 0% 0%)',
          y: -16,
          ...baseExit,
        }),
      };
    case 'floating':
      return {
        enter:  () => ({ opacity: 0, y: 40, rotate: -0.8, ...baseEnter }),
        center: { opacity: 1, y: 0, rotate: 0, transition: { duration: cs(0.62), ease: easeOut } },
        exit:   () => ({ opacity: 0, y: -28, rotate: 0.6, ...baseExit }),
      };
    case 'keynote':
      return {
        enter:  (d: number) => ({
          opacity: 0,
          x: d * 48,
          scale: 0.97,
          filter: 'blur(16px)',
          ...baseEnter,
        }),
        center: {
          opacity: 1,
          x: 0,
          scale: 1,
          filter: 'blur(0px)',
          transition: { duration: cs(0.78), ease: easeOut },
        },
        exit: (d: number) => ({
          opacity: 0,
          x: d * -36,
          scale: 1.01,
          filter: 'blur(12px)',
          ...baseExit,
        }),
      };
    default:
      return getSlideTransitionVariants('fade', durationMs);
  }
}

/** Element entrance variants (duration & delay from element.animation). */
export function getElementEntranceVariants(
  entrance: AnimationEntrance | undefined,
  durationMs: number,
  delayMs: number,
): Variants {
  const dur = durSec(durationMs);
  const del = delayMs / 1000;
  const t = { delay: del, duration: dur, ease: easeOut };

  switch (entrance) {
    case 'fadeSlideUp':
      return {
        hidden:  { opacity: 0, y: 56 },
        visible: { opacity: 1, y: 0, transition: t },
      };
    case 'fadeSlideLeft':
      return {
        hidden:  { opacity: 0, x: 64 },
        visible: { opacity: 1, x: 0, transition: t },
      };
    case 'slideRight':
      return {
        hidden:  { opacity: 0, x: -70 },
        visible: { opacity: 1, x: 0, transition: t },
      };
    case 'zoomIn':
      return {
        hidden:  { opacity: 0, scale: 0.62 },
        visible: { opacity: 1, scale: 1, transition: t },
      };
    case 'elasticScale':
      return {
        hidden:  { opacity: 0, scale: 0.88 },
        visible: {
          opacity: 1,
          scale: 1,
          transition: { delay: del, type: 'spring', damping: 14, stiffness: 120 },
        },
      };
    case 'flipIn':
      return {
        hidden:  { opacity: 0, rotateX: -85, transformPerspective: 900 },
        visible: { opacity: 1, rotateX: 0, transition: { ...t, ease: 'easeOut' } },
      };
    case 'reveal':
      return {
        hidden:  { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
        visible: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', transition: t },
      };
    case 'blurIn':
    case 'glassBlur':
      return {
        hidden:  { opacity: 0, filter: 'blur(24px)', scale: 1.04 },
        visible: { opacity: 1, filter: 'blur(0px)', scale: 1, transition: { ...t, ease: 'easeOut' } },
      };
    case 'glitch':
      return {
        hidden:  { opacity: 0, x: -12, skewX: 14 },
        visible: {
          opacity: 1,
          x: [0, -3, 3, 0],
          skewX: [0, 4, -4, 0],
          transition: { delay: del, duration: dur, times: [0, 0.35, 0.65, 1] },
        },
      };
    case 'bounceIn':
      return {
        hidden:  { opacity: 0, scale: 0.82, y: -20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { delay: del, type: 'spring', damping: 11, stiffness: 180 } },
      };
    case 'parallaxDrift':
      return {
        hidden:  { opacity: 0, x: -36, y: 20, scale: 0.96 },
        visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: t },
      };
    case 'verticalRise':
      return {
        hidden:  { opacity: 0, y: 48, filter: 'blur(4px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: t },
      };
    case 'horizontalReveal':
      return {
        hidden:  { opacity: 0, x: 80, clipPath: 'inset(0 100% 0 0)' },
        visible: { opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)', transition: t },
      };
    case 'depthRise':
      return {
        hidden:  { opacity: 0, y: 40, scale: 0.9, z: -40 },
        visible: { opacity: 1, y: 0, scale: 1, z: 0, transition: t },
      };
    case 'floatGentle':
      return {
        hidden:  { opacity: 0, y: 28, rotate: -0.5 },
        visible: { opacity: 1, y: 0, rotate: 0, transition: t },
      };
    case 'scaleSoft':
    case 'morphBlend':
      return {
        hidden:  { opacity: 0, scale: 0.94 },
        visible: { opacity: 1, scale: 1, transition: t },
      };
    case 'cinematicImageZoom':
      return {
        hidden:  { opacity: 0, scale: 1.08 },
        visible: { opacity: 1, scale: 1, transition: t },
      };
    case 'typewriterWords':
    case 'staggerLines':
      return {
        hidden:  { opacity: 0, y: 10, filter: 'blur(6px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: t },
      };
    case 'none':
      return { hidden: { opacity: 1 }, visible: { opacity: 1 } };
    default:
      return {
        hidden:  { opacity: 0 },
        visible: { opacity: 1, transition: t },
      };
  }
}

export type MotionContext = Pick<
  PresentationData,
  'animationStyle' | 'presentationType' | 'styleMode' | 'defaultSlideTransition'
>;

/** Pick a tasteful slide transition from deck + slide context. */
export function inferSlideTransition(slide: Slide, ctx: MotionContext): SlideTransition {
  if (slide.slideTransition) return slide.slideTransition;
  if (ctx.defaultSlideTransition) return ctx.defaultSlideTransition;

  const style = `${ctx.animationStyle || ''} ${ctx.styleMode || ''} ${ctx.presentationType || ''}`.toLowerCase();

  if (style.includes('luxury') || style.includes('editorial')) return 'crossDissolve';
  if (style.includes('futuristic') || style.includes('glass')) return 'glassSwipe';
  if (style.includes('minimal')) return 'fade';
  if (style.includes('kinetic')) return 'horizontalCinematic';
  if (style.includes('cinematic')) return 'keynote';

  switch (slide.type as SlideLayoutType) {
    case 'hero':
    case 'closing':
      return 'keynote';
    case 'timeline':
      return 'layerReveal';
    case 'chart':
    case 'stats':
      return 'depth';
    case 'quote':
      return 'blurReveal';
    case 'split':
    case 'media':
      return 'parallaxFlow';
    default:
      return 'smoothSlide';
  }
}

function isFullBleedBackground(el: SlideElement): boolean {
  return (
    el.type === 'image' &&
    (el.zIndex === 0 || el.zIndex === undefined) &&
    el.x === 0 &&
    el.y === 0 &&
    el.width >= 1000 &&
    el.height >= 600
  );
}

/** Suggest element entrance from structure (ignores `el.animation.entrance`; use when entrance absent). */
export function suggestElementEntrance(
  el: SlideElement,
  slide: Slide,
  orderIndex: number,
  ctx: MotionContext,
): AnimationEntrance {
  const deck = `${ctx.presentationType || ''} ${ctx.styleMode || ''}`.toLowerCase();

  if (el.type === 'image' && isFullBleedBackground(el)) return 'cinematicImageZoom';

  if (el.type === 'image') return deck.includes('luxury') ? 'scaleSoft' : 'parallaxDrift';

  if (el.type === 'chart') return 'depthRise';

  if (el.type === 'text') {
    const len = (el.content || '').length;
    if (slide.type === 'hero' && orderIndex <= 1) return 'verticalRise';
    if (slide.type === 'timeline' || slide.type === 'stats') return 'staggerLines';
    if (len > 120) return 'blurIn';
    if ((el.content || '').includes('•')) return 'horizontalReveal';
    return deck.includes('corporate') ? 'fadeSlideUp' : 'fadeSlideUp';
  }

  if (el.type === 'shape') return orderIndex === 0 ? 'reveal' : 'scaleSoft';

  return 'fadeIn';
}

/** Coerce animations, infer slide transitions, cap motion for dense slides. */
export function finalizeSlideMotion(slide: Slide, ctx: MotionContext): Slide {
  const elements = [...(slide.elements || [])].map((el, i) => {
    const hasEntrance =
      el.animation &&
      el.animation.entrance !== undefined &&
      el.animation.entrance !== null &&
      String(el.animation.entrance).length > 0;
    const entrance: AnimationEntrance = hasEntrance
      ? coerceAnimationEntrance(el.animation!.entrance)
      : suggestElementEntrance(el, slide, i, ctx);
    const baseDur =
      el.type === 'image' && isFullBleedBackground(el)
        ? 1400
        : el.type === 'chart'
          ? 900
          : 620;
    const duration = el.animation?.duration ?? baseDur;
    let delay = el.animation?.delay ?? i * 70;
    const maxDelay = 2400;
    if (delay > maxDelay) delay = maxDelay;
    return {
      ...el,
      animation: { entrance, duration, delay },
    };
  });

  const coercedTransition = coerceSlideTransition(slide.slideTransition);

  return { ...slide, elements, slideTransition: coercedTransition };
}

export function finalizeAllSlidesMotion(slides: Slide[], ctx: MotionContext): Slide[] {
  return slides.map((s) => finalizeSlideMotion(s, ctx));
}
