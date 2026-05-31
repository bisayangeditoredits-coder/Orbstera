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


// ─── Utility: clamp bullet count so items never overflow the canvas ───────────
const SAFE_BOTTOM = DECK_CANVAS_H - 40;

// Padding / gutter used throughout
const PAD = 64;         // outer horizontal padding
const INNER_PAD = 32;   // padding inside cards/panels
const GAP = 24;         // gap between rows/columns

// ─── Utility: clamp bullet count so items never overflow the canvas ───────────
function safeMaxBullets(startY: number, itemHeight: number, gap: number, hardMax = 6): number {
  const available = SAFE_BOTTOM - startY;
  const fits = Math.floor(available / (itemHeight + gap));
  return Math.max(1, Math.min(fits, hardMax));
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function buildDeckSlideElements(args: BuildDeckSlideLayoutArgs): BuildDeckSlideLayoutResult {
  const { slide, sIdx, slideCount, palette, headingFont, bodyFont, uid } = args;
  const layoutCategory = normalizeDeckLayoutCategory(args.layoutCategory);
  const layoutOption   = getDeckLayoutCategoryOption(layoutCategory);
  const imageTasks: DeckImageTask[] = [];
  const elements: SlideElement[]    = [...(args.existingElements || [])];
  let currentZ = elements.length + 1;

  const light       = args.backgroundMode === 'light';
  const bgColor     = palette[0] || (light ? '#FFFFFF' : '#05050A');
  const textPrimary = palette[1] || (light ? '#1F2937' : '#FFFFFF');
  const textMuted   = palette[3] || palette[1];
  const accent      = palette[2] || '#7B61FF';

  const nestedB = slide.content?.bullets;
  const mergedB = [...(slide.bullets || []), ...(nestedB || [])].filter(
    (b, i, a) => b && a.indexOf(b) === i,
  );

  // Slide type booleans
  const isHero       = slide.type === 'hero';
  const isSplit      = slide.type === 'split' || slide.type === 'media';
  const isQuote      = slide.type === 'quote';
  const isClosing    = slide.type === 'closing';
  const isStats      = slide.type === 'stats';
  const isTimeline   = slide.type === 'timeline';
  const isComparison = slide.type === 'comparison';
  const isBullets    = slide.type === 'bullets';
  const isContent    = slide.type === 'content' || (!isHero && !isSplit && !isQuote && !isClosing && !isStats && !isTimeline && !isComparison && !isBullets);

  // Alternate split direction every other slide
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

  // ── Image task helpers ─────────────────────────────────────────────────────
  const pushImageTask = (task: Omit<DeckImageTask, 'prompt' | 'slideId'> & { prompt?: string }) => {
    imageTasks.push({
      slideId:      slide.id,
      elementId:    task.elementId,
      prompt:       task.prompt ?? imagePrompt,
      w:            task.w,
      h:            task.h,
      visualProfile: task.visualProfile,
    });
  };

  // ── Background helpers ─────────────────────────────────────────────────────
  const addSolidBackground = () => {
    elements.unshift({
      id: uid('el-bg-solid'),
      type: 'shape', shapeType: 'rect',
      x: 0, y: 0, width: DECK_CANVAS_W, height: DECK_CANVAS_H,
      zIndex: 0, visible: true,
      shapeStyle: { fill: bgColor, stroke: 'transparent', strokeWidth: 0 },
      animation: { entrance: 'fadeIn', duration: 400, delay: 0 },
    });
    // Subtle decorative ribbons
    elements.unshift({
      id: uid('el-bg-ribbon-1'),
      type: 'shape', shapeType: 'rect',
      x: DECK_CANVAS_W - 550, y: -200,
      width: 280, height: DECK_CANVAS_H + 400,
      rotation: 35, zIndex: 0, visible: true,
      shapeStyle: { fill: accent, opacity: light ? 0.04 : 0.08 },
      animation: { entrance: 'fadeSlideLeft', duration: 1200, delay: 0 },
    });
    elements.unshift({
      id: uid('el-bg-ribbon-2'),
      type: 'shape', shapeType: 'rect',
      x: DECK_CANVAS_W - 250, y: -300,
      width: 80, height: DECK_CANVAS_H + 600,
      rotation: 35, zIndex: 0, visible: true,
      shapeStyle: { fill: textPrimary, opacity: light ? 0.02 : 0.05 },
      animation: { entrance: 'fadeSlideLeft', duration: 1000, delay: 100 },
    });
    elements.unshift({
      id: uid('el-bg-frame'),
      type: 'shape', shapeType: 'rect',
      x: 32, y: 32,
      width: DECK_CANVAS_W - 64, height: DECK_CANVAS_H - 64,
      zIndex: 0, visible: true,
      shapeStyle: {
        fill: 'transparent',
        stroke: textPrimary,
        strokeWidth: 1,
        opacity: light ? 0.06 : 0.12,
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
      type: 'image', src: '',
      x: 0, y: 0, width: DECK_CANVAS_W, height: DECK_CANVAS_H,
      zIndex: 0, visible: true,
      opacity: imageOpacity,
      aiImagePending: true,
      animation: { entrance: 'fadeIn', duration: 1200, delay: 0 },
    });
    pushImageTask({ elementId: bgId, w: 1024, h: 576, visualProfile });
    if (!light) {
      elements.push({
        id: uid('el-bg-overlay'),
        type: 'shape', shapeType: 'rect',
        x: 0, y: 0, width: DECK_CANVAS_W, height: DECK_CANVAS_H,
        zIndex: 1, visible: true,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO
  // ═══════════════════════════════════════════════════════════════════════════
  if (isHero) {
    if (layoutCategory === 'minimal' || layoutCategory === 'corporate') {
      addSolidBackground();
    } else {
      addFullBleedBackground(layoutCategory === 'cinematic' ? 0.48 : 0.42, 'typography');
    }

    const titleText    = slide.title?.trim() ?? '';
    const titleFontSize = titleText.length > 42 ? 64 : titleText.length > 28 ? 76 : 88;
    const titleW       = DECK_CANVAS_W - 192;
    const titleHeight  = titleText
      ? estimateTextBlockHeight(titleText, titleFontSize, titleW, 1.08, 100, 280)
      : 0;
    const subFontSize  = 34;
    const subW         = DECK_CANVAS_W - 440;
    const subHeight    = slide.subtitle
      ? estimateTextBlockHeight(slide.subtitle, subFontSize, subW, 1.5, 72, 120)
      : 0;
    const titleY       = 108;
    const subtitleY    = titleY + titleHeight + 24;
    const heroScrimH   = titleHeight + (slide.subtitle ? subHeight + 48 : 32) + 36;

    if (slide.title) {
      elements.push({
        id: uid('el-title-scrim'),
        type: 'shape', shapeType: 'rect',
        x: 48, y: titleY - 28,
        width: DECK_CANVAS_W - 96, height: heroScrimH,
        zIndex: currentZ++, visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: 'fadeIn', duration: 600, delay: 0 },
      });
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: 96, y: titleY, width: titleW, height: titleHeight,
        content: slide.title,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: titleFontSize,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'center', lineHeight: 1.08,
        },
        animation: { entrance: 'fadeSlideUp', duration: 900, delay: 80 },
      });
    }
    if (slide.subtitle) {
      elements.push({
        id: uid('el-sub'),
        type: 'text',
        x: 220, y: subtitleY, width: subW, height: subHeight,
        content: slide.subtitle,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: bodyFont, fontSize: subFontSize,
          fontWeight: 'normal', color: textMuted,
          textAlign: 'center', lineHeight: 1.5, letterSpacing: 2,
        },
        animation: { entrance: 'fadeSlideUp', duration: 900, delay: 220 },
      });
    }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT / MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isSplit) {
    addSolidBackground();

    // FIX: explicit column widths with a proper gap so panels never overlap
    const PANEL_GAP   = 16;
    const PANEL_W     = (DECK_CANVAS_W - PAD * 2 - PANEL_GAP) / 2;  // 568px each
    const textPanelX  = flipSplit ? PAD + PANEL_W + PANEL_GAP : PAD;
    const imgPanelX   = flipSplit ? PAD : PAD + PANEL_W + PANEL_GAP;

    elements.push({
      id: uid('el-split-glass'),
      type: 'shape', shapeType: 'rect',
      x: textPanelX, y: 48,
      width: PANEL_W, height: DECK_CANVAS_H - 96,
      zIndex: currentZ++, visible: true,
      shapeStyle: glassCard(light),
      animation: { entrance: 'fadeSlideLeft', duration: 650, delay: 0 },
    });

    const titleFontSize = 44;
    const titleHeight   = slide.title
      ? estimateTextBlockHeight(slide.title, titleFontSize, PANEL_W - INNER_PAD * 2, 1.15, 90, 160)
      : 0;
    const titleY        = 108;
    const bulletsStartY = slide.title ? titleY + titleHeight + GAP : 160;

    // Accent bar
    elements.push({
      id: uid('el-accent'),
      type: 'shape', shapeType: 'rect',
      x: textPanelX + INNER_PAD, y: 88,
      width: 72, height: 5,
      zIndex: currentZ++, visible: true,
      shapeStyle: { fill: accent, stroke: 'transparent', cornerRadius: 3 },
      animation: { entrance: 'reveal', duration: 500, delay: 120 },
    });

    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: textPanelX + INNER_PAD, y: titleY,
        width: PANEL_W - INNER_PAD * 2, height: titleHeight,
        content: slide.title,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: titleFontSize,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'left', lineHeight: 1.15,
        },
        animation: { entrance: 'fadeSlideLeft', duration: 650, delay: 160 },
      });
    }

    const BULLET_H     = 58;
    const maxBullets   = safeMaxBullets(bulletsStartY, BULLET_H, 16, 5);

    mergedB.slice(0, maxBullets).forEach((bullet, i) => {
      const y = bulletsStartY + i * (BULLET_H + 16);
      elements.push({
        id: uid(`el-bullet-bg-${i}`),
        type: 'shape', shapeType: 'rect',
        x: textPanelX + INNER_PAD, y,
        width: PANEL_W - INNER_PAD * 2, height: BULLET_H,
        zIndex: currentZ++, visible: true,
        shapeStyle: bulletPill(light),
        animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 280 + i * 70 },
      });
      elements.push({
        id: uid(`el-bullet-${i}`),
        type: 'text',
        x: textPanelX + INNER_PAD + 20, y: y + 14,
        width: PANEL_W - INNER_PAD * 2 - 40, height: BULLET_H - 20,
        content: bullet.replace(/^•\s*/, ''),
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: bodyFont, fontSize: 26,
          fontWeight: 'normal', color: textMuted,
          textAlign: 'left', lineHeight: 1.55,
        },
        animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 320 + i * 70 },
      });
    });

    // FIX: image panel — use portrait aspect ratio (9:16 cropped to panel dimensions)
    // This avoids stretching in pptxgenjs since the generated image matches the panel shape.
    const imgId     = uid('el-image');
    const imgInsetX = imgPanelX + 16;
    const imgInsetY = 64;
    const imgW      = PANEL_W - 32;
    const imgH      = DECK_CANVAS_H - 128;

    elements.push({
      id: uid('el-split-frame'),
      type: 'shape', shapeType: 'rect',
      x: imgPanelX, y: 48,
      width: PANEL_W, height: DECK_CANVAS_H - 96,
      zIndex: currentZ++, visible: true,
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
      type: 'image', src: '',
      aiImagePending: true,
      x: imgInsetX, y: imgInsetY,
      width: imgW, height: imgH,
      zIndex: currentZ++, visible: true,
      animation: { entrance: 'zoomIn', duration: 850, delay: 200 },
    });

    // FIX: request portrait pixels matching the panel's aspect ratio
    const splitPixels = regionToLeonardoPixels(imgW, imgH);
    pushImageTask({
      elementId: imgId,
      w: splitPixels.width,
      h: splitPixels.height,
      visualProfile: 'cinematic',
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUOTE
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isQuote) {
    addFullBleedBackground(0.36, 'cinematic');

    elements.push({
      id: uid('el-quote-glass'),
      type: 'shape', shapeType: 'rect',
      x: 120, y: 120,
      width: DECK_CANVAS_W - 240, height: DECK_CANVAS_H - 240,
      zIndex: currentZ++, visible: true,
      shapeStyle: glassCard(light),
      animation: { entrance: 'zoomIn', duration: 800, delay: 0 },
    });

    const quoteFontSize = 58;
    const quoteW        = DECK_CANVAS_W - 320;
    const quoteY        = 200;

    if (slide.title) {
      const quoteText   = `"${slide.title.replace(/^"|"$/g, '')}"`;
      const quoteHeight = estimateTextBlockHeight(quoteText, quoteFontSize, quoteW, 1.55, 120, 260);
      elements.push({
        id: uid('el-quote'),
        type: 'text',
        x: 160, y: quoteY,
        width: quoteW, height: quoteHeight,
        content: quoteText,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: quoteFontSize,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'center', lineHeight: 1.55,
        },
        animation: { entrance: 'fadeSlideUp', duration: 900, delay: 100 },
      });

      if (slide.subtitle) {
        elements.push({
          id: uid('el-quote-attr'),
          type: 'text',
          x: 160, y: quoteY + quoteHeight + 32,
          width: quoteW, height: 48,
          content: `— ${slide.subtitle}`,
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: bodyFont, fontSize: 28,
            fontWeight: 'normal', color: textMuted,
            textAlign: 'center', letterSpacing: 1,
          },
          animation: { entrance: 'fadeIn', duration: 700, delay: 340 },
        });
      }
    }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOSING
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isClosing) {
    if (layoutCategory === 'minimal' || layoutCategory === 'corporate') {
      addSolidBackground();
    } else {
      addFullBleedBackground(0.38, 'cinematic');
    }

    if (slide.title) {
      const titleFontSize = 80;
      const titleW        = DECK_CANVAS_W - 200;
      const titleH        = estimateTextBlockHeight(slide.title, titleFontSize, titleW, 1.1, 100, 220);
      const titleY        = DECK_CANVAS_H / 2 - titleH / 2 - 40;

      elements.push({
        id: uid('el-close-title'),
        type: 'text',
        x: 100, y: titleY,
        width: titleW, height: titleH,
        content: slide.title,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: titleFontSize,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'center', lineHeight: 1.1,
        },
        animation: { entrance: 'fadeSlideUp', duration: 800, delay: 100 },
      });
    }

    if (slide.subtitle) {
      elements.push({
        id: uid('el-close-sub'),
        type: 'text',
        x: 200, y: DECK_CANVAS_H / 2 + 56,
        width: DECK_CANVAS_W - 400, height: 48,
        content: slide.subtitle,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: bodyFont, fontSize: 30,
          color: textMuted,
          textAlign: 'center', letterSpacing: 1.5,
        },
        animation: { entrance: 'fadeIn', duration: 800, delay: 280 },
      });
    }

    // FIX: CTA button shape for a polished closing slide
    const ctaW = 260;
    const ctaH = 52;
    const ctaX = (DECK_CANVAS_W - ctaW) / 2;
    const ctaY = DECK_CANVAS_H / 2 + 120;
    elements.push({
      id: uid('el-cta-btn'),
      type: 'shape', shapeType: 'rect',
      x: ctaX, y: ctaY,
      width: ctaW, height: ctaH,
      zIndex: currentZ++, visible: true,
      shapeStyle: {
        fill: accent,
        stroke: 'transparent',
        cornerRadius: 26,
        opacity: 0.9,
      },
      animation: { entrance: 'zoomIn', duration: 600, delay: 450 },
    });
    elements.push({
      id: uid('el-cta-label'),
      type: 'text',
      x: ctaX, y: ctaY + 12,
      width: ctaW, height: ctaH - 16,
      content: 'Get Started',
      zIndex: currentZ++, visible: true,
      textStyle: {
        fontFamily: headingFont, fontSize: 22,
        fontWeight: 'bold', color: '#FFFFFF',
        textAlign: 'center',
      },
      animation: { entrance: 'fadeIn', duration: 500, delay: 560 },
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isStats) {
    addSolidBackground();

    const titleH = 64;
    const titleY = 48;

    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: PAD, y: titleY,
        width: DECK_CANVAS_W - PAD * 2, height: titleH,
        content: slide.title,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: 50,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeSlideUp', duration: 550, delay: 0 },
      });
    }

    const statItems   = mergedB.slice(0, 4);
    const cardAreaTop = titleY + titleH + GAP;
    // FIX: card height fills remaining vertical space minus padding
    const cardH       = SAFE_BOTTOM - cardAreaTop - 8;
    const colW        = (DECK_CANVAS_W - PAD * 2 - GAP * (statItems.length - 1)) / Math.max(statItems.length, 1);

    statItems.forEach((stat, i) => {
      const parts = stat.split(/[:\u2013\u2014-]/);
      const value = parts[0]?.trim() || stat;
      const label = parts.slice(1).join(' ').trim() || '';
      const x     = PAD + i * (colW + GAP);

      elements.push({
        id: uid(`el-stat-card-${i}`),
        type: 'shape', shapeType: 'rect',
        x, y: cardAreaTop,
        width: colW, height: cardH,
        zIndex: currentZ++, visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: 'zoomIn', duration: 520, delay: 120 + i * 90 },
      });

      // Large metric value — vertically centred in upper half of card
      elements.push({
        id: uid(`el-stat-val-${i}`),
        type: 'text',
        x: x + INNER_PAD, y: cardAreaTop + 48,
        width: colW - INNER_PAD * 2, height: 120,
        content: value,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: 68,
          fontWeight: 'bold', color: accent,
          textAlign: 'left', lineHeight: 1,
        },
        animation: { entrance: 'fadeSlideUp', duration: 500, delay: 180 + i * 90 },
      });

      // Accent underline
      elements.push({
        id: uid(`el-stat-line-${i}`),
        type: 'shape', shapeType: 'rect',
        x: x + INNER_PAD, y: cardAreaTop + 172,
        width: 48, height: 4,
        zIndex: currentZ++, visible: true,
        shapeStyle: { fill: accent, cornerRadius: 2 },
        animation: { entrance: 'reveal', duration: 400, delay: 220 + i * 90 },
      });

      if (label) {
        elements.push({
          id: uid(`el-stat-lbl-${i}`),
          type: 'text',
          x: x + INNER_PAD, y: cardAreaTop + 196,
          width: colW - INNER_PAD * 2, height: cardH - 220,
          content: label,
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: bodyFont, fontSize: 24,
            color: textMuted,
            textAlign: 'left', lineHeight: 1.6,
          },
          animation: { entrance: 'fadeIn', duration: 450, delay: 240 + i * 90 },
        });
      }
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isTimeline) {
    addFullBleedBackground(0.3, 'cinematic');

    const titleH = 56;
    const titleY = 48;

    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: PAD, y: titleY,
        width: DECK_CANVAS_W - PAD * 2, height: titleH,
        content: slide.title,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: 46,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeSlideUp', duration: 500, delay: 0 },
      });
    }

    const steps     = mergedB.slice(0, 5);
    const lineY     = 340;
    const dotR      = 14; // radius

    // Timeline line
    elements.push({
      id: uid('el-timeline-line'),
      type: 'shape', shapeType: 'rect',
      x: PAD + 32, y: lineY - 2,
      width: DECK_CANVAS_W - (PAD + 32) * 2, height: 4,
      zIndex: currentZ++, visible: true,
      shapeStyle: { fill: accent, cornerRadius: 2 },
      animation: { entrance: 'reveal', duration: 600, delay: 100 },
    });

    const stepW = (DECK_CANVAS_W - (PAD + 32) * 2) / Math.max(steps.length, 1);

    steps.forEach((step, i) => {
      const cx = PAD + 32 + i * stepW + stepW / 2;

      // FIX: dot y-center = lineY, not lineY - 12
      elements.push({
        id: uid(`el-step-dot-${i}`),
        type: 'shape', shapeType: 'circle',
        x: cx - dotR, y: lineY - dotR,
        width: dotR * 2, height: dotR * 2,
        zIndex: currentZ++, visible: true,
        shapeStyle: {
          fill: accent,
          stroke: light ? bgColor : '#ffffff',
          strokeWidth: 3,
        },
        animation: { entrance: 'zoomIn', duration: 400, delay: 200 + i * 80 },
      });

      // Step number above the line
      elements.push({
        id: uid(`el-step-num-${i}`),
        type: 'text',
        x: cx - stepW / 2 + 8, y: lineY - 72,
        width: stepW - 16, height: 36,
        content: String(i + 1).padStart(2, '0'),
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: 22,
          fontWeight: 'bold', color: accent,
          textAlign: 'center',
        },
        animation: { entrance: 'fadeIn', duration: 350, delay: 240 + i * 80 },
      });

      // Step label below the line
      elements.push({
        id: uid(`el-step-${i}`),
        type: 'text',
        x: cx - stepW / 2 + 8, y: lineY + 32,
        width: stepW - 16, height: 160,
        content: step.replace(/^•\s*/, ''),
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: bodyFont, fontSize: 22,
          color: textMuted,
          textAlign: 'center', lineHeight: 1.55,
        },
        animation: { entrance: 'fadeIn', duration: 450, delay: 280 + i * 80 },
      });
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARISON
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isComparison) {
    addSolidBackground();

    const titleH = 56;
    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: PAD, y: 40,
        width: DECK_CANVAS_W - PAD * 2, height: titleH,
        content: slide.title,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: 46,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'center',
        },
        animation: { entrance: 'fadeSlideUp', duration: 500, delay: 0 },
      });
    }

    const mid       = Math.ceil(mergedB.length / 2);
    const leftItems = mergedB.slice(0, mid);
    const rightItems = mergedB.slice(mid);
    const colTop    = 40 + titleH + GAP;
    const colH      = SAFE_BOTTOM - colTop;
    const colW      = (DECK_CANVAS_W - PAD * 2 - GAP) / 2;

    [
      { items: leftItems, x: PAD, label: slide.bullets?.[0] ? 'Before' : 'A', color: accent },
      { items: rightItems, x: PAD + colW + GAP, label: slide.bullets?.[0] ? 'After' : 'B', color: textPrimary },
    ].forEach((col, ci) => {
      elements.push({
        id: uid(`el-cmp-col-${ci}`),
        type: 'shape', shapeType: 'rect',
        x: col.x, y: colTop,
        width: colW, height: colH,
        zIndex: currentZ++, visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: ci === 0 ? 'fadeSlideLeft' : 'slideRight', duration: 600, delay: 80 },
      });

      // FIX: colored header badge to distinguish left vs right
      elements.push({
        id: uid(`el-cmp-header-${ci}`),
        type: 'shape', shapeType: 'rect',
        x: col.x + INNER_PAD, y: colTop + 20,
        width: 80, height: 32,
        zIndex: currentZ++, visible: true,
        shapeStyle: {
          fill: ci === 0 ? accent : 'rgba(255,255,255,0.15)',
          cornerRadius: 6,
        },
        animation: { entrance: 'fadeIn', duration: 400, delay: 120 + ci * 80 },
      });
      elements.push({
        id: uid(`el-cmp-header-label-${ci}`),
        type: 'text',
        x: col.x + INNER_PAD, y: colTop + 24,
        width: 80, height: 28,
        content: col.label,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: 16,
          fontWeight: 'bold',
          color: ci === 0 ? '#FFFFFF' : textPrimary,
          textAlign: 'center',
        },
        animation: { entrance: 'fadeIn', duration: 350, delay: 160 + ci * 80 },
      });

      const itemStartY = colTop + 68;
      const itemH      = 72;
      const maxItems   = safeMaxBullets(itemStartY, itemH, 12, 4);

      col.items.slice(0, maxItems).forEach((item, i) => {
        elements.push({
          id: uid(`el-cmp-${ci}-${i}`),
          type: 'text',
          x: col.x + INNER_PAD, y: itemStartY + i * (itemH + 12),
          width: colW - INNER_PAD * 2, height: itemH,
          content: `• ${item.replace(/^•\s*/, '')}`,
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: bodyFont, fontSize: 26,
            color: textMuted,
            textAlign: 'left', lineHeight: 1.6,
          },
          animation: { entrance: 'fadeIn', duration: 450, delay: 200 + i * 70 },
        });
      });
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // BULLETS
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isBullets) {
    if (layoutCategory === 'corporate' || layoutCategory === 'minimal' || layoutCategory === 'data_story') {
      addSolidBackground();
    } else {
      addFullBleedBackground(0.28, 'typography');
    }

    const titleFontSize = 52;
    const titleH        = slide.title
      ? estimateTextBlockHeight(slide.title, titleFontSize, DECK_CANVAS_W - 192, 1.15, 56, 120)
      : 0;
    const titleY        = 56;

    if (slide.title) {
      elements.push({
        id: uid('el-title'),
        type: 'text',
        x: PAD + INNER_PAD, y: titleY,
        width: DECK_CANVAS_W - (PAD + INNER_PAD) * 2, height: titleH,
        content: slide.title,
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: headingFont, fontSize: titleFontSize,
          fontWeight: 'bold', color: textPrimary,
          textAlign: 'left',
        },
        animation: { entrance: 'fadeSlideUp', duration: 550, delay: 0 },
      });
    }

    // FIX: startY derived from actual title height, not a magic constant
    const bulletsStartY = titleY + titleH + GAP;
    const BULLET_H      = 64;
    const maxBullets    = safeMaxBullets(bulletsStartY, BULLET_H, 16, 6);

    mergedB.slice(0, maxBullets).forEach((bullet, i) => {
      const y = bulletsStartY + i * (BULLET_H + 16);
      elements.push({
        id: uid(`el-bullet-row-${i}`),
        type: 'shape', shapeType: 'rect',
        x: PAD, y,
        width: DECK_CANVAS_W - PAD * 2, height: BULLET_H,
        zIndex: currentZ++, visible: true,
        shapeStyle: bulletPill(light),
        animation: { entrance: 'fadeSlideLeft', duration: 450, delay: 120 + i * 60 },
      });
      elements.push({
        id: uid(`el-bullet-${i}`),
        type: 'text',
        x: PAD + 24, y: y + 16,
        width: DECK_CANVAS_W - PAD * 2 - 48, height: BULLET_H - 24,
        content: bullet.replace(/^•\s*/, ''),
        zIndex: currentZ++, visible: true,
        textStyle: {
          fontFamily: bodyFont, fontSize: 28,
          color: textMuted,
          textAlign: 'left', lineHeight: 1.5,
        },
        animation: { entrance: 'fadeIn', duration: 400, delay: 160 + i * 60 },
      });
    });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT (FIX: explicit handling with 3 properly distinct layouts)
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (isContent) {
    const contentVariant = resolveContentVariant(layoutCategory, sIdx);

    // ── Variant 0: Editorial Left — title left-aligned, bullets as accent-bar rows ──
    if (contentVariant === 0) {
      if (prefersImageBackground(layoutCategory, slide.type)) {
        addFullBleedBackground(0.28, 'cinematic');
      } else {
        addSolidBackground();
      }

      const titleFontSize = 48;
      const titleW        = DECK_CANVAS_W - PAD * 2;
      const titleH        = slide.title
        ? estimateTextBlockHeight(slide.title, titleFontSize, titleW, 1.15, 60, 140)
        : 0;
      const titleY        = 56;

      if (slide.title) {
        // Accent bar left of title
        elements.push({
          id: uid('el-accent-bar'),
          type: 'shape', shapeType: 'rect',
          x: PAD, y: titleY,
          width: 6, height: titleH,
          zIndex: currentZ++, visible: true,
          shapeStyle: { fill: accent, cornerRadius: 3 },
          animation: { entrance: 'fadeSlideUp', duration: 500, delay: 0 },
        });
        elements.push({
          id: uid('el-title'),
          type: 'text',
          x: PAD + 20, y: titleY,
          width: titleW - 20, height: titleH,
          content: slide.title,
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: headingFont, fontSize: titleFontSize,
            fontWeight: 'bold', color: textPrimary,
            textAlign: 'left', lineHeight: 1.15,
          },
          animation: { entrance: 'fadeSlideLeft', duration: 600, delay: 80 },
        });
      }

      const bulletsStartY = titleY + titleH + GAP + 8;
      const BULLET_H      = 70;
      const maxBullets    = safeMaxBullets(bulletsStartY, BULLET_H, 16, 5);

      mergedB.slice(0, maxBullets).forEach((bullet, i) => {
        const y = bulletsStartY + i * (BULLET_H + 16);
        elements.push({
          id: uid(`el-bullet-bg-${i}`),
          type: 'shape', shapeType: 'rect',
          x: PAD, y,
          width: DECK_CANVAS_W - PAD * 2, height: BULLET_H,
          zIndex: currentZ++, visible: true,
          shapeStyle: { ...bulletPill(light), cornerRadius: 16 },
          animation: { entrance: 'fadeSlideLeft', duration: 480, delay: 200 + i * 75 },
        });
        // Accent tick
        elements.push({
          id: uid(`el-bullet-tick-${i}`),
          type: 'shape', shapeType: 'rect',
          x: PAD + 20, y: y + 18,
          width: 4, height: 34,
          zIndex: currentZ++, visible: true,
          shapeStyle: { fill: accent, cornerRadius: 2 },
          animation: { entrance: 'reveal', duration: 400, delay: 240 + i * 75 },
        });
        elements.push({
          id: uid(`el-bullet-${i}`),
          type: 'text',
          x: PAD + 40, y: y + 16,
          width: DECK_CANVAS_W - PAD * 2 - 60, height: BULLET_H - 24,
          content: bullet.replace(/^•\s*/, ''),
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: bodyFont, fontSize: 29,
            fontWeight: 'normal', color: textMuted,
            textAlign: 'left', lineHeight: 1.6,
          },
          animation: { entrance: 'fadeSlideLeft', duration: 480, delay: 280 + i * 75 },
        });
      });

    // ── Variant 1: Bento Grid — 2×2 or 2×3 glass cards ──────────────────────
    } else if (contentVariant === 1) {
      addSolidBackground();

      const titleFontSize = 44;
      const titleH        = slide.title
        ? estimateTextBlockHeight(slide.title, titleFontSize, DECK_CANVAS_W - PAD * 2, 1.15, 56, 100)
        : 0;

      if (slide.title) {
        elements.push({
          id: uid('el-title'),
          type: 'text',
          x: PAD, y: 40,
          width: DECK_CANVAS_W - PAD * 2, height: titleH,
          content: slide.title,
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: headingFont, fontSize: titleFontSize,
            fontWeight: 'bold', color: textPrimary,
            textAlign: 'left', lineHeight: 1.15,
          },
          animation: { entrance: 'fadeSlideUp', duration: 550, delay: 0 },
        });
      }

      const gridTop   = 40 + titleH + GAP;
      const numItems  = Math.min(mergedB.length, 4);
      const cols      = numItems <= 2 ? numItems : 2;
      const rows      = Math.ceil(numItems / cols);
      const cardW     = (DECK_CANVAS_W - PAD * 2 - GAP * (cols - 1)) / cols;
      const cardH     = (SAFE_BOTTOM - gridTop - GAP * (rows - 1)) / rows;

      mergedB.slice(0, numItems).forEach((bullet, i) => {
        const col   = i % cols;
        const row   = Math.floor(i / cols);
        const x     = PAD + col * (cardW + GAP);
        const y     = gridTop + row * (cardH + GAP);

        elements.push({
          id: uid(`el-bento-card-${i}`),
          type: 'shape', shapeType: 'rect',
          x, y, width: cardW, height: cardH,
          zIndex: currentZ++, visible: true,
          shapeStyle: glassCard(light),
          animation: { entrance: 'zoomIn', duration: 520, delay: 200 + i * 90 },
        });
        // Card number badge
        elements.push({
          id: uid(`el-bento-num-${i}`),
          type: 'text',
          x: x + INNER_PAD, y: y + 20,
          width: 40, height: 32,
          content: String(i + 1).padStart(2, '0'),
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: headingFont, fontSize: 20,
            fontWeight: 'bold', color: accent,
            textAlign: 'left',
          },
          animation: { entrance: 'fadeIn', duration: 350, delay: 280 + i * 90 },
        });
        elements.push({
          id: uid(`el-bento-text-${i}`),
          type: 'text',
          x: x + INNER_PAD, y: y + 60,
          width: cardW - INNER_PAD * 2, height: cardH - 80,
          content: bullet.replace(/^•\s*/, ''),
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: bodyFont,
            fontSize: cardH > 200 ? 26 : 22,
            color: textMuted,
            textAlign: 'left', lineHeight: 1.6,
          },
          animation: { entrance: 'fadeIn', duration: 450, delay: 320 + i * 90 },
        });
      });

    // ── Variant 2: Cinematic Overlay — full-bleed image with centred glass content block ──
    } else {
      addFullBleedBackground(0.22, 'cinematic');

      const blockW    = DECK_CANVAS_W - 200;
      const titleFontSize = 42;
      const titleW    = blockW - INNER_PAD * 2;
      const titleH    = slide.title
        ? estimateTextBlockHeight(slide.title, titleFontSize, titleW, 1.2, 60, 130)
        : 0;
      const BULLET_H  = 56;
      const numBullets = Math.min(mergedB.length, 4);
      const bulletsH  = numBullets > 0 ? numBullets * (BULLET_H + 12) - 12 : 0;
      const blockH    = INNER_PAD * 2 + titleH + (titleH && bulletsH ? GAP : 0) + bulletsH;
      const blockY    = Math.max(80, (DECK_CANVAS_H - blockH) / 2);
      const blockX    = (DECK_CANVAS_W - blockW) / 2;

      elements.push({
        id: uid('el-content-glass'),
        type: 'shape', shapeType: 'rect',
        x: blockX, y: blockY,
        width: blockW, height: Math.min(blockH, SAFE_BOTTOM - blockY),
        zIndex: currentZ++, visible: true,
        shapeStyle: glassCard(light),
        animation: { entrance: 'zoomIn', duration: 700, delay: 0 },
      });

      const contentTitleY = blockY + INNER_PAD;
      if (slide.title) {
        elements.push({
          id: uid('el-title'),
          type: 'text',
          x: blockX + INNER_PAD, y: contentTitleY,
          width: titleW, height: titleH,
          content: slide.title,
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: headingFont, fontSize: titleFontSize,
            fontWeight: 'bold', color: textPrimary,
            textAlign: 'center', lineHeight: 1.2,
          },
          animation: { entrance: 'fadeSlideUp', duration: 650, delay: 120 },
        });
      }

      const bulletStartY = contentTitleY + titleH + (titleH ? GAP : 0);
      mergedB.slice(0, numBullets).forEach((bullet, i) => {
        const y = bulletStartY + i * (BULLET_H + 12);
        if (y + BULLET_H > SAFE_BOTTOM) return;
        elements.push({
          id: uid(`el-bullet-${i}`),
          type: 'text',
          x: blockX + INNER_PAD, y,
          width: titleW, height: BULLET_H,
          content: `• ${bullet.replace(/^•\s*/, '')}`,
          zIndex: currentZ++, visible: true,
          textStyle: {
            fontFamily: bodyFont, fontSize: 26,
            color: textMuted,
            textAlign: 'center', lineHeight: 1.55,
          },
          animation: { entrance: 'fadeIn', duration: 500, delay: 260 + i * 80 },
        });
      });
    }
  }

  return { elements, imageTasks };
}
