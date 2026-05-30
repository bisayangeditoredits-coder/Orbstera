import type { DeckLayoutCategory, SlideElement } from '@/types';
import type { DeckImageTask } from '@/lib/deck-image-generation';
import { buildDeckImagePrompt } from '@/lib/ai/deck-generation-skill';
import type { VisualBackgroundMode } from '@/lib/visual-themes';
import {
  DEFAULT_DECK_LAYOUT_CATEGORY,
  getDeckLayoutCategoryOption,
  normalizeDeckLayoutCategory,
} from '@/lib/deck-layout-categories';
import { regionToLeonardoPixels } from '@/lib/leonardo-dimensions';

export const DECK_CANVAS_W = 1280;
export const DECK_CANVAS_H = 720;

/** Estimate Konva/PPTX-safe text box height from content length. */
export function estimateTextBlockHeight(
  text: string,
  fontSize: number,
  width: number,
  lineHeight = 1.15,
  minH = 72,
  maxH = 180,
): number {
  const trimmed = text.trim();
  if (!trimmed) return minH;
  const charsPerLine = Math.max(10, Math.floor(width / (fontSize * 0.52)));
  const lines = Math.max(1, Math.ceil(trimmed.length / charsPerLine));
  return Math.min(maxH, Math.max(minH, Math.round(lines * fontSize * lineHeight + 6)));
}

export type AiSlideInput = {
  id: string;
  type?: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  content?: { bullets?: string[] };
  imagePrompt?: string;
};

export type BuildDeckSlideLayoutArgs = {
  slide: AiSlideInput;
  sIdx: number;
  slideCount?: number;
  layoutCategory?: DeckLayoutCategory | string;
  palette: string[];
  headingFont: string;
  bodyFont: string;
  uid: (prefix: string) => string;
  existingElements?: SlideElement[];
  backgroundMode?: VisualBackgroundMode;
};

export type BuildDeckSlideLayoutResult = {
  elements: SlideElement[];
  imageTasks: DeckImageTask[];
};

export function resolveDeckImagePrompt(
  slide: AiSlideInput,
  ctx?: {
    slideIndex?: number;
    slideCount?: number;
    layoutHint?: string;
    layoutCategory?: DeckLayoutCategory | string;
    visualMood?: string;
    imageryPalette?: string;
    presentationType?: string;
  },
): string {
  const explicit = typeof slide.imagePrompt === 'string' ? slide.imagePrompt.trim() : '';
  return buildDeckImagePrompt({
    basePrompt: explicit || undefined,
    title: slide.title,
    type: slide.type,
    slideIndex: ctx?.slideIndex,
    slideCount: ctx?.slideCount,
    layoutHint: ctx?.layoutHint || slide.type,
    layoutCategory: ctx?.layoutCategory,
    visualMood: ctx?.visualMood,
    imageryPalette: ctx?.imageryPalette,
    presentationType: ctx?.presentationType,
  });
}

const glassCard = (light: boolean) =>
  light
    ? {
        fill: 'rgba(255, 255, 255, 0.96)',
        stroke: 'rgba(255, 255, 255, 1)',
        strokeWidth: 2,
        cornerRadius: 32,
        shadowColor: 'rgba(0, 30, 80, 0.08)',
        shadowBlur: 48,
        shadowOffsetY: 16,
      }
    : {
        fill: 'rgba(255, 255, 255, 0.04)',
        stroke: 'rgba(255, 255, 255, 0.12)',
        strokeWidth: 1,
        cornerRadius: 32,
        shadowColor: 'rgba(0,0,0,0.6)',
        shadowBlur: 64,
        shadowOffsetY: 24,
      };

const bulletPill = (light: boolean) =>
  light
    ? {
        fill: 'rgba(255, 255, 255, 0.98)',
        stroke: 'rgba(0,0,0,0.03)',
        strokeWidth: 1,
        cornerRadius: 20,
        shadowColor: 'rgba(0, 30, 80, 0.05)',
        shadowBlur: 16,
        shadowOffsetY: 6,
      }
    : {
        fill: 'rgba(255, 255, 255, 0.05)',
        stroke: 'rgba(255, 255, 255, 0.1)',
        strokeWidth: 1,
        cornerRadius: 20,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowBlur: 24,
        shadowOffsetY: 8,
      };

function resolveContentVariant(category: DeckLayoutCategory, sIdx: number): 0 | 1 | 2 {
  const rhythms: Record<DeckLayoutCategory, (0 | 1 | 2)[]> = {
    editorial: [0, 2, 1, 0, 2],
    bento: [2, 2, 1, 2, 0],
    cinematic: [0, 0, 2, 0, 1],
    corporate: [1, 2, 1, 1, 2],
    pitch: [0, 2, 1, 2, 0],
    product: [0, 2, 0, 1, 2],
    data_story: [2, 1, 2, 2, 1],
    timeline: [1, 2, 1, 0, 2],
    minimal: [1, 1, 0, 1, 2],
    luxury: [0, 1, 0, 2, 0],
  };
  const rhythm = rhythms[category] || rhythms[DEFAULT_DECK_LAYOUT_CATEGORY];
  return rhythm[sIdx % rhythm.length];
}

function prefersImageBackground(category: DeckLayoutCategory, slideType?: string): boolean {
  if (slideType === 'hero' || slideType === 'quote' || slideType === 'closing' || slideType === 'media') return true;
  if (category === 'cinematic' || category === 'luxury' || category === 'product') return true;
  if (category === 'corporate' || category === 'minimal' || category === 'data_story') return false;
  return true;
}

/**
 * Gamma-style slide layouts: full-bleed backgrounds, glass cards, editorial hierarchy.
 */
