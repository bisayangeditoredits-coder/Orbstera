import { PresentationData, Slide, SlideElement } from '@/types';
import { finalizeSlideMotion } from '@/lib/presentationMotion';
import { persistGeneratedImage } from '@/lib/client/persist-generated-image';

const CANVAS_W = 1280;
const CANVAS_H = 720;

export const setPresentationAction = (set: any, get: any, data: any) => {
    const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    const safeNumber = (v: unknown, fallback: number) => {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };

    const safeString = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

    const normalize = (raw: any) => {
      const slidesRaw = Array.isArray(raw?.slides) ? raw.slides : [];
      const paletteRaw = Array.isArray(raw?.colorPalette) ? raw.colorPalette.filter((c: any) => typeof c === 'string' && c.trim()) : [];
      const colorPalette =
        paletteRaw.length >= 2 ? paletteRaw : ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];

      const fontPairingRaw = raw?.fontPairing && typeof raw.fontPairing === 'object' ? raw.fontPairing : {};
      const fontPairing = {
        heading: safeString(fontPairingRaw.heading, 'Space Grotesk'),
        body: safeString(fontPairingRaw.body, 'Inter'),
      };

      const id = safeString(raw?.id, '').trim() || makeId('deck');

      const slides = slidesRaw.map((s: any, idx: number) => {
        const sid = safeString(s?.id, '').trim() || makeId(`slide-${idx}`);
        const elementsRaw = Array.isArray(s?.elements) ? s.elements : [];
        const elements: SlideElement[] = elementsRaw
          .filter((el: any) => el && typeof el === 'object' && typeof el.id === 'string' && typeof el.type === 'string')
          .map((el: any) => ({
            ...el,
            id: safeString(el.id, makeId(`el-${idx}`)),
            x: safeNumber(el.x, 0),
            y: safeNumber(el.y, 0),
            width: Math.max(1, safeNumber(el.width, 100)),
            height: Math.max(1, safeNumber(el.height, 60)),
            rotation: safeNumber(el.rotation, 0),
            opacity: Math.min(1, Math.max(0, safeNumber(el.opacity, 1))),
            visible: typeof el.visible === 'boolean' ? el.visible : true,
            locked: typeof el.locked === 'boolean' ? el.locked : false,
            zIndex: safeNumber(el.zIndex, undefined as any),
            src: typeof el.src === 'string' ? el.src : '',
            content: typeof el.content === 'string' ? el.content : el.content == null ? '' : String(el.content),
          }));

        return {
          ...s,
          id: sid,
          type: safeString(s?.type, 'content'),
          title: safeString(s?.title, ''),
          subtitle: typeof s?.subtitle === 'string' ? s.subtitle : undefined,
          bullets: Array.isArray(s?.bullets) ? s.bullets.filter((b: any) => typeof b === 'string') : undefined,
          elements,
        };
      });

      return {
        ...raw,
        id,
        title: safeString(raw?.title, 'Untitled Presentation'),
        theme: safeString(raw?.theme, 'dark'),
        colorPalette,
        fontPairing,
        animationStyle: safeString(raw?.animationStyle, 'cinematic-reveal'),
        slides,
      };
    };

    const normalized = normalize(data);
    const isGenerationReset =
      normalized.title === 'Generating...' &&
      Array.isArray(normalized.slides) &&
      normalized.slides.length === 0;
    if (!Array.isArray(normalized.slides) || normalized.slides.length === 0) {
      if (!isGenerationReset) {
        console.error('Invalid presentation data received (no slides):', data);
        set({ presentation: null, currentSlideIndex: 0, history: [], historyIndex: -1 });
        return;
      }
    }

    const palette     = normalized.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const headingFont = normalized.fontPairing?.heading || 'Space Grotesk';
    const bodyFont    = normalized.fontPairing?.body    || 'Inter';

    const imageTasks: {
      slideId: string;
      elementId: string;
      prompt: string;
      w: number;
      h: number;
      visualProfile: 'cinematic' | 'typography';
    }[] = [];

    const motionCtx = {
      animationStyle: normalized.animationStyle,
      presentationType: normalized.presentationType,
      styleMode: normalized.styleMode,
      defaultSlideTransition: normalized.defaultSlideTransition,
    };

    // ── Convert static AI slide content into canvas-accurate elements ──────
    const slides = normalized.slides.map((slide: Slide, sIdx: number) => {
      if ((normalized.source === 'import' || normalized.source === 'manual') && (slide.elements?.length || 0) > 0) {
        return finalizeSlideMotion(
          { ...slide, title: '', subtitle: '', bullets: [] },
          motionCtx,
        );
      }

      const nestedB = slide.content?.bullets;
      const rawMerge = [...(slide.bullets || []), ...(nestedB || [])];
      const mergedB = rawMerge.filter((b, i, a) => b && a.indexOf(b) === i);
      const isHero  = slide.type === 'hero';
      const isSplit = slide.type === 'split' || slide.type === 'media';
      const isQuote = slide.type === 'quote';
      const flipSplit = sIdx % 2 === 1;
      const elements: SlideElement[] = [...(slide.elements || [])];
      let currentZ = elements.length + 1;

      const uid = (prefix: string) =>
        `${prefix}-${sIdx}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

      // ── HERO SLIDE ────────────────────────────────────────────────────────
      if (isHero) {
        if (slide.imagePrompt) {
          const bgId = uid('el-bg-image');
          elements.unshift({
            id: bgId, type: 'image', src: '', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: 0, visible: true, opacity: 0.35,
            aiImagePending: true,
            animation: { entrance: 'fadeIn', duration: 1500, delay: 0 },
          });
          imageTasks.push({
            slideId: slide.id,
            elementId: bgId,
            prompt: slide.imagePrompt,
            w: 1280,
            h: 720,
            visualProfile: 'typography',
          });
        }
        
        // Add a sleek dark gradient overlay for text readability
        elements.push({
          id: uid('el-hero-overlay'), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: currentZ++, visible: true,
          shapeStyle: { fill: 'rgba(5, 5, 10, 0.65)', stroke: 'transparent', strokeWidth: 0 },
          animation: { entrance: 'fadeIn', duration: 1000, delay: 0 }
        });

        if (slide.title) {
          elements.push({
            id: uid('el-title'), type: 'text', x: 80, y: CANVAS_H / 2 - 80, width: CANVAS_W - 160, height: 160, content: slide.title, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: 84, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.1 },
            animation: { entrance: 'fadeSlideUp', duration: 800, delay: 100 },
          });
        }
        if (slide.subtitle) {
          elements.push({
            id: uid('el-sub'), type: 'text', x: 200, y: CANVAS_H / 2 + 80, width: CANVAS_W - 400, height: 80, content: slide.subtitle, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: bodyFont, fontSize: 28, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'center', lineHeight: 1.5, letterSpacing: 1.5 },
            animation: { entrance: 'fadeSlideUp', duration: 800, delay: 300 },
          });
        }
      } else if (isSplit) {
        // High-Fidelity Split Layout (Bento Style)
        elements.push({
          id: uid('el-split-bg-text'), type: 'shape', shapeType: 'rect', x: flipSplit ? 620 : 40, y: 40, width: 620, height: CANVAS_H - 80, zIndex: currentZ++, visible: true,
          shapeStyle: { fill: 'rgba(255, 255, 255, 0.02)', stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, cornerRadius: 24, shadowColor: 'rgba(0,0,0,0.3)', shadowBlur: 30 },
          animation: { entrance: 'fadeSlideLeft', duration: 600, delay: 0 }
        });

        if (slide.title) {
          elements.push({
            id: uid('el-title'), type: 'text', x: flipSplit ? 660 : 80, y: 80, width: 540, height: 120, content: slide.title, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: 46, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
            animation: { entrance: 'fadeSlideLeft', duration: 600, delay: 100 },
          });
          // Subtle accent line under title
          elements.push({
            id: uid('el-accent'), type: 'shape', shapeType: 'rect', x: flipSplit ? 660 : 80, y: 190, width: 60, height: 4, zIndex: currentZ++, visible: true,
            shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 2 },
            animation: { entrance: 'reveal', duration: 500, delay: 200 }
          });
        }
        if (mergedB.length > 0) {
          mergedB.slice(0, 5).forEach((bullet, i) => {
            // Bento style bullet points
            elements.push({
              id: uid(`el-bullet-bg-${i}`), type: 'shape', shapeType: 'rect', x: flipSplit ? 660 : 80, y: 240 + (i * 80), width: 540, height: 64, zIndex: currentZ++, visible: true,
              shapeStyle: { fill: 'rgba(255, 255, 255, 0.03)', cornerRadius: 12 },
              animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 300 + (i * 80) }
            });
            elements.push({
              id: uid(`el-bullet-${i}`), type: 'text', x: flipSplit ? 680 : 100, y: 258 + (i * 80), width: 500, height: 64, content: bullet.replace(/^•\s*/, ''), zIndex: currentZ++, visible: true,
              textStyle: { fontFamily: bodyFont, fontSize: 20, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4 },
              animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 350 + (i * 80) },
            });
          });
        }
        const imgId = uid('el-image');
        // Image on right with sleek border radius
        elements.push({
          id: uid('el-split-bg-image'), type: 'shape', shapeType: 'rect', x: flipSplit ? 40 : 680, y: 40, width: 560, height: CANVAS_H - 80, zIndex: currentZ++, visible: true,
          shapeStyle: { fill: 'rgba(255, 255, 255, 0.02)', stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, cornerRadius: 24 },
          animation: { entrance: 'slideRight', duration: 600, delay: 0 }
        });
        elements.push({
          id: imgId,
          type: 'image',
          src: '',
          aiImagePending: true,
          x: flipSplit ? 60 : 700,
          y: 60,
          width: 520,
          height: CANVAS_H - 120,
          zIndex: currentZ++,
          visible: true,
          animation: { entrance: 'zoomIn', duration: 800, delay: 400 },
        });
        if (slide.imagePrompt) {
          imageTasks.push({
            slideId: slide.id,
            elementId: imgId,
            prompt: slide.imagePrompt,
            w: 800,
            h: 900,
            visualProfile: 'cinematic',
          });
        }
      } else if (isQuote) {
        // High-end editorial quote layout
        elements.push({
          id: uid('el-quote-bg'), type: 'shape', shapeType: 'rect', x: 80, y: 100, width: CANVAS_W - 160, height: CANVAS_H - 200, zIndex: currentZ++, visible: true,
          shapeStyle: { fill: 'rgba(255, 255, 255, 0.03)', stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1, cornerRadius: 32 },
          animation: { entrance: 'zoomIn', duration: 800, delay: 0 }
        });
        elements.push({
          id: uid('el-quote-mark'), type: 'text', x: 120, y: 80, width: CANVAS_W - 240, height: 100, content: '"', zIndex: currentZ++, visible: true,
          opacity: 0.3,
          textStyle: { fontFamily: headingFont, fontSize: 160, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'center' },
          animation: { entrance: 'fadeIn', duration: 1000, delay: 200 }
        });
        if (slide.title) {
          elements.push({ id: uid('el-quote'), type: 'text', x: 140, y: 220, width: CANVAS_W - 280, height: 240, content: slide.title, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'normal', fontStyle: 'italic', color: palette[1], textAlign: 'center', lineHeight: 1.35 },
            animation: { entrance: 'fadeIn', duration: 1000, delay: 300 },
          });
        }
        if (slide.subtitle) {
          elements.push({ id: uid('el-author'), type: 'text', x: 140, y: 480, width: CANVAS_W - 280, height: 60, content: `— ${slide.subtitle}`, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'bold', color: palette[2], textAlign: 'center', lineHeight: 1.2, letterSpacing: 2 },
            animation: { entrance: 'fadeIn', duration: 1000, delay: 500 },
          });
        }
      } else {
        // CONTENT variants to avoid repetitive "same template" look
        const contentVariant = sIdx % 3;
        if (slide.title) {
          const titleX = contentVariant === 2 ? 120 : 80;
          const titleW = contentVariant === 2 ? CANVAS_W - 240 : CANVAS_W - 160;
          elements.push({
            id: uid('el-title-bg'), type: 'shape', shapeType: 'rect', x: 40, y: 40, width: CANVAS_W - 80, height: 100, zIndex: currentZ++, visible: true,
            shapeStyle: { fill: contentVariant === 1 ? 'rgba(255,255,255,0.01)' : 'rgba(255, 255, 255, 0.02)', stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, cornerRadius: 20 },
            animation: { entrance: 'fadeSlideUp', duration: 500, delay: 0 }
          });
          elements.push({ id: uid('el-title'), type: 'text', x: titleX, y: 65, width: titleW, height: 80, content: slide.title, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: contentVariant === 2 ? 38 : 42, fontWeight: 'bold', color: palette[1], textAlign: contentVariant === 2 ? 'center' : 'left', lineHeight: 1.2 },
            animation: { entrance: 'fadeSlideUp', duration: 600, delay: 100 },
          });
        }

        if (mergedB.length > 0) {
          if (contentVariant === 1) {
            // Editorial list variant
            mergedB.slice(0, 5).forEach((bullet, i) => {
              const y = 188 + i * 92;
              elements.push({
                id: uid(`el-bullet-line-${i}`), type: 'shape', shapeType: 'rect', x: 80, y: y + 8, width: 4, height: 52, zIndex: currentZ++, visible: true,
                shapeStyle: { fill: palette[2] || '#38BDF8', cornerRadius: 2 },
                animation: { entrance: 'reveal', duration: 380, delay: 180 + i * 80 }
              });
              elements.push({
                id: uid(`el-bullet-${i}`), type: 'text', x: 100, y, width: CANVAS_W - 180, height: 70, content: bullet.replace(/^•\s*/, ''), zIndex: currentZ++, visible: true,
                textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.45 },
                animation: { entrance: 'fadeSlideLeft', duration: 480, delay: 240 + (i * 90) },
              });
            });
          } else if (contentVariant === 2) {
            // Center timeline-card variant
            const cardW = CANVAS_W - 260;
            mergedB.slice(0, 4).forEach((bullet, i) => {
              const y = 190 + i * 112;
              const x = 130 + (i % 2 === 0 ? -18 : 18);
              elements.push({
                id: uid(`el-bullet-bg-${i}`), type: 'shape', shapeType: 'rect', x, y, width: cardW, height: 86, zIndex: currentZ++, visible: true,
                shapeStyle: { fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(255,255,255,0.09)', strokeWidth: 1, cornerRadius: 18 },
                animation: { entrance: 'zoomIn', duration: 500, delay: 220 + (i * 100) }
              });
              elements.push({
                id: uid(`el-bullet-${i}`), type: 'text', x: x + 28, y: y + 22, width: cardW - 56, height: 52, content: bullet.replace(/^•\s*/, ''), zIndex: currentZ++, visible: true,
                textStyle: { fontFamily: bodyFont, fontSize: 21, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4 },
                animation: { entrance: 'fadeIn', duration: 420, delay: 300 + (i * 100) },
              });
            });
          } else {
            // Original bento grid variant
            const numBullets = Math.min(mergedB.length, 6);
            const isGrid = numBullets > 3;
            const boxWidth = isGrid ? (CANVAS_W - 120) / 2 : CANVAS_W - 80;
            const boxHeight = isGrid ? (CANVAS_H - 220) / Math.ceil(numBullets / 2) : 90;
            const startY = 160;

            mergedB.slice(0, 6).forEach((bullet, i) => {
              const col = isGrid ? i % 2 : 0;
              const row = isGrid ? Math.floor(i / 2) : i;
              const x = 40 + (col * (boxWidth + 40));
              const y = startY + (row * (boxHeight + 20));

              elements.push({
                id: uid(`el-bullet-bg-${i}`), type: 'shape', shapeType: 'rect', x, y, width: boxWidth, height: boxHeight, zIndex: currentZ++, visible: true,
                shapeStyle: { fill: 'rgba(255, 255, 255, 0.03)', stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1, cornerRadius: 16 },
                animation: { entrance: 'zoomIn', duration: 500, delay: 200 + (i * 100) }
              });

              elements.push({
                id: uid(`el-bullet-dot-${i}`), type: 'shape', shapeType: 'circle', x: x + 24, y: y + 24, width: 8, height: 8, zIndex: currentZ++, visible: true,
                shapeStyle: { fill: palette[2] || '#38BDF8' },
                animation: { entrance: 'fadeIn', duration: 400, delay: 300 + (i * 100) }
              });

              elements.push({ id: uid(`el-bullet-${i}`), type: 'text', x: x + 48, y: y + 18, width: boxWidth - 64, height: boxHeight - 36, content: bullet.replace(/^•\s*/, ''), zIndex: currentZ++, visible: true,
                textStyle: { fontFamily: bodyFont, fontSize: isGrid ? 18 : 22, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.5 },
                animation: { entrance: 'fadeIn', duration: 500, delay: 350 + (i * 100) },
              });
            });
          }
        }
      }
      return finalizeSlideMotion(
        { ...slide, elements, title: '', subtitle: '', bullets: [] },
        motionCtx,
      );
    });

    const existingId = typeof data.id === 'string' ? data.id.trim() : '';
    const prevIdRaw = get().presentation?.id;
    const prevId = typeof prevIdRaw === 'string' ? prevIdRaw.trim() : '';
    const fallbackRandom =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `deck-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const deckId =
      existingId || (isGenerationReset ? fallbackRandom : prevId || fallbackRandom);

    const newPresentation = { ...normalized, id: deckId, slides };
    set({ presentation: newPresentation, currentSlideIndex: 0, history: [], historyIndex: -1 });
    get().pushHistory();

    // Persistence: usePresentationCloudSync debounces POST and applies saveVersion from the response.
    // Do not POST here — a previous fire-and-forget save advanced the server version without
    // updating the client, which produced constant 409 conflicts on the next sync.

    // Progressive images: deck renders first; OpenRouter Flux fills in without blocking the UI thread.
    // Limited concurrency avoids rate spikes while still feeling fast.
    if (imageTasks.length > 0) {
      const deckIdForImages = deckId;
      const queue = [...imageTasks];
      const concurrency = 2;
      const worker = async () => {
        while (queue.length) {
          const task = queue.shift();
          if (!task) break;
          if (get().presentation?.id !== deckIdForImages) break;
          try {
            const res = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: task.prompt,
                width: task.w,
                height: task.h,
                visualProfile: task.visualProfile,
              }),
            });
            const json = await res.json().catch(() => ({}));
            if (json.url) {
              const persistedUrl = await persistGeneratedImage(json.url, deckIdForImages);
              get().updateElement(task.slideId, task.elementId, { src: persistedUrl });
            }
          } catch (e) {
            console.error(`[Store] Image failed for ${task.elementId}`, e);
          }
        }
      };
      void Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
    }
  }