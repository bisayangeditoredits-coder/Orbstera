import { PresentationData, Slide, SlideElement } from '@/types';
import { finalizeSlideMotion } from '@/lib/presentationMotion';
import { runDeckImageTasks, type DeckImageTask } from '@/lib/deck-image-generation';
import { buildDeckSlideElements, resolveDeckImagePrompt } from '@/lib/deck-slide-layout';
import { buildSlideFromReferenceTemplate } from '@/lib/reference-templates/build-slide';
import { useReferenceTemplatePackForDeck } from '@/lib/reference-templates/use-during-generation';
import { resolveVisualTheme } from '@/lib/visual-themes';

export const setPresentationAction = (set: any, get: any, data: any) => {
    const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    const safeNumber = (v: unknown, fallback: number) => {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };

    const safeString = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

    const isFullCanvasWashLayer = (el: SlideElement) => {
      if (el.type !== 'shape' || el.shapeType !== 'rect') return false;
      const fullCanvas =
        Math.abs((el.x ?? 0)) <= 2 &&
        Math.abs((el.y ?? 0)) <= 2 &&
        (el.width ?? 0) >= 1270 &&
        (el.height ?? 0) >= 710;
      if (!fullCanvas) return false;
      const fill = String(el.shapeStyle?.fill || '').trim().toLowerCase();
      const z = typeof el.zIndex === 'number' ? el.zIndex : Number(el.zIndex || 0);
      const explicitOverlay = /(^|-)overlay($|-)|bg-overlay|wash|scrim/.test(el.id.toLowerCase());
      const paleFill =
        fill.includes('rgba(255, 255, 255') ||
        fill.includes('rgba(255,255,255') ||
        /^#(f[0-9a-f]{5}|e[0-9a-f]{5}|d[0-9a-f]{5})$/i.test(fill);
      return explicitOverlay || (z > 0 && paleFill);
    };

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
          }))
          .filter((el: SlideElement) => !isFullCanvasWashLayer(el));

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
        layoutCategory: safeString(raw?.layoutCategory, safeString(raw?.styleMode, 'editorial')),
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
        console.warn('Ignored presentation data with no slides:', data);
        set({ presentation: null, currentSlideIndex: 0, history: [], historyIndex: -1 });
        return;
      }
    }

    const palette     = normalized.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const headingFont = normalized.fontPairing?.heading || 'Space Grotesk';
    const bodyFont    = normalized.fontPairing?.body    || 'Inter';
    const themePreset = resolveVisualTheme(normalized.theme);
    const backgroundMode = themePreset.backgroundMode;

    const imageTasks: DeckImageTask[] = [];
    const prevSlidesForImages: Slide[] = get().presentation?.slides ?? [];

    const carryOverRenderedImages = (slide: Slide, tasks: DeckImageTask[], sIdx: number) => {
      const prevSlide = prevSlidesForImages[sIdx];
      if (!prevSlide?.elements?.length || !get().editor.isGenerating) {
        return { slide, tasks };
      }
      const elements = (slide.elements || []).map((el) => ({ ...el }));
      const remaining: DeckImageTask[] = [];
      const prevWithSrc = prevSlide.elements.filter(
        (e) => e.type === 'image' && typeof e.src === 'string' && e.src.trim().length > 0,
      );

      for (const task of tasks) {
        const elIdx = elements.findIndex((e) => e.id === task.elementId);
        if (elIdx < 0) {
          remaining.push(task);
          continue;
        }
        const el = elements[elIdx]!;
        const prev =
          prevWithSrc.find((p) => p.zIndex === el.zIndex) ??
          prevWithSrc.find(
            (p) =>
              Math.abs((p.width ?? 0) - (el.width ?? 0)) < 80 &&
              Math.abs((p.height ?? 0) - (el.height ?? 0)) < 80,
          );
        if (prev?.src) {
          elements[elIdx] = { ...el, src: prev.src, aiImagePending: false };
        } else {
          remaining.push(task);
        }
      }
      return { slide: { ...slide, elements }, tasks: remaining };
    };

    const motionCtx = {
      animationStyle: normalized.animationStyle,
      presentationType: normalized.presentationType,
      styleMode: normalized.styleMode,
      defaultSlideTransition: normalized.defaultSlideTransition,
    };

    const collectPendingImageTasks = (
      motionSlide: Slide,
      sourceSlide: Slide,
      slideIndex: number,
      slideCount: number,
    ): DeckImageTask[] => {
      const prompt = resolveDeckImagePrompt({
        id: sourceSlide.id,
        type: sourceSlide.type,
        title: sourceSlide.title,
        imagePrompt: (sourceSlide as { imagePrompt?: string }).imagePrompt,
      }, {
        slideIndex,
        slideCount,
        layoutHint: sourceSlide.type,
        layoutCategory: normalized.layoutCategory,
      });
      const tasks: DeckImageTask[] = [];
      for (const el of motionSlide.elements || []) {
        if (el.type !== 'image') continue;
        if (el.src?.trim() && !el.aiImagePending) continue;
        const ew = Math.round(el.width) || 1024;
        const eh = Math.round(el.height) || 720;
        tasks.push({
          slideId: motionSlide.id,
          elementId: el.id,
          prompt,
          w: Math.min(1536, Math.max(512, ew)),
          h: Math.min(1536, Math.max(512, eh)),
          visualProfile: ew >= 1100 ? 'typography' : 'cinematic',
        });
      }
      return tasks;
    };

    // ── Convert static AI slide content into canvas-accurate elements ──────
    const slides = normalized.slides.map((slide: Slide, sIdx: number) => {
      if ((normalized.source === 'import' || normalized.source === 'manual') && (slide.elements?.length || 0) > 0) {
        return finalizeSlideMotion(
          { ...slide, title: '', subtitle: '', bullets: [] },
          motionCtx,
        );
      }

      // Keep live-streamed canvas elements — rebuilding breaks in-flight image jobs.
      if ((slide.elements?.length || 0) > 0 && get().editor.isGenerating) {
        const motionSlide = finalizeSlideMotion(
          { ...slide, title: '', subtitle: '', bullets: [] },
          motionCtx,
        );
        const pendingTasks = collectPendingImageTasks(motionSlide, slide, sIdx, normalized.slides.length);
        const carried = carryOverRenderedImages(motionSlide, pendingTasks, sIdx);
        imageTasks.push(...carried.tasks);
        return carried.slide;
      }

      const uid = (prefix: string) =>
        `${prefix}-${sIdx}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

      const refPack = get().editor.referenceTemplatePack;
      const { elements, imageTasks: slideImageTasks } = useReferenceTemplatePackForDeck(
        refPack,
        get().editor.isGenerating,
      )
        ? buildSlideFromReferenceTemplate({
            pack: refPack,
            slideIndex: sIdx,
            ai: {
              id: slide.id,
              type: slide.type,
              title: slide.title,
              subtitle: slide.subtitle,
              bullets: slide.bullets,
              content: slide.content,
            },
            uid,
          })
        : buildDeckSlideElements({
            slide: {
              id: slide.id,
              type: slide.type,
              title: slide.title,
              subtitle: slide.subtitle,
              bullets: slide.bullets,
              content: slide.content,
              imagePrompt: (slide as { imagePrompt?: string }).imagePrompt,
            },
            sIdx,
            palette,
            headingFont,
            bodyFont,
            uid,
            existingElements: slide.elements,
            backgroundMode,
            slideCount: normalized.slides.length,
            layoutCategory: normalized.layoutCategory,
          });
      const motionSlide = finalizeSlideMotion(
        { ...slide, elements, title: '', subtitle: '', bullets: [] },
        motionCtx,
      );
      const carried = carryOverRenderedImages(motionSlide, slideImageTasks, sIdx);
      imageTasks.push(...carried.tasks);
      return carried.slide;
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

    if (imageTasks.length > 0) {
      const deckIdForImages = deckId;
      const generating = get().editor.isGenerating;
      if (generating) {
        set((state: any) => ({
          editor: {
            ...state.editor,
            deckGenerationLifecycle: 'images',
            generationBlockingOverlay: false,
          },
        }));
      }
      runDeckImageTasks(get, imageTasks, deckIdForImages);
    }
  }