export function buildDeckSlideElements(args: BuildDeckSlideLayoutArgs): BuildDeckSlideLayoutResult {
  const { slide, sIdx, slideCount, palette, headingFont, bodyFont, uid } = args;
  const layoutCategory = normalizeDeckLayoutCategory(args.layoutCategory);
  const layoutOption = getDeckLayoutCategoryOption(layoutCategory);
  const imageTasks: DeckImageTask[] = [];
  const elements: SlideElement[] = [...(args.existingElements || [])];
  let currentZ = elements.length + 1;
  const light = args.backgroundMode === 'light';
  const bgColor = palette[0] || (light ? '#FFFFFF' : '#05050A');
  const textPrimary = palette[1] || (light ? '#1F2937' : '#FFFFFF');
  const textMuted = palette[3] || palette[1];

  const nestedB = slide.content?.bullets;
  const mergedB = [...(slide.bullets || []), ...(nestedB || [])].filter(
    (b, i, a) => b && a.indexOf(b) === i,
  );
  const isHero = slide.type === 'hero';
  const isSplit = slide.type === 'split' || slide.type === 'media';
  const isQuote = slide.type === 'quote';
  const isClosing = slide.type === 'closing';
  const isStats = slide.type === 'stats';
  const isTimeline = slide.type === 'timeline';
  const isComparison = slide.type === 'comparison';
  const isBullets = slide.type === 'bullets';
  const flipSplit =
    layoutCategory === 'product' || layoutCategory === 'cinematic'
      ? sIdx % 3 === 1
      : sIdx % 2 === 1;
  const imagePrompt = resolveDeckImagePrompt(slide, {
    slideIndex: sIdx,
    slideCount,
    layoutHint: `${layoutOption.label} ${slide.type || 'content'} layout`,
    layoutCategory,
  });
  const accent = palette[2] || '#7B61FF';

  const pushImageTask = (task: Omit<DeckImageTask, 'prompt' | 'slideId'> & { prompt?: string }) => {
    imageTasks.push({
      slideId: slide.id,
      elementId: task.elementId,
      prompt: task.prompt ?? imagePrompt,
      w: task.w,
      h: task.h,
      visualProfile: task.visualProfile,
    });
  };

  const addSolidBackground = () => {
    elements.unshift({
      id: uid('el-bg-solid'),
      type: 'shape',
      shapeType: 'rect',
      x: 0,
      y: 0,
      width: DECK_CANVAS_W,
      height: DECK_CANVAS_H,
      zIndex: 0,
      visible: true,
      shapeStyle: { fill: bgColor, stroke: 'transparent', strokeWidth: 0 },
      animation: { entrance: 'fadeIn', duration: 400, delay: 0 },
    });
    
    // Abstract premium accents for all solid layouts to avoid ugly white emptiness
    elements.unshift({
      id: uid('el-bg-ribbon-1'),
      type: 'shape',
      shapeType: 'rect',
      x: DECK_CANVAS_W - 550,
      y: -200,
      width: 280,
      height: DECK_CANVAS_H + 400,
      rotation: 35,
      zIndex: 0,
      visible: true,
      shapeStyle: { fill: accent, opacity: light ? 0.04 : 0.08 },
      animation: { entrance: 'fadeSlideLeft', duration: 1200, delay: 0 },
    });
    elements.unshift({
      id: uid('el-bg-ribbon-2'),
      type: 'shape',
      shapeType: 'rect',
      x: DECK_CANVAS_W - 250,
      y: -300,
      width: 80,
      height: DECK_CANVAS_H + 600,
      rotation: 35,
      zIndex: 0,
      visible: true,
      shapeStyle: { fill: textPrimary, opacity: light ? 0.02 : 0.05 },
      animation: { entrance: 'fadeSlideLeft', duration: 1000, delay: 100 },
    });
    elements.unshift({
      id: uid('el-bg-frame'),
      type: 'shape',
      shapeType: 'rect',
      x: 32,
      y: 32,
      width: DECK_CANVAS_W - 64,
      height: DECK_CANVAS_H - 64,
      zIndex: 0,
      visible: true,
      shapeStyle: { 
        fill: 'transparent', 
        stroke: textPrimary, 
        strokeWidth: 1, 
        opacity: light ? 0.06 : 0.12 
      },
      animation: { entrance: 'fadeIn', duration: 1500, delay: 300 },
    });

    currentZ = Math.max(currentZ, 1);
  };

  const addFullBleedBackground = (bgOpacity: number, visualProfile: 'cinematic' | 'typography') => {
    const bgId = uid('el-bg-image');
    const imageOpacity = light ? Math.max(0.72, bgOpacity) : bgOpacity;
    elements.unshift({
      id: bgId,
      type: 'image',
      src: '',
      x: 0,
      y: 0,
      width: DECK_CANVAS_W,
      height: DECK_CANVAS_H,
      zIndex: 0,
      visible: true,
      opacity: imageOpacity,
      aiImagePending: true,
      animation: { entrance: 'fadeIn', duration: 1200, delay: 0 },
    });
    pushImageTask({
      elementId: bgId,
      w: 1024,
      h: 576,
      visualProfile,
    });
    if (!light) {
      elements.push({
        id: uid('el-bg-overlay'),
        type: 'shape',
        shapeType: 'rect',
        x: 0,
        y: 0,
        width: DECK_CANVAS_W,
        height: DECK_CANVAS_H,
        zIndex: 1,
        visible: true,
        shapeStyle: {
          fill: 'rgba(5, 5, 12, 0.3)',
          stroke: 'transparent',
          strokeWidth: 0,
        },
        animation: { entrance: 'fadeIn', duration: 800, delay: 0 },
      });
      currentZ = Math.max(currentZ, 2);
    } else {
      currentZ = Math.max(currentZ, 1);
    }
  };

  if (isHero) {
    if (layoutCategory === 'minimal' || layoutCategory === 'corporate') {
      addSolidBackground();
    } else {
      addFullBleedBackground(layoutCategory === 'cinematic' ? 0.48 : 0.42, 'typography');
    }
    const titleText = slide.title?.trim() ?? '';
    const titleFontSize = titleText.length > 42 ? 64 : titleText.length > 28 ? 76 : 88;
    const titleW = DECK_CANVAS_W - 192;
    const titleHeight = titleText
      ? estimateTextBlockHeight(titleText, titleFontSize, titleW, 1.08, 100, 280)
      : 0;
    const subFontSize = 34;
    const subW = DECK_CANVAS_W - 440;
    const subHeight = slide.subtitle
      ? estimateTextBlockHeight(slide.subtitle, subFontSize, subW, 1.5, 72, 120)
      : 0;
    const titleY = 108;
    const subtitleY = titleY + titleHeight + 24;
    const heroScrimH = titleHeight + (slide.subtitle ? subHeight + 48 : 32) + 36;

    if (slide.title) {
      elements.push({
        id: uid('el-title-scrim'),
        type: 'shape',
        shapeType: 'rect',
        x: 48,
        y: titleY - 28,
        width: DECK_CANVAS_W - 96,
        height: heroScrimH,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: 'fadeIn', duration: 600, delay: 0 },
      });
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: 96,
        y: titleY,
        width: titleW,
        height: titleHeight,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: titleFontSize,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: 'center',
          lineHeight: 1.08,
        },
        animation: { entrance: 'fadeSlideUp', duration: 900, delay: 80 },
      });
    }
    if (slide.subtitle) {
      elements.push({
        id: uid('el-sub'),
        type: 'text',
        x: 220,
        y: subtitleY,
        width: subW,
        height: subHeight,
        content: slide.subtitle,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: subFontSize,
          fontWeight: 'normal',
          color: textMuted,
          textAlign: 'center',
          lineHeight: 1.5,
          letterSpacing: 2,
        },
        animation: { entrance: 'fadeSlideUp', duration: 900, delay: 220 },
      });
    }
  } else if (isSplit) {
    addSolidBackground();
    const textX = flipSplit ? 640 : 56;
    const imgPanelX = flipSplit ? 56 : 640;

    elements.push({
      id: uid('el-split-glass'),
      type: 'shape',
      shapeType: 'rect',
      x: textX,
      y: 48,
      width: 584,
      height: DECK_CANVAS_H - 96,
      zIndex: currentZ++,
      visible: true,
      shapeStyle: glassCard(light),
      animation: { entrance: 'fadeSlideLeft', duration: 650, delay: 0 },
    });

    const titleFontSize = 44;
    const titleWidth = 520;
    const titleY = 108;
    const titleHeight = slide.title
      ? estimateTextBlockHeight(slide.title, titleFontSize, titleWidth, 1.15, 90, 160)
      : 0;
    const bulletsStartY = slide.title ? titleY + titleHeight + 20 : 248;
    const maxBullets = Math.max(1, Math.min(5, Math.floor((560 - bulletsStartY) / 76)));

    if (slide.title) {
      elements.push({
        id: uid('el-accent'),
        type: 'shape',
        shapeType: 'rect',
        x: textX + 32,
        y: 88,
        width: 72,
        height: 5,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: { fill: accent, stroke: 'transparent', cornerRadius: 3 },
        animation: { entrance: 'reveal', duration: 500, delay: 120 },
      });
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: textX + 32,
        y: titleY,
        width: titleWidth,
        height: titleHeight,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: titleFontSize,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: 'left',
          lineHeight: 1.15,
        },
        animation: { entrance: 'fadeSlideLeft', duration: 650, delay: 160 },
      });
    }

    mergedB.slice(0, maxBullets).forEach((bullet, i) => {
      const y = bulletsStartY + i * 76;
      elements.push({
        id: uid(`el-bullet-bg-${i}`),
        type: 'shape',
        shapeType: 'rect',
        x: textX + 32,
        y,
        width: 520,
        height: 58,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: bulletPill(light),
        animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 280 + i * 70 },
      });
      elements.push({
        id: uid(`el-bullet-${i}`),
        type: 'text',
        x: textX + 52,
        y: y + 14,
        width: 480,
        height: 48,
        content: bullet.replace(/^•\s*/, ''),
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 27,
          fontWeight: 'normal',
          color: textMuted,
          textAlign: 'left',
          lineHeight: 1.6,
        },
        animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 320 + i * 70 },
      });
    });

    const imgId = uid('el-image');
    elements.push({
      id: uid('el-split-frame'),
      type: 'shape',
      shapeType: 'rect',
      x: imgPanelX,
      y: 48,
      width: 584,
      height: DECK_CANVAS_H - 96,
      zIndex: currentZ++,
      visible: true,
      shapeStyle: {
        fill: 'rgba(255,255,255,0.02)',
        stroke: 'rgba(255,255,255,0.14)',
        strokeWidth: 1,
        cornerRadius: 24,
      },
      animation: { entrance: 'slideRight', duration: 700, delay: 0 },
    });
    elements.push({
      id: imgId,
      type: 'image',
      src: '',
      aiImagePending: true,
      x: imgPanelX + 16,
      y: 64,
      width: 552,
      height: DECK_CANVAS_H - 128,
      zIndex: currentZ++,
      visible: true,
      animation: { entrance: 'zoomIn', duration: 850, delay: 200 },
    });
    const splitImgW = 552;
    const splitImgH = DECK_CANVAS_H - 128;
    const splitPixels = regionToLeonardoPixels(splitImgW, splitImgH);
    pushImageTask({
      elementId: imgId,
      w: splitPixels.width,
      h: splitPixels.height,
      visualProfile: 'cinematic',
    });
  } else if (isQuote) {
    addFullBleedBackground(0.36, 'cinematic');
    elements.push({
      id: uid('el-quote-glass'),
      type: 'shape',
      shapeType: 'rect',
      x: 120,
      y: 120,
      width: DECK_CANVAS_W - 240,
      height: DECK_CANVAS_H - 240,
      zIndex: currentZ++,
      visible: true,
      shapeStyle: glassCard(light),
      animation: { entrance: 'zoomIn', duration: 800, delay: 0 },
    });
    const quoteFontSize = 58;
    const quoteW = DECK_CANVAS_W - 320;
    const quoteY = 200;
    let quoteBottomY = quoteY;
    if (slide.title) {
      const quoteText = `"${slide.title.replace(/^"|"$/g, '')}"`;
      const quoteHeight = estimateTextBlockHeight(quoteText, quoteFontSize, quoteW, 1.55, 120, 260);
      quoteBottomY = quoteY + quoteHeight;
      elements.push({
        id: uid('el-quote'),
        type: 'text',
        x: 160,
        y: quoteY,
        width: quoteW,
        height: quoteHeight,
        content: quoteText,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: quoteFontSize,
          fontWeight: 'normal',
          fontStyle: 'italic',
          color: textPrimary,
          textAlign: 'center',
          lineHeight: 1.55,
        },
        animation: { entrance: 'fadeIn', duration: 1000, delay: 200 },
      });
    }
    if (slide.subtitle) {
      const authorFontSize = 30;
      const authorW = DECK_CANVAS_W - 320;
      const authorHeight = estimateTextBlockHeight(slide.subtitle, authorFontSize, authorW, 1.5, 56, 80);
      const authorY = slide.title ? quoteBottomY + 20 : 400;
      elements.push({
        id: uid('el-author'),
        type: 'text',
        x: 160,
        y: authorY,
        width: authorW,
        height: authorHeight,
        content: `— ${slide.subtitle}`,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 30,
          fontWeight: 'bold',
          color: accent,
          textAlign: 'center',
          letterSpacing: 3,
        },
        animation: { entrance: 'fadeIn', duration: 900, delay: 400 },
      });
    }
  } else if (isClosing) {
    addFullBleedBackground(0.38, 'cinematic');
    if (slide.title) {
      elements.push({
        id: uid('el-close-title'),
        type: 'text',
        x: 120,
        y: DECK_CANVAS_H / 2 - 72,
        width: DECK_CANVAS_W - 240,
        height: 120,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: 68,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: 'center',
          lineHeight: 1.1,
        },
        animation: { entrance: 'fadeSlideUp', duration: 800, delay: 100 },
      });
    }
    if (slide.subtitle) {
      elements.push({
        id: uid('el-close-sub'),
        type: 'text',
        x: 200,
        y: DECK_CANVAS_H / 2 + 56,
        width: DECK_CANVAS_W - 400,
        height: 48,
        content: slide.subtitle,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 30,
          color: textMuted,
          textAlign: 'center',
          letterSpacing: 1.5,
        },
        animation: { entrance: 'fadeIn', duration: 800, delay: 280 },
      });
    }
  } else if (isStats) {
    addSolidBackground();
    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: 72,
        y: 56,
        width: DECK_CANVAS_W - 144,
        height: 64,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: 50,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeSlideUp', duration: 550, delay: 0 },
      });
    }
    const statItems = mergedB.slice(0, 4);
    const colW = (DECK_CANVAS_W - 144) / Math.max(statItems.length, 1);
    statItems.forEach((stat, i) => {
      const parts = stat.split(/[:\u2013\u2014-]/);
      const value = parts[0]?.trim() || stat;
      const label = parts.slice(1).join(' ').trim() || '';
      const x = 72 + i * colW;
      elements.push({
        id: uid(`el-stat-card-${i}`),
        type: 'shape',
        shapeType: 'rect',
        x,
        y: 160,
        width: colW - 24,
        height: 420,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: 'zoomIn', duration: 520, delay: 120 + i * 90 },
      });
      elements.push({
        id: uid(`el-stat-val-${i}`),
        type: 'text',
        x: x + 24,
        y: 220,
        width: colW - 72,
        height: 120,
        content: value,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: 68,
          fontWeight: 'bold',
          color: accent,
          textAlign: 'left',
          lineHeight: 1,
        },
        animation: { entrance: 'fadeSlideUp', duration: 500, delay: 180 + i * 90 },
      });
      if (label) {
        elements.push({
          id: uid(`el-stat-lbl-${i}`),
          type: 'text',
          x: x + 24,
          y: 360,
          width: colW - 72,
          height: 80,
          content: label,
          zIndex: currentZ++,
          visible: true,
          textStyle: {
            fontFamily: bodyFont,
            fontSize: 26,
            color: textMuted,
            textAlign: 'left',
            lineHeight: 1.6,
          },
          animation: { entrance: 'fadeIn', duration: 450, delay: 240 + i * 90 },
        });
      }
    });
  } else if (isTimeline) {
    addFullBleedBackground(0.3, 'cinematic');
    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: 72,
        y: 48,
        width: DECK_CANVAS_W - 144,
        height: 56,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: 46,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeSlideUp', duration: 500, delay: 0 },
      });
    }
    const steps = mergedB.slice(0, 5);
    const stepW = (DECK_CANVAS_W - 144) / Math.max(steps.length, 1);
    elements.push({
      id: uid('el-timeline-line'),
      type: 'shape',
      shapeType: 'rect',
      x: 96,
      y: 340,
      width: DECK_CANVAS_W - 192,
      height: 3,
      zIndex: currentZ++,
      visible: true,
      shapeStyle: { fill: accent, cornerRadius: 2 },
      animation: { entrance: 'reveal', duration: 600, delay: 100 },
    });
    steps.forEach((step, i) => {
      const x = 72 + i * stepW + stepW / 2 - 20;
      elements.push({
        id: uid(`el-step-dot-${i}`),
        type: 'shape',
        shapeType: 'circle',
        x,
        y: 328,
        width: 28,
        height: 28,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: { fill: accent, stroke: light ? bgColor : '#fff', strokeWidth: 3 },
        animation: { entrance: 'zoomIn', duration: 400, delay: 200 + i * 80 },
      });
      elements.push({
        id: uid(`el-step-${i}`),
        type: 'text',
        x: 72 + i * stepW,
        y: 380,
        width: stepW - 16,
        height: 120,
        content: step.replace(/^•\s*/, ''),
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 24,
          color: textMuted,
          textAlign: 'center',
          lineHeight: 1.55,
        },
        animation: { entrance: 'fadeIn', duration: 450, delay: 280 + i * 80 },
      });
    });
  } else if (isComparison) {
    addSolidBackground();
    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: 72,
        y: 48,
        width: DECK_CANVAS_W - 144,
        height: 56,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: 46,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: 'center',
        },
        animation: { entrance: 'fadeSlideUp', duration: 500, delay: 0 },
      });
    }
    const mid = Math.ceil(mergedB.length / 2);
    const leftItems = mergedB.slice(0, mid);
    const rightItems = mergedB.slice(mid);
    const colW = (DECK_CANVAS_W - 160) / 2;
    [
      { items: leftItems, x: 64, label: 'A' },
      { items: rightItems, x: 64 + colW + 32, label: 'B' },
    ].forEach((col, ci) => {
      elements.push({
        id: uid(`el-cmp-col-${ci}`),
        type: 'shape',
        shapeType: 'rect',
        x: col.x,
        y: 140,
        width: colW,
        height: 480,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: ci === 0 ? 'fadeSlideLeft' : 'slideRight', duration: 600, delay: 80 },
      });
      col.items.slice(0, 4).forEach((item, i) => {
        elements.push({
          id: uid(`el-cmp-${ci}-${i}`),
          type: 'text',
          x: col.x + 28,
          y: 180 + i * 88,
          width: colW - 56,
          height: 72,
          content: `• ${item.replace(/^•\s*/, '')}`,
          zIndex: currentZ++,
          visible: true,
          textStyle: {
            fontFamily: bodyFont,
            fontSize: 28,
            color: textMuted,
            textAlign: 'left',
            lineHeight: 1.6,
          },
          animation: { entrance: 'fadeIn', duration: 450, delay: 200 + i * 70 },
        });
      });
    });
  } else if (isBullets) {
    if (layoutCategory === 'corporate' || layoutCategory === 'minimal' || layoutCategory === 'data_story') {
      addSolidBackground();
    } else {
      addFullBleedBackground(0.28, 'typography');
    }
    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: 96,
        y: 64,
        width: DECK_CANVAS_W - 192,
        height: 72,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: 52,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeSlideUp', duration: 550, delay: 0 },
      });
    }
    mergedB.slice(0, 6).forEach((bullet, i) => {
      const y = 168 + i * 82;
      elements.push({
        id: uid(`el-bullet-row-${i}`),
        type: 'shape',
        shapeType: 'rect',
        x: 96,
        y,
        width: DECK_CANVAS_W - 192,
        height: 64,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: bulletPill(light),
        animation: { entrance: 'fadeSlideLeft', duration: 450, delay: 120 + i * 60 },
      });
      elements.push({
        id: uid(`el-bullet-${i}`),
        type: 'text',
        x: 120,
        y: y + 16,
        width: DECK_CANVAS_W - 240,
        height: 40,
        content: bullet.replace(/^•\s*/, ''),
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 30,
          color: textMuted,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeIn', duration: 400, delay: 160 + i * 60 },
      });
    });
  } else {
    const contentVariant = resolveContentVariant(layoutCategory, sIdx);
    if (contentVariant === 1 || !prefersImageBackground(layoutCategory, slide.type)) {
      addSolidBackground();
    } else {
      addFullBleedBackground(contentVariant === 2 ? 0.22 : 0.28, 'cinematic');
    }

    let titleBlockBottom = 48;

    if (slide.title) {
      const titleX = contentVariant === 2 ? 140 : 72;
      const titleW = contentVariant === 2 ? DECK_CANVAS_W - 280 : DECK_CANVAS_W - 144;
      const titleFontSize = contentVariant === 2 ? 40 : 44;
      const titleHeight = estimateTextBlockHeight(slide.title, titleFontSize, titleW, 1.15, 72, 140);
      titleBlockBottom = 48 + titleHeight + 36;
      elements.push({
        id: uid('el-title-glass'),
        type: 'shape',
        shapeType: 'rect',
        x: 48,
        y: 48,
        width: DECK_CANVAS_W - 96,
        height: titleHeight + 36,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: 'fadeSlideUp', duration: 550, delay: 0 },
      });
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: titleX,
        y: 72,
        width: titleW,
        height: titleHeight,
        content: slide.title,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: contentVariant === 2 ? 40 : 44,
          fontWeight: 'bold',
          color: textPrimary,
          textAlign: contentVariant === 2 ? 'center' : 'left',
          lineHeight: 1.15,
        },
        animation: { entrance: 'fadeSlideUp', duration: 600, delay: 100 },
      });
    }

    if (slide.subtitle && mergedB.length === 0) {
      const subX = contentVariant === 2 ? 140 : 72;
      const subW = contentVariant === 2 ? DECK_CANVAS_W - 280 : DECK_CANVAS_W - 144;
      const subFontSize = 32;
      const subHeight = estimateTextBlockHeight(slide.subtitle, subFontSize, subW, 1.5, 80, 240);
      const subGlassY = slide.title ? titleBlockBottom + 16 : 48;
      const subTextY = subGlassY + 24;
      elements.push({
        id: uid('el-subtitle-glass'),
        type: 'shape',
        shapeType: 'rect',
        x: 48,
        y: subGlassY,
        width: DECK_CANVAS_W - 96,
        height: subHeight + 48,
        zIndex: currentZ++,
        visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: 'fadeSlideUp', duration: 550, delay: 150 },
      });
      elements.push({
        id: uid('el-subtitle'),
        type: 'text',
        x: subX,
        y: subTextY,
        width: subW,
        height: subHeight,
        content: slide.subtitle,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: subFontSize,
          color: textPrimary,
          textAlign: contentVariant === 2 ? 'center' : 'left',
          lineHeight: 1.5,
        },
        animation: { entrance: 'fadeIn', duration: 600, delay: 250 },
      });
    }

    if (mergedB.length > 0) {
      if (contentVariant === 1) {
        mergedB.slice(0, 5).forEach((bullet, i) => {
          const y = 196 + i * 88;
          elements.push({
            id: uid(`el-bullet-bg-${i}`),
            type: 'shape',
            shapeType: 'rect',
            x: 72,
            y,
            width: DECK_CANVAS_W - 144,
            height: 72,
            zIndex: currentZ++,
            visible: true,
            shapeStyle: {
              ...bulletPill(light),
              cornerRadius: 16,
            },
            animation: { entrance: 'fadeSlideLeft', duration: 480, delay: 200 + i * 75 },
          });
          elements.push({
            id: uid(`el-bullet-accent-${i}`),
            type: 'shape',
            shapeType: 'rect',
            x: 88,
            y: y + 18,
            width: 4,
            height: 36,
            zIndex: currentZ++,
            visible: true,
            shapeStyle: { fill: accent, cornerRadius: 2 },
            animation: { entrance: 'reveal', duration: 400, delay: 240 + i * 75 },
          });
          elements.push({
            id: uid(`el-bullet-${i}`),
            type: 'text',
            x: 108,
            y: y + 16,
            width: DECK_CANVAS_W - 220,
            height: 48,
            content: bullet.replace(/^•\s*/, ''),
            zIndex: currentZ++,
            visible: true,
            textStyle: {
              fontFamily: bodyFont,
              fontSize: 31,
              fontWeight: 'normal',
              color: textMuted,
              textAlign: 'left',
              lineHeight: 1.65,
            },
            animation: { entrance: 'fadeSlideLeft', duration: 480, delay: 280 + i * 75 },
          });
        });
      } else if (contentVariant === 2) {
        const cardW = (DECK_CANVAS_W - 160) / 2;
        mergedB.slice(0, 4).forEach((bullet, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 64 + col * (cardW + 32);
          const y = 188 + row * 112;
          elements.push({
            id: uid(`el-bullet-bg-${i}`),
            type: 'shape',
            shapeType: 'rect',
            x,
            y,
            width: cardW,
            height: 96,
            zIndex: currentZ++,
            visible: true,
            shapeStyle: glassCard(light),
            animation: { entrance: 'zoomIn', duration: 520, delay: 220 + i * 90 },
          });
          elements.push({
            id: uid(`el-bullet-${i}`),
            type: 'text',
            x: x + 24,
            y: y + 24,
            width: cardW - 48,
            height: 56,
            content: bullet.replace(/^•\s*/, ''),
            zIndex: currentZ++,
            visible: true,
            textStyle: {
              fontFamily: bodyFont,
              fontSize: 28,
              fontWeight: 'normal',
              color: textMuted,
              textAlign: 'left',
              lineHeight: 1.6,
            },
            animation: { entrance: 'fadeIn', duration: 450, delay: 300 + i * 90 },
          });
        });
      } else {
        const numBullets = Math.min(mergedB.length, 6);
        const isGrid = numBullets > 3;
        const boxWidth = isGrid ? (DECK_CANVAS_W - 128) / 2 : DECK_CANVAS_W - 96;
        const boxHeight = isGrid ? Math.min(120, (DECK_CANVAS_H - 200) / Math.ceil(numBullets / 2)) : 88;
        const startY = 172;

        mergedB.slice(0, 6).forEach((bullet, i) => {
          const col = isGrid ? i % 2 : 0;
          const row = isGrid ? Math.floor(i / 2) : i;
          const x = 48 + col * (boxWidth + 32);
          const y = startY + row * (boxHeight + 16);
          elements.push({
            id: uid(`el-bullet-bg-${i}`),
            type: 'shape',
            shapeType: 'rect',
            x,
            y,
            width: boxWidth,
            height: boxHeight,
            zIndex: currentZ++,
            visible: true,
            shapeStyle: glassCard(light),
            animation: { entrance: 'zoomIn', duration: 500, delay: 200 + i * 90 },
          });
          elements.push({
            id: uid(`el-bullet-num-${i}`),
            type: 'text',
            x: x + 20,
            y: y + 16,
            width: 36,
            height: 32,
            content: String(i + 1).padStart(2, '0'),
            zIndex: currentZ++,
            visible: true,
            textStyle: {
              fontFamily: headingFont,
              fontSize: 22,
              fontWeight: 'bold',
              color: accent,
              textAlign: 'left',
            },
            animation: { entrance: 'fadeIn', duration: 400, delay: 260 + i * 90 },
          });
          elements.push({
            id: uid(`el-bullet-${i}`),
            type: 'text',
            x: x + 56,
            y: y + 18,
            width: boxWidth - 72,
            height: boxHeight - 32,
            content: bullet.replace(/^•\s*/, ''),
            zIndex: currentZ++,
            visible: true,
            textStyle: {
              fontFamily: bodyFont,
              fontSize: isGrid ? 18 : 21,
              fontWeight: 'normal',
              color: textMuted,
              textAlign: 'left',
              lineHeight: 1.65,
            },
            animation: { entrance: 'fadeIn', duration: 500, delay: 320 + i * 90 },
          });
        });
      }
    }
  }

  return { elements, imageTasks };
}
