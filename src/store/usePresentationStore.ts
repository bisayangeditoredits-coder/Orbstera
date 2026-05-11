import { create } from 'zustand';
import { PresentationData, Slide, SlideElement, HistoryEntry } from '@/types';
import { finalizeSlideMotion } from '@/lib/presentationMotion';

const MAX_HISTORY = 50;

// ── Canvas dimensions (must match KonvaCanvas.tsx) ──────────────────────────
const CANVAS_W = 1280;
const CANVAS_H = 720;

interface PresentationStore {
  // ─── Presentation Data ─────────────────────────────────────────────────────
  presentation: PresentationData | null;
  setPresentation: (data: PresentationData) => void;
  updatePresentation: (updates: Partial<PresentationData>) => void;

  // ─── Slide Management ─────────────────────────────────────────────────────
  currentSlideIndex: number;
  setCurrentSlideIndex: (index: number) => void;
  addSlide: (slide: Slide) => void;
  removeSlide: (slideId: string) => void;
  updateSlide: (slideId: string, updates: Partial<Slide>) => void;
  duplicateSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;

  // ─── Element Management ───────────────────────────────────────────────────
  addElement: (slideId: string, element: SlideElement) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>) => void;
  removeElement: (slideId: string, elementId: string) => void;
  reorderElements: (slideId: string, elementId: string, direction: 'up' | 'down') => void;

  // ─── Editor State ─────────────────────────────────────────────────────────
  editor: EditorState;
  setEditorState: (updates: Partial<EditorState>) => void;
  selectElement: (id: string | null) => void;

  // ─── History (Undo/Redo) ──────────────────────────────────────────────────
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // ─── UI Panels ────────────────────────────────────────────────────────────
  activePanel: 'generate' | 'layers' | 'design' | 'notes';
  setActivePanel: (panel: 'generate' | 'layers' | 'design' | 'notes') => void;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;

  // ─── Streaming & Live Generation ───────────────────────────────────────────
  streamSlide: (slide: Slide) => void;
  /** Bounded / tracked /api/generate-image work for accurate generation progress */
  trackDeckGenerationImage: (work: () => Promise<void>) => void;

  // ─── Onboarding ────────────────────────────────────────────────────────────
  onboarding: {
    isActive: boolean;
    step: number;
    hasSeenTour: boolean;
  };
  startOnboarding: () => void;
  nextOnboardingStep: () => void;
  skipOnboarding: () => void;
}

