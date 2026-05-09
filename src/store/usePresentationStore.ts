import { create } from 'zustand';
import { PresentationData, Slide, SlideElement, EditorState, HistoryEntry } from '@/types';
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
      const elements: SlideElement[] = [...(slide.elements || [])];
      let currentZ = elements.length + 1;

      const uid = (prefix: string) =>
        `${prefix}-${sIdx}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

      // ── HERO SLIDE ────────────────────────────────────────────────────────
      if (isHero) {
        if (slide.title) {
          elements.push({
            id: uid('el-title'), type: 'text', x: 80, y: 240, width: CANVAS_W - 160, height: 200, content: slide.title, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: 72, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.15 },
            animation: { entrance: 'fadeSlideUp', duration: 800, delay: 0 },
          });
        }
        if (slide.subtitle) {
          elements.push({
            id: uid('el-sub'), type: 'text', x: 200, y: 460, width: CANVAS_W - 400, height: 80, content: slide.subtitle, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: bodyFont, fontSize: 26, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'center', lineHeight: 1.5 },
            animation: { entrance: 'fadeSlideUp', duration: 800, delay: 200 },
          });
        }
        if (slide.imagePrompt) {
          const bgId = uid('el-bg-image');
          elements.unshift({
            id: bgId, type: 'image', src: '', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: 0, visible: true, opacity: 0.12,
            animation: { entrance: 'fadeIn', duration: 1500, delay: 0 },
          });
          imageTasks.push({ slideId: slide.id, elementId: bgId, prompt: slide.imagePrompt, w: 1280, h: 720 });
        }
      } else if (isSplit) {
        if (slide.title) {
          elements.push({
            id: uid('el-title'), type: 'text', x: 60, y: 80, width: 580, height: 160, content: slide.title, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
            animation: { entrance: 'fadeSlideLeft', duration: 600, delay: 0 },
          });
        }
        if (mergedB.length > 0) {
          mergedB.slice(0, 5).forEach((bullet, i) => {
            elements.push({
              id: uid(`el-bullet-${i}`), type: 'text', x: 60, y: 260 + (i * 72), width: 580, height: 66, content: `• ${bullet}`, zIndex: currentZ++, visible: true,
              textStyle: { fontFamily: bodyFont, fontSize: 22, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4 },
              animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 300 + (i * 100) },
            });
          });
        }
        const imgId = uid('el-image');
        elements.push({ id: imgId, type: 'image', src: '', x: 700, y: 60, width: 520, height: 600, zIndex: currentZ++, visible: true, animation: { entrance: 'zoomIn', duration: 800, delay: 400 } });
        if (slide.imagePrompt) {
          imageTasks.push({ slideId: slide.id, elementId: imgId, prompt: slide.imagePrompt, w: 800, h: 900 });
        }
      } else if (isQuote) {
        if (slide.title) {
          elements.push({ id: uid('el-quote'), type: 'text', x: 120, y: 180, width: CANVAS_W - 240, height: 280, content: `"${slide.title}"`, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: 56, fontWeight: 'normal', fontStyle: 'italic', color: palette[1], textAlign: 'center', lineHeight: 1.35 },
            animation: { entrance: 'fadeIn', duration: 1000, delay: 100 },
          });
        }
        if (slide.subtitle) {
          elements.push({ id: uid('el-author'), type: 'text', x: 120, y: 490, width: CANVAS_W - 240, height: 60, content: `— ${slide.subtitle}`, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'bold', color: palette[2], textAlign: 'center', lineHeight: 1.2 },
            animation: { entrance: 'fadeIn', duration: 1000, delay: 500 },
          });
        }
      } else {
        if (slide.title) {
          elements.push({ id: uid('el-title'), type: 'text', x: 60, y: 55, width: CANVAS_W - 120, height: 100, content: slide.title, zIndex: currentZ++, visible: true,
            textStyle: { fontFamily: headingFont, fontSize: 48, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
            animation: { entrance: 'fadeSlideUp', duration: 600, delay: 0 },
          });
        }
        elements.push({ id: uid('el-divider'), type: 'shape', shapeType: 'rect', x: 60, y: 165, width: 80, height: 4, zIndex: currentZ++, visible: true, shapeStyle: { fill: palette[2] || '#7B61FF', stroke: 'transparent', strokeWidth: 0 }, animation: { entrance: 'reveal', duration: 400, delay: 200 } });
        if (mergedB.length > 0) {
          mergedB.slice(0, 6).forEach((bullet, i) => {
            elements.push({ id: uid(`el-bullet-${i}`), type: 'text', x: 60, y: 195 + (i * 72), width: CANVAS_W - 120, height: 66, content: `• ${bullet}`, zIndex: currentZ++, visible: true,
              textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4 },
              animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 250 + (i * 80) },
            });
          });
        }
      }
      return finalizeSlideMotion(
        { ...slide, elements, title: '', subtitle: '', bullets: [] },
        motionCtx,
      );
    });

    // Set the presentation first
    const newPresentation = { ...data, slides };
    set({ presentation: newPresentation, currentSlideIndex: 0, history: [], historyIndex: -1 });
    get().pushHistory();

    // Auto-save initial generation to Cloudflare R2
    // We explicitly block "Generating..." and empty decks to prevent empty placeholder projects on the dashboard if user quits.
    if (newPresentation.title !== 'Generating...' && newPresentation.slides.length > 0) {
      fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPresentation),
      }).catch(e => console.error('[Store] Failed to auto-save to Cloudflare R2:', e));
    }

    // Fire ALL image generation tasks in parallel — much faster than sequential
    if (imageTasks.length > 0) {
      Promise.allSettled(
        imageTasks.map(task =>
          fetch('/api/generate-image', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prompt: task.prompt, width: task.w, height: task.h }),
          })
          .then(res => res.json())
          .then(json => {
            if (json.url) {
              get().updateElement(task.slideId, task.elementId, { src: json.url });
            }
          })
          .catch(e => console.error(`[Store] Image failed for ${task.elementId}`, e))
        )
      );
    }
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
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.id === slideId
              ? {
                  ...s,
                  elements: (s.elements || []).map((el) =>
                    el.id === elementId ? { ...el, ...updates } : el
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
    isDragging: false,
    isResizing: false,
    zoom: 0.7,
    showGrid: false,
    snapToGrid: true,
    gridSize: 20,
    isPresenting: false,
    isGenerating: false,
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
      if (slideData.title) elements.push({ id: uid('el-title'), type: 'text', x: 80, y: 240, width: CANVAS_W-160, height: 200, content: slideData.title, zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 72, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.15 }, animation: { entrance: 'fadeSlideUp', duration: 800 } });
      if (slideData.subtitle) elements.push({ id: uid('el-sub'), type: 'text', x: 200, y: 460, width: CANVAS_W-400, height: 80, content: slideData.subtitle, zIndex: currentZ++, visible: true, textStyle: { fontFamily: bodyFont, fontSize: 26, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'center', lineHeight: 1.5 }, animation: { entrance: 'fadeSlideUp', duration: 800, delay: 200 } });
    } else if (isSplit) {
      if (slideData.title) elements.push({ id: uid('el-title'), type: 'text', x: 60, y: 80, width: 580, height: 160, content: slideData.title, zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 }, animation: { entrance: 'fadeSlideLeft', duration: 600 } });
      if (slideForLayout.bullets) slideForLayout.bullets!.slice(0, 5).forEach((b, i) => elements.push({ id: uid(`el-bullet-${i}`), type: 'text', x: 60, y: 260 + (i * 72), width: 580, height: 66, content: `• ${b}`, zIndex: currentZ++, visible: true, textStyle: { fontFamily: bodyFont, fontSize: 22, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4 }, animation: { entrance: 'fadeSlideLeft', duration: 500, delay: 300 + (i * 100) } }));
      const imgId = uid('el-image');
      elements.push({ id: imgId, type: 'image', src: '', x: 700, y: 60, width: 520, height: 600, zIndex: currentZ++, visible: true, animation: { entrance: 'zoomIn', duration: 800, delay: 400 } });
      if (slideData.imagePrompt) {
        (async () => {
          try {
            const res = await fetch('/api/generate-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: slideData.imagePrompt, width: 800, height: 900 }) });
            const json = await res.json();
            if (json.url) get().updateElement(slideData.id, imgId, { src: json.url });
          } catch (e) {}
        })();
      }
    } else if (isQuote) {
      elements.push({ id: uid('el-quote'), type: 'text', x: 120, y: 220, width: CANVAS_W-240, height: 200, content: `"${slideData.title}"`, zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 48, fontWeight: 'normal', fontStyle: 'italic', color: palette[1], textAlign: 'center', lineHeight: 1.3 }, animation: { entrance: 'fadeIn', duration: 800 } });
    } else {
      if (slideData.title) elements.push({ id: uid('el-title'), type: 'text', x: 80, y: 60, width: CANVAS_W-160, height: 100, content: slideData.title, zIndex: currentZ++, visible: true, textStyle: { fontFamily: headingFont, fontSize: 42, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.2 }, animation: { entrance: 'fadeSlideUp', duration: 600 } });
      if (slideForLayout.bullets) slideForLayout.bullets!.forEach((b, i) => elements.push({ id: uid(`el-b-${i}`), type: 'text', x: 120, y: 180 + (i * 60), width: CANVAS_W-240, height: 50, content: `• ${b}`, zIndex: currentZ++, visible: true, textStyle: { fontFamily: bodyFont, fontSize: 20, fontWeight: 'normal', color: palette[1], textAlign: 'left', lineHeight: 1.4 }, animation: { entrance: 'fadeSlideUp', duration: 500, delay: 200 + (i * 50) } }));
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
