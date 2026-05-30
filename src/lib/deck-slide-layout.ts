import type { SlideElement } from '@/types';
import type { DeckImageTask } from '@/lib/deck-image-generation';
import { buildFallbackImagePrompt } from '@/lib/ai/deck-generation-skill';
import type { VisualBackgroundMode } from '@/lib/visual-themes';

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

export function resolveDeckImagePrompt(slide: AiSlideInput): string {
  const explicit = typeof slide.imagePrompt === 'string' ? slide.imagePrompt.trim() : '';
  if (explicit) return explicit;
  return buildFallbackImagePrompt({
    title: slide.title,
    type: slide.type,
  });
}

const glassCard = (light: boolean) =>
  light
    ? {
        fill: 'rgba(255, 255, 255, 0.88)',
        stroke: 'rgba(0, 0, 0, 0.08)',
        strokeWidth: 1,
        cornerRadius: 20,
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowBlur: 24,
      }
    : {
        fill: 'rgba(255, 255, 255, 0.045)',
        stroke: 'rgba(255, 255, 255, 0.12)',
        strokeWidth: 1,
        cornerRadius: 20,
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowBlur: 40,
      };

const bulletPill = (light: boolean) =>
  light
    ? {
        fill: 'rgba(255,255,255,0.92)',
        stroke: 'rgba(0,0,0,0.06)',
        strokeWidth: 1,
        cornerRadius: 14,
      }
    : {
        fill: 'rgba(255,255,255,0.04)',
        stroke: 'rgba(255,255,255,0.08)',
        strokeWidth: 1,
        cornerRadius: 14,
      };

/**
 * Gamma-style slide layouts: full-bleed backgrounds, glass cards, editorial hierarchy.
 */
export function buildDeckSlideElements(args: BuildDeckSlideLayoutArgs): BuildDeckSlideLayoutResult {
  const { slide, sIdx, palette, headingFont, bodyFont, uid } = args;
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
  const flipSplit = sIdx % 2 === 1;
  const imagePrompt = resolveDeckImagePrompt(slide);
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
    currentZ = Math.max(currentZ, 1);
  };

  const addFullBleedBackground = (bgOpacity: number, visualProfile: 'cinematic' | 'typography') => {
    const bgId = uid('el-bg-image');
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
      opacity: bgOpacity,
      aiImagePending: true,
      animation: { entrance: 'fadeIn', duration: 1200, delay: 0 },
    });
    pushImageTask({
      elementId: bgId,
      w: 1280,
      h: 720,
      visualProfile,
    });
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
        fill: light ? 'rgba(255, 255, 255, 0.55)' : 'rgba(5, 5, 12, 0.62)',
        stroke: 'transparent',
        strokeWidth: 0,
      },
      animation: { entrance: 'fadeIn', duration: 800, delay: 0 },
    });
    currentZ = Math.max(currentZ, 2);
  };

  if (isHero) {
    addFullBleedBackground(0.32, 'typography');
    const titleText = slide.title?.trim() ?? '';
    const titleFontSize = titleText.length > 42 ? 64 : titleText.length > 28 ? 76 : 88;
    const estLines = Math.max(1, Math.ceil(titleText.length / (titleFontSize > 76 ? 18 : 22)));
    const titleHeight = Math.min(300, Math.max(120, Math.round(estLines * titleFontSize * 1.12)));
    const titleY = Math.round(DECK_CANVAS_H / 2 - titleHeight / 2 - 36);
    const subtitleY = titleY + titleHeight + 20;

    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: 96,
        y: titleY,
        width: DECK_CANVAS_W - 192,
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
        width: DECK_CANVAS_W - 440,
        height: 72,
        content: slide.subtitle,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 26,
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
          fontSize: 19,
          fontWeight: 'normal',
          color: textMuted,
          textAlign: 'left',
          lineHeight: 1.4,
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
    pushImageTask({
      elementId: imgId,
      w: 800,
      h: 900,
      visualProfile: 'cinematic',
    });
  } else if (isQuote) {
    addFullBleedBackground(0.28, 'cinematic');
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
    if (slide.title) {
      elements.push({
        id: uid('el-quote'),
        type: 'text',
        x: 160,
        y: 200,
        width: DECK_CANVAS_W - 320,
        height: 260,
        content: `"${slide.title.replace(/^"|"$/g, '')}"`,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: headingFont,
          fontSize: 48,
          fontWeight: 'normal',
          fontStyle: 'italic',
          color: textPrimary,
          textAlign: 'center',
          lineHeight: 1.35,
        },
        animation: { entrance: 'fadeIn', duration: 1000, delay: 200 },
      });
    }
    if (slide.subtitle) {
      elements.push({
        id: uid('el-author'),
        type: 'text',
        x: 160,
        y: 480,
        width: DECK_CANVAS_W - 320,
        height: 56,
        content: `— ${slide.subtitle}`,
        zIndex: currentZ++,
        visible: true,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 22,
          fontWeight: 'bold',
          color: accent,
          textAlign: 'center',
          letterSpacing: 3,
        },
        animation: { entrance: 'fadeIn', duration: 900, delay: 400 },
      });
    }
  } else if (isClosing) {
    addFullBleedBackground(0.3, 'cinematic');
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
          fontSize: 56,
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
          fontSize: 22,
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
          fontSize: 40,
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
          fontSize: 56,
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
            fontSize: 18,
            color: textMuted,
            textAlign: 'left',
            lineHeight: 1.4,
          },
          animation: { entrance: 'fadeIn', duration: 450, delay: 240 + i * 90 },
        });
      }
    });
  } else if (isTimeline) {
    addFullBleedBackground(0.22, 'cinematic');
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
          fontSize: 36,
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
          fontSize: 16,
          color: textMuted,
          textAlign: 'center',
          lineHeight: 1.35,
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
          fontSize: 36,
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
            fontSize: 20,
            color: textMuted,
            textAlign: 'left',
            lineHeight: 1.4,
          },
          animation: { entrance: 'fadeIn', duration: 450, delay: 200 + i * 70 },
        });
      });
    });
  } else if (isBullets) {
    addFullBleedBackground(0.2, 'typography');
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
          fontSize: 42,
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
          fontSize: 22,
          color: textMuted,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeIn', duration: 400, delay: 160 + i * 60 },
      });
    });
  } else {
    const contentVariant = sIdx % 3;
    if (contentVariant === 1) {
      addSolidBackground();
    } else {
      addFullBleedBackground(contentVariant === 2 ? 0.18 : 0.24, 'cinematic');
    }

    if (slide.title) {
      const titleX = contentVariant === 2 ? 140 : 72;
      const titleW = contentVariant === 2 ? DECK_CANVAS_W - 280 : DECK_CANVAS_W - 144;
      const titleFontSize = contentVariant === 2 ? 40 : 44;
      const titleHeight = estimateTextBlockHeight(slide.title, titleFontSize, titleW, 1.15, 72, 140);
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
              fontSize: 23,
              fontWeight: 'normal',
              color: textMuted,
              textAlign: 'left',
              lineHeight: 1.45,
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
              fontSize: 20,
              fontWeight: 'normal',
              color: textMuted,
              textAlign: 'left',
              lineHeight: 1.4,
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
              fontSize: 14,
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
              lineHeight: 1.45,
            },
            animation: { entrance: 'fadeIn', duration: 500, delay: 320 + i * 90 },
          });
        });
      }
    }
  }

  return { elements, imageTasks };
}