export const usePresentationStore = create<PresentationStore>((set, get) => ({
  // ─── Presentation ──────────────────────────────────────────────────────────
  presentation: null,

  setPresentation: (data) => {
    if (!data || !data.slides || !Array.isArray(data.slides)) {
      console.error('Invalid presentation data received:', data);
      return;
    }

    const palette     = data.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const headingFont = data.fontPairing?.heading || 'Space Grotesk';
    const bodyFont    = data.fontPairing?.body    || 'Inter';

    const imageTasks: { slideId: string; elementId: string; prompt: string; w: number; h: number }[] = [];

    const motionCtx = {
      animationStyle: data.animationStyle,
      presentationType: data.presentationType,
      styleMode: data.styleMode,
      defaultSlideTransition: data.defaultSlideTransition,
    };

    // ── Convert static AI slide content into canvas-accurate elements ──────
    const slides = data.slides.map((slide, sIdx) => {
      if (data.source === 'import' && (slide.elements?.length || 0) > 0) {
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
          imageTasks.push({ slideId: slide.id, elementId: bgId, prompt: slide.imagePrompt, w: 1280, h: 720 });
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
          animation: { entrance: 'fadeSlideRight', duration: 600, delay: 0 }
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
          imageTasks.push({ slideId: slide.id, elementId: imgId, prompt: slide.imagePrompt, w: 800, h: 900 });
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
          textStyle: { fontFamily: headingFont, fontSize: 160, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'center', opacity: 0.3 },
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
    const isGenerationReset =
      data.title === 'Generating...' && Array.isArray(data.slides) && data.slides.length === 0;
    const fallbackRandom =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `deck-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const deckId =
      existingId || (isGenerationReset ? fallbackRandom : prevId || fallbackRandom);

    const newPresentation = { ...data, id: deckId, slides };
    set({ presentation: newPresentation, currentSlideIndex: 0, history: [], historyIndex: -1 });
    get().pushHistory();

    // Persistence: usePresentationCloudSync debounces POST and applies saveVersion from the response.
    // Do not POST here — a previous fire-and-forget save advanced the server version without
    // updating the client, which produced constant 409 conflicts on the next sync.

    const runImageTasks = () => {
      const job = (task: (typeof imageTasks)[0]) =>
        fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: task.prompt, width: task.w, height: task.h }),
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.url) {
              get().updateElement(task.slideId, task.elementId, { src: json.url });
            }
          })
          .catch((e) => console.error(`[Store] Image failed for ${task.elementId}`, e));

      if (imageTasks.length === 0) return;
      if (get().editor.isGenerating) {
        const track = get().trackDeckGenerationImage;
        imageTasks.forEach((task) =>
          track(async () => {
            await job(task);
          }),
        );
      } else {
        void Promise.allSettled(imageTasks.map((task) => job(task)));
      }
    };
    runImageTasks();
  },

  updatePresentation: (updates) =>
    set((state) => ({
      presentation: state.presentation ? { ...state.presentation, ...updates } : null,
    })),

  currentSlideIndex: 0,
  setCurrentSlideIndex: (index) => set({ currentSlideIndex: index }),

  addSlide: (slide) => {
    get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: { ...state.presentation, slides: [...state.presentation.slides, slide] },
        currentSlideIndex: state.presentation.slides.length,
      };
    });
  },

  removeSlide: (slideId) => {
    get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      const slides = state.presentation.slides.filter((s) => s.id !== slideId);
      return {
        presentation: { ...state.presentation, slides },
        currentSlideIndex: Math.max(0, state.currentSlideIndex - 1),
      };
    });
  },

  updateSlide: (slideId, updates) => {
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) => s.id === slideId ? { ...s, ...updates } : s),
        },
      };
    });
  },

  duplicateSlide: (slideId) => {
    get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      const idx = state.presentation.slides.findIndex((s) => s.id === slideId);
      if (idx === -1) return state;
      const original = state.presentation.slides[idx];
      const copy: Slide = {
        ...original,
        id: `slide-${Date.now()}`,
        elements: original.elements?.map((el) => ({ ...el, id: `el-${Date.now()}-${Math.random()}` })),
      };
      const slides = [...state.presentation.slides];
      slides.splice(idx + 1, 0, copy);
      return { presentation: { ...state.presentation, slides }, currentSlideIndex: idx + 1 };
    });
  },

  reorderSlides: (fromIndex, toIndex) => {
    get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      const slides = [...state.presentation.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return { presentation: { ...state.presentation, slides }, currentSlideIndex: toIndex };
    });
  },

  addElement: (slideId, element) => {
    get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.id === slideId ? { ...s, elements: [...(s.elements || []), element] } : s
          ),
        },
      };
    });
  },

  updateElement: (slideId, elementId, updates) => {
    set((state) => {
      if (!state.presentation) return state;
      const clearPending =
        typeof updates.src === 'string' && updates.src.trim().length > 0
          ? { aiImagePending: false as const }
          : {};
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.id === slideId
              ? {
                  ...s,
                  elements: (s.elements || []).map((el) =>
                    el.id === elementId ? { ...el, ...updates, ...clearPending } : el
                  ),
                }
              : s
          ),
        },
      };
    });
  },

  removeElement: (slideId, elementId) => {
    get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.id === slideId ? { ...s, elements: (s.elements || []).filter((el) => el.id !== elementId) } : s
          ),
        },
      };
    });
  },

  reorderElements: (slideId, elementId, direction) => {
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) => {
            if (s.id !== slideId) return s;
            const elements = [...(s.elements || [])];
            const idx = elements.findIndex((el) => el.id === elementId);
            if (idx === -1) return s;
            if (direction === 'up' && idx > 0) {
              [elements[idx - 1], elements[idx]] = [elements[idx], elements[idx - 1]];
            } else if (direction === 'down' && idx < elements.length - 1) {
              [elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]];
            }
            return { ...s, elements };
          }),
        },
      };
    });
  },

  editor: {
    activeTool: 'select',
    selectedElementId: null,
    generativeFillTarget: null,
    isDragging: false,
    isResizing: false,
    zoom: 0.7,
    showGrid: false,
    snapToGrid: true,
    gridSize: 20,
    isPresenting: false,
    isGenerating: false,
    generationBlockingOverlay: false,
    generationEpoch: 0,
    deckGenerationLifecycle: 'idle',
    generationTargetSlides: 0,
    generationPendingImages: 0,
    generationImageJobsTotal: 0,
    generationImageJobsCompleted: 0,
    previewElementId: null,
    reasoning: '',
    pan: { x: 0, y: 0 },
    orchestrationPhase: '',
    activeModelLabel: '',
    cloudSyncStatus: 'idle',
    cloudSyncMessage: undefined,
  },

  setEditorState: (updates) =>
    set((state) => ({ editor: { ...state.editor, ...updates } })),

  selectElement: (id) =>
    set((state) => ({ editor: { ...state.editor, selectedElementId: id } })),

  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const state = get();
    if (!state.presentation) return;
    const entry: HistoryEntry = {
      slides: JSON.parse(JSON.stringify(state.presentation.slides)),
      timestamp: Date.now(),
    };
    const history = state.history.slice(0, state.historyIndex + 1);
    history.push(entry);
    if (history.length > MAX_HISTORY) history.shift();
    set({ history, historyIndex: history.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0 || !state.presentation) return;
    const newIndex = state.historyIndex - 1;
    const slides = JSON.parse(JSON.stringify(state.history[newIndex].slides));
    set({ presentation: { ...state.presentation, slides }, historyIndex: newIndex });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1 || !state.presentation) return;
    const newIndex = state.historyIndex + 1;
    const slides = JSON.parse(JSON.stringify(state.history[newIndex].slides));
    set({ presentation: { ...state.presentation, slides }, historyIndex: newIndex });
  },

  activePanel: 'generate',
  setActivePanel: (panel) => set({ activePanel: panel }),
  isPanelOpen: true,
  setPanelOpen: (open) => set({ isPanelOpen: open }),

  trackDeckGenerationImage: (work) => {
    const epochSnapshot = get().editor.generationEpoch;
    let scheduled = false;
    set((state) => {
      if (!state.editor.isGenerating || state.editor.generationEpoch !== epochSnapshot) return state;
      scheduled = true;
      return {
        editor: {
          ...state.editor,
          generationImageJobsTotal: state.editor.generationImageJobsTotal + 1,
          generationPendingImages: state.editor.generationPendingImages + 1,
        },
      };
    });
    work()
      .catch(() => {})
      .finally(() => {
        if (!scheduled) return;
        set((state) => {
          if (state.editor.generationEpoch !== epochSnapshot) return state;
          return {
            editor: {
              ...state.editor,
              generationPendingImages: Math.max(0, state.editor.generationPendingImages - 1),
              generationImageJobsCompleted: Math.min(
                state.editor.generationImageJobsTotal,
                state.editor.generationImageJobsCompleted + 1,
              ),
            },
          };
        });
      });
  },

  streamSlide: (slideData) => {
    const state = get();
    if (!state.presentation) {
      set({ presentation: { title: "Generating...", theme: "modern-dark", colorPalette: ["#05050A", "#FFFFFF", "#3B82F6", "#94A3B8"], fontPairing: { heading: "Space Grotesk", body: "Inter" }, animationStyle: "cinematic-reveal", slides: [] } });
    }

    const currentPres = get().presentation!;
    const palette     = currentPres.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const headingFont = currentPres.fontPairing?.heading || 'Space Grotesk';
    const bodyFont    = currentPres.fontPairing?.body    || 'Inter';
    const sIdx        = currentPres.slides.length;

    const uid = (prefix: string) => `${prefix}-${sIdx}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const elements: SlideElement[] = [];
    let currentZ = 1;

    const mergedBullets = [
      ...(slideData.bullets || []),
      ...(slideData.content?.bullets || []),
    ];
    const slideForLayout = mergedBullets.length
      ? { ...slideData, bullets: mergedBullets }
      : slideData;

    const isHero  = slideData.type === 'hero';
    const isSplit = slideData.type === 'split' || slideData.type === 'media';
    const isQuote = slideData.type === 'quote';

    if (isHero) {
        if (slideData.imagePrompt) {
          const bgId = uid('el-bg-image');
          elements.unshift({
            id: bgId,
            type: 'image',
            src: '',
            aiImagePending: true,
            x: 0,
            y: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            zIndex: 0,
            visible: true,
            opacity: 0.35,
            animation: { entrance: 'fadeIn', duration: 1500, delay: 0 },
          });
          get().trackDeckGenerationImage(async () => {
            const res = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: slideData.imagePrompt, width: 1280, height: 720 }),
            });
            const json = await res.json();
            if (json.url) get().updateElement(slideData.id, bgId, { src: json.url });
          });
        }
        elements.push({ id: uid('el-hero-overlay'), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(5, 5, 10, 0.65)', stroke: 'transparent', strokeWidth: 0 }, animation: { entrance: 'fadeIn', duration: 1000 } });
        if (slideData.title) elements.push({ id: uid('el-title'), type: 'text', x: 80, y: CANVAS_H / 2 - 80, width: CANVAS_W-160, height: 160, content: slideData.title, zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 84, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.1 }, animation: { entrance: 'fadeSlideUp', duration: 800 } });
        if (slideData.subtitle) elements.push({ id: uid('el-sub'), type: 'text', x: 200, y: CANVAS_H / 2 + 80, width: CANVAS_W-400, height: 80, content: slideData.subtitle, zIndex: currentZ++, visible: true, textStyle: { fontFamily: bodyFont, fontSize: 28, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'center', lineHeight: 1.5, letterSpacing: 1.5 }, animation: { entrance: 'fadeSlideUp', duration: 800, delay: 200 } });
    } else if (isSplit) {
      elements.push({ id: uid('el-split-bg-left'), type: 'shape', shapeType: 'rect', x: 40, y: 40, width: 620, height: CANVAS_H - 80, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.02)', stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, cornerRadius: 24, shadowColor: 'rgba(0,0,0,0.3)', shadowBlur: 30 }, animation: { entrance: 'fadeSlideLeft', duration: 600 } });
      if (slideData.title) {
        elements.push({ id: uid('el-title'), type: 'text', x: 80, y: 80, width: 540, height: 120, content: slideData.title, zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 46, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 }, animation: { entrance: 'fadeSlideLeft', duration: 600 } });
        elements.push({ id: uid('el-accent'), type: 'shape', shapeType: 'rect', x: 80, y: 190, width: 60, height: 4, zIndex: currentZ++, visible: true, shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 2 }, animation: { entrance: 'reveal', duration: 500, delay: 200 } });
      }
      if (slideForLayout.bullets) slideForLayout.bullets!.slice(0, 5).forEach((b, i) => {
        elements.push({ id: uid(`el-bullet-bg-${i}`), type: 'shape', shapeType: 'rect', x: 80, y: 240 + (i * 80), width: 540, height: 64, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.03)', cornerRadius: 12 }, animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 300 + (i * 80) } });
        elements.push({ id: uid(`el-bullet-${i}`), type: 'text', x: 100, y: 258 + (i * 80), width: 500, height: 64, content: b.replace(/^•\s*/, ''), zIndex: currentZ++, visible: true, textStyle: { fontFamily: bodyFont, fontSize: 20, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4 }, animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 350 + (i * 80) } });
      });
      elements.push({ id: uid('el-split-bg-right'), type: 'shape', shapeType: 'rect', x: 680, y: 40, width: 560, height: CANVAS_H - 80, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.02)', stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, cornerRadius: 24 }, animation: { entrance: 'fadeSlideRight', duration: 600 } });
      const imgId = uid('el-image');
      elements.push({
        id: imgId,
        type: 'image',
        src: '',
        aiImagePending: true,
        x: 700,
        y: 60,
        width: 520,
        height: CANVAS_H - 120,
        zIndex: currentZ++,
        visible: true,
        animation: { entrance: 'zoomIn', duration: 800, delay: 400 },
      });
      if (slideData.imagePrompt) {
        get().trackDeckGenerationImage(async () => {
          const res = await fetch('/api/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: slideData.imagePrompt, width: 800, height: 900 }),
          });
          const json = await res.json();
          if (json.url) get().updateElement(slideData.id, imgId, { src: json.url });
        });
      }
    } else if (isQuote) {
      elements.push({ id: uid('el-quote-bg'), type: 'shape', shapeType: 'rect', x: 80, y: 100, width: CANVAS_W - 160, height: CANVAS_H - 200, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.03)', stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1, cornerRadius: 32 }, animation: { entrance: 'zoomIn', duration: 800 } });
      elements.push({ id: uid('el-quote-mark'), type: 'text', x: 120, y: 80, width: CANVAS_W - 240, height: 100, content: '"', zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 160, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'center', opacity: 0.3 }, animation: { entrance: 'fadeIn', duration: 1000 } });
      elements.push({ id: uid('el-quote'), type: 'text', x: 140, y: 220, width: CANVAS_W-280, height: 240, content: slideData.title || '', zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'normal', fontStyle: 'italic', color: palette[1], textAlign: 'center', lineHeight: 1.35 }, animation: { entrance: 'fadeIn', duration: 800, delay: 100 } });
      if (slideData.subtitle) elements.push({ id: uid('el-author'), type: 'text', x: 140, y: 480, width: CANVAS_W-280, height: 60, content: `— ${slideData.subtitle}`, zIndex: currentZ++, visible: true, textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'bold', color: palette[2], textAlign: 'center', lineHeight: 1.2, letterSpacing: 2 }, animation: { entrance: 'fadeIn', duration: 800, delay: 300 } });
    } else {
      // CONTENT BENTO GRID
      if (slideData.title) {
        elements.push({ id: uid('el-title-bg'), type: 'shape', shapeType: 'rect', x: 40, y: 40, width: CANVAS_W - 80, height: 100, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.02)', stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, cornerRadius: 20 }, animation: { entrance: 'fadeSlideUp', duration: 500 } });
        elements.push({ id: uid('el-title'), type: 'text', x: 80, y: 65, width: CANVAS_W-160, height: 80, content: slideData.title, zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 42, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 }, animation: { entrance: 'fadeSlideUp', duration: 600, delay: 100 } });
      }
      if (slideForLayout.bullets) {
        const numBullets = Math.min(slideForLayout.bullets.length, 6);
        const isGrid = numBullets > 3;
        const boxWidth = isGrid ? (CANVAS_W - 120) / 2 : CANVAS_W - 80;
        const boxHeight = isGrid ? (CANVAS_H - 220) / Math.ceil(numBullets / 2) : 90;
        
        slideForLayout.bullets.slice(0, 6).forEach((b, i) => {
          const col = isGrid ? i % 2 : 0;
          const row = isGrid ? Math.floor(i / 2) : i;
          const x = 40 + (col * (boxWidth + 40));
          const y = 160 + (row * (boxHeight + 20));
          
          elements.push({ id: uid(`el-bullet-bg-${i}`), type: 'shape', shapeType: 'rect', x, y, width: boxWidth, height: boxHeight, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.03)', stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1, cornerRadius: 16 }, animation: { entrance: 'zoomIn', duration: 500, delay: 200 + (i * 100) } });
          elements.push({ id: uid(`el-bullet-dot-${i}`), type: 'shape', shapeType: 'circle', x: x + 24, y: y + 24, width: 8, height: 8, zIndex: currentZ++, visible: true, shapeStyle: { fill: palette[2] || '#38BDF8' }, animation: { entrance: 'fadeIn', duration: 400, delay: 300 + (i * 100) } });
          elements.push({ id: uid(`el-b-${i}`), type: 'text', x: x + 48, y: y + 18, width: boxWidth - 64, height: boxHeight - 36, content: b.replace(/^•\s*/, ''), zIndex: currentZ++, visible: true, textStyle: { fontFamily: bodyFont, fontSize: isGrid ? 18 : 22, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.5 }, animation: { entrance: 'fadeIn', duration: 500, delay: 350 + (i * 100) } });
        });
      }
    }

    const rawSlide: Slide = {
      ...slideData,
      bullets: mergedBullets.length ? mergedBullets : slideData.bullets,
      elements,
    };
    const newSlide = finalizeSlideMotion(rawSlide, {
      animationStyle: currentPres.animationStyle,
      presentationType: currentPres.presentationType,
      styleMode: currentPres.styleMode,
      defaultSlideTransition: currentPres.defaultSlideTransition,
    });
    set((state) => ({
      presentation: { ...state.presentation!, slides: [...state.presentation!.slides, newSlide] },
      currentSlideIndex: sIdx,
    }));
  },

  // ─── Onboarding ────────────────────────────────────────────────────────────
  onboarding: {
    isActive: false,
    step: 0,
    hasSeenTour: false,
  },

  startOnboarding: () => set({ onboarding: { isActive: true, step: 0, hasSeenTour: false } }),
  
  nextOnboardingStep: () => set((state) => ({ 
    onboarding: { 
      ...state.onboarding, 
      step: state.onboarding.step + 1 
    } 
  })),

  skipOnboarding: () => set((state) => ({ 
    onboarding: { 
      ...state.onboarding, 
      isActive: false, 
      hasSeenTour: true 
    } 
  })),
}));
