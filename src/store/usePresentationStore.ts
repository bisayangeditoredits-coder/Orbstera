import { setPresentationAction } from './actions/setPresentationAction';
import { create } from 'zustand';
import { PresentationData, Slide, SlideElement, HistoryEntry, EditorState } from '@/types';
import { finalizeSlideMotion } from '@/lib/presentationMotion';

/** Cap undo stack size to limit RAM on large decks (structured clones per step). */
const MAX_HISTORY_STEPS = 10;

/** Lightweight signature for undo dedup (avoids full JSON.stringify on large decks). */
function slidesHistorySignature(slides: Slide[]): string {
  return slides
    .map((s) => {
      const els = s.elements || [];
      return `${s.id}:${els.length}:${els.map((e) => `${e.id}:${e.x}:${e.y}:${e.width}:${e.height}`).join(';')}`;
    })
    .join('|');
}

function historyEntrySignature(entry: HistoryEntry): string {
  return `${entry.theme}:${slidesHistorySignature(entry.slides)}`;
}

/** Deck content only — excludes editor UI, generation flags, sync metadata, etc. */
function captureHistorySnapshot(presentation: PresentationData): HistoryEntry {
  return {
    slides: structuredClone(presentation.slides),
    theme: presentation.theme || 'dark',
    timestamp: Date.now(),
  };
}

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
  updateSlide: (slideId: string, updates: Partial<Slide>, saveHistory?: boolean) => void;
  duplicateSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;

  // ─── Element Management ───────────────────────────────────────────────────
  addElement: (slideId: string, element: SlideElement) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>, saveHistory?: boolean) => void;
  removeElement: (slideId: string, elementId: string) => void;
  reorderElements: (slideId: string, elementId: string, direction: 'up' | 'down', saveHistory?: boolean) => void;
  /** `orderedIds` is top-first (same as Layers panel): first id = frontmost on canvas (= last in storage). */
  setElementsOrder: (slideId: string, orderedIdsTopFirst: string[], saveHistory?: boolean) => void;
  copyElement: () => void;
  pasteElement: () => void;
  duplicateElement: (slideId: string, elementId: string) => void;

  // ─── Editor State ─────────────────────────────────────────────────────────
  editor: EditorState;
  setEditorState: (updates: Partial<EditorState>) => void;
  selectElement: (id: string | null) => void;
  /** Select multiple elements at once (Shift+Click, lasso) */
  selectElements: (ids: string[]) => void;
  /** Clear all multi-selection state */
  clearMultiSelection: () => void;

  // ─── History (Undo/Redo) ──────────────────────────────────────────────────
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // ─── UI Panels ────────────────────────────────────────────────────────────
  activePanel: 'generate' | 'layers' | 'design' | 'notes' | 'layouts' | 'photos' | 'icons' | 'qr' | 'charts' | 'giphy' | 'ai' | 'video' | 'videos' | 'animations' | 'pollinations' | 'wikipedia' | 'wordsuggester' | 'apps' | 'avatars' | 'flags' | 'mockups' | 'shapes' | 'timeline' | 'svgpattern' | 'map' | 'grammar' | 'mermaid';
  setActivePanel: (panel: 'generate' | 'layers' | 'design' | 'notes' | 'layouts' | 'photos' | 'icons' | 'qr' | 'charts' | 'giphy' | 'ai' | 'video' | 'videos' | 'animations' | 'pollinations' | 'wikipedia' | 'wordsuggester' | 'apps' | 'avatars' | 'flags' | 'mockups' | 'shapes' | 'timeline' | 'svgpattern' | 'map' | 'grammar' | 'mermaid') => void;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;

  // ─── Streaming & Live Generation ───────────────────────────────────────────
  initGenerationPlaceholders: (count: number) => void;
  markGenerationPlaceholdersComposing: () => void;
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

  setPresentation: (data) => setPresentationAction(set, get, data),

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

  updateSlide: (slideId, updates, saveHistory = false) => {
    if (saveHistory) get().pushHistory();
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

  updateElement: (slideId, elementId, updates, saveHistory = false) => {
    if (saveHistory) get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      const clearPending =
        typeof updates.src === 'string' && updates.src.trim().length > 0
          ? { aiImagePending: false as const }
          : {};
      const exitBuildReveal =
        saveHistory && state.editor.generationBuildReveal
          ? { generationBuildReveal: false as const }
          : {};
      return {
        editor: { ...state.editor, ...exitBuildReveal },
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

  reorderElements: (slideId, elementId, direction, saveHistory = false) => {
    if (saveHistory) get().pushHistory();
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
            // Layers list is top-first; Konva draws later indices on top. "up" = toward front = higher index.
            if (direction === 'up' && idx < elements.length - 1) {
              [elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]];
            } else if (direction === 'down' && idx > 0) {
              [elements[idx - 1], elements[idx]] = [elements[idx], elements[idx - 1]];
            }
            return { ...s, elements };
          }),
        },
      };
    });
  },

  setElementsOrder: (slideId, orderedIdsTopFirst, saveHistory = false) => {
    const pres = get().presentation;
    if (!pres) return;
    const slide = pres.slides.find((s) => s.id === slideId);
    if (!slide) return;
    const current = slide.elements || [];
    if (orderedIdsTopFirst.length !== current.length || current.length === 0) return;
    const idSet = new Set(current.map((el) => el.id));
    if (idSet.size !== orderedIdsTopFirst.length) return;
    for (const id of orderedIdsTopFirst) {
      if (!idSet.has(id)) return;
    }
    const byId = new Map(current.map((el) => [el.id, el] as const));
    const newStorageOrder = [...orderedIdsTopFirst].reverse().map((id) => byId.get(id)!);
    const changed = newStorageOrder.some((el, i) => el.id !== current[i].id);
    if (!changed) return;
    if (saveHistory) get().pushHistory();
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.id === slideId ? { ...s, elements: newStorageOrder } : s,
          ),
        },
      };
    });
  },

  copyElement: () => {
    const state = get();
    if (!state.presentation || !state.editor.selectedElementId) return;
    const slide = state.presentation.slides[state.currentSlideIndex];
    if (!slide) return;
    const element = slide.elements?.find((el) => el.id === state.editor.selectedElementId);
    if (element) {
      set({ editor: { ...state.editor, clipboardElement: JSON.parse(JSON.stringify(element)) } });
    }
  },

  pasteElement: () => {
    const state = get();
    if (!state.presentation || !state.editor.clipboardElement) return;
    const slide = state.presentation.slides[state.currentSlideIndex];
    if (!slide) return;
    
    // Create a deep copy with a new ID and slightly offset position
    const newElement: SlideElement = {
      ...JSON.parse(JSON.stringify(state.editor.clipboardElement)),
      id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      x: state.editor.clipboardElement.x + 20,
      y: state.editor.clipboardElement.y + 20,
    };
    
    get().addElement(slide.id, newElement);
    get().selectElement(newElement.id);
  },

  duplicateElement: (slideId, elementId) => {
    const state = get();
    if (!state.presentation) return;
    const slide = state.presentation.slides.find((s) => s.id === slideId);
    if (!slide) return;
    const element = slide.elements?.find((el) => el.id === elementId);
    if (!element) return;

    const newElement: SlideElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      x: element.x + 20,
      y: element.y + 20,
    };

    get().addElement(slideId, newElement);
    get().selectElement(newElement.id);
  },

  editor: {
    activeTool: 'select',
    selectedElementId: null,
    selectedElementIds: [],
    clipboardElement: null,
    isPanningImage: null,
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
    generationImageJobsFailed: 0,
    previewElementId: null,
    reasoning: '',
    pan: { x: 0, y: 0 },
    orchestrationPhase: '',
    activeModelLabel: '',
    orchestrationMessage: '',
    freeTasteActive: false,
    freeTasteImagesRemaining: 0,
    generationGalleryOpen: false,
    cloudSyncStatus: 'idle',
    cloudSyncMessage: undefined,
    generationBuildReveal: false,
    generationRevealedSlides: [],
  },
  setEditorState: (updates) =>
    set((state) => ({ editor: { ...state.editor, ...updates } })),

  selectElement: (id) =>
    set((state) => {
      const exitBuildReveal = state.editor.generationBuildReveal
        ? { generationBuildReveal: false as const }
        : {};
      const updates: Partial<PresentationStore> = {
        editor: {
          ...state.editor,
          ...exitBuildReveal,
          selectedElementId: id,
          selectedElementIds: id ? [id] : [],
          isPanningImage: null,
        },
      };
      // With a selection: open side panel and show Layers (properties / stack).
      if (id !== null) {
        updates.isPanelOpen = true;
        if (state.activePanel !== 'layers') {
          updates.activePanel = 'layers';
        }
      } else {
        // Deselect: keep current panel — avoid jumping away from Design/Notes while editing.
        updates.isPanelOpen = state.isPanelOpen;
      }
      return updates;
    }),

  selectElements: (ids) =>
    set((state) => ({
      editor: {
        ...state.editor,
        selectedElementIds: ids,
        selectedElementId: ids.length === 1 ? ids[0] : null,
      },
    })),

  clearMultiSelection: () =>
    set((state) => ({
      editor: { ...state.editor, selectedElementId: null, selectedElementIds: [] },
    })),

  history: [],
  historyIndex: -1,

  // ── History (undo/redo) — slides + theme only, bounded stack ─────────────
  pushHistory: () => {
    const state = get();
    if (!state.presentation) return;
    const snapshot = captureHistorySnapshot(state.presentation);
    const history = state.history.slice(0, state.historyIndex + 1);
    const last = history[history.length - 1];
    if (last && historyEntrySignature(last) === historyEntrySignature(snapshot)) return;
    history.push(snapshot);
    while (history.length > MAX_HISTORY_STEPS) history.shift();
    set({ history, historyIndex: history.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0 || !state.presentation) return;
    const newIndex = state.historyIndex - 1;
    const entry = state.history[newIndex];
    set({
      presentation: {
        ...state.presentation,
        slides: structuredClone(entry.slides),
        theme: entry.theme,
      },
      historyIndex: newIndex,
    });
  },
  redo: () => {
    const state = get();
    if (!state.presentation || state.historyIndex >= state.history.length - 1) return;
    const newIndex = state.historyIndex + 1;
    const entry = state.history[newIndex];
    set({
      presentation: {
        ...state.presentation,
        slides: structuredClone(entry.slides),
        theme: entry.theme,
      },
      historyIndex: newIndex,
    });
  },

  activePanel: 'generate',
  setActivePanel: (panel) => set({ activePanel: panel }),
  isPanelOpen: true,
  setPanelOpen: (open) => set({ isPanelOpen: open }),

  initGenerationPlaceholders: (count) => {
    const base = get().presentation;
    const palette = base?.colorPalette || ['#05050A', '#FFFFFF', '#0009fa', '#94A3B8'];
    set({
      presentation: {
        title: base?.title && base.title !== 'Generating...' ? base.title : 'Generating...',
        theme: base?.theme || 'modern-dark',
        colorPalette: palette,
        fontPairing: base?.fontPairing || { heading: 'Space Grotesk', body: 'Inter' },
        animationStyle: base?.animationStyle || 'cinematic-reveal',
        slides: [],
      },
      currentSlideIndex: 0,
    });
  },

  markGenerationPlaceholdersComposing: () => {
    set((state) => {
      if (!state.presentation?.slides?.length) return state;
      return {
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map((s) =>
            s.isGeneratingPlaceholder
              ? { ...s, generationStatus: 'composing' as const, subtitle: 'Composing…' }
              : s,
          ),
        },
      };
    });
  },

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
    void work()
      .then(() => {
        if (!scheduled) return;
        set((state) => {
          if (state.editor.generationEpoch !== epochSnapshot) return state;
          return {
            editor: {
              ...state.editor,
              generationImageJobsCompleted: Math.min(
                state.editor.generationImageJobsTotal,
                state.editor.generationImageJobsCompleted + 1,
              ),
            },
          };
        });
      })
      .catch((err) => {
        console.error('[deck-generation-image]', err);
        if (!scheduled) return;
        set((state) => {
          if (state.editor.generationEpoch !== epochSnapshot) return state;
          return {
            editor: {
              ...state.editor,
              generationImageJobsFailed: state.editor.generationImageJobsFailed + 1,
            },
          };
        });
      })
      .finally(() => {
        if (!scheduled) return;
        set((state) => {
          if (state.editor.generationEpoch !== epochSnapshot) return state;
          return {
            editor: {
              ...state.editor,
              generationPendingImages: Math.max(0, state.editor.generationPendingImages - 1),
            },
          };
        });
      });
  },

  streamSlide: (slideData) => {
    const state = get();
    if (!state.presentation) {
      set({ presentation: { title: "Generating...", theme: "modern-dark", colorPalette: ["#05050A", "#FFFFFF", "#0009fa", "#94A3B8"], fontPairing: { heading: "Space Grotesk", body: "Inter" }, animationStyle: "cinematic-reveal", slides: [] } });
    }

    const pendingImageJobs: Array<() => void> = [];
    const scheduleDeckImage = (work: () => Promise<void>) => {
      const ed = get().editor;
      if (ed.freeTasteActive && (ed.freeTasteImagesRemaining ?? 0) <= 0) return;
      if (ed.freeTasteActive) {
        set({
          editor: {
            ...ed,
            freeTasteImagesRemaining: Math.max(0, (ed.freeTasteImagesRemaining ?? 0) - 1),
          },
        });
      }
      pendingImageJobs.push(() => {
        get().trackDeckGenerationImage(work);
      });
    };

    const currentPres = get().presentation!;
    const palette     = currentPres.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const headingFont = currentPres.fontPairing?.heading || 'Space Grotesk';
    const bodyFont    = currentPres.fontPairing?.body    || 'Inter';
    const placeholderIdx = currentPres.slides.findIndex((s) => s.isGeneratingPlaceholder);
    const sIdx = placeholderIdx >= 0 ? placeholderIdx : currentPres.slides.length;

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
          const slideId = slideData.id || `slide-${sIdx}`;
          elements.unshift({ id: bgId, type: 'image', src: '', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: 0, visible: true, opacity: 0.35, animation: { entrance: 'fadeIn', duration: 1500, delay: 0 } });
          scheduleDeckImage(async () => {
            try {
              const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: slideData.imagePrompt,
                  width: 1280,
                  height: 720,
                  visualProfile: 'typography',
                  task: 'image_generate',
                }),
              });
              const json = await res.json();
              if (json.url) {
                get().updateElement(slideId, bgId, {
                  src: json.url,
                  aiMetadata: json.imageId ? { leonardoImageId: json.imageId } : undefined
                });
              }
            } catch (e) {
              console.error('[DeckGen] Hero background image failed:', e);
            }
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
      elements.push({ id: uid('el-split-bg-right'), type: 'shape', shapeType: 'rect', x: 680, y: 40, width: 560, height: CANVAS_H - 80, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.02)', stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, cornerRadius: 24 }, animation: { entrance: 'slideRight', duration: 600 } });
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
        const slideId = slideData.id || `slide-${sIdx}`;
        scheduleDeckImage(async () => {
          try {
            const res = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: slideData.imagePrompt,
                width: 800,
                height: 900,
                visualProfile: 'cinematic',
                task: 'image_generate',
              }),
            });
            const json = await res.json();
            if (json.url) {
              get().updateElement(slideId, imgId, {
                src: json.url,
                aiMetadata: json.imageId ? { leonardoImageId: json.imageId } : undefined
              });
            }
          } catch (e) {
            console.error('[DeckGen] Split/media slide image failed:', e);
          }
        });
      }
    } else if (isQuote) {
      elements.push({ id: uid('el-quote-bg'), type: 'shape', shapeType: 'rect', x: 80, y: 100, width: CANVAS_W - 160, height: CANVAS_H - 200, zIndex: currentZ++, visible: true, shapeStyle: { fill: 'rgba(255, 255, 255, 0.03)', stroke: 'rgba(255, 255, 255, 0.06)', strokeWidth: 1, cornerRadius: 32 }, animation: { entrance: 'zoomIn', duration: 800 } });
      elements.push({ id: uid('el-quote-mark'), type: 'text', x: 120, y: 80, width: CANVAS_W - 240, height: 100, content: '"', zIndex: currentZ++, visible: true, opacity: 0.3, textStyle: { fontFamily: headingFont, fontSize: 160, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'center' }, animation: { entrance: 'fadeIn', duration: 1000 } });
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

    const slideId =
      slideData.id || (placeholderIdx >= 0 ? currentPres.slides[placeholderIdx].id : `slide-${sIdx}`);
    const rawSlide: Slide = {
      ...slideData,
      id: slideId,
      bullets: mergedBullets.length ? mergedBullets : slideData.bullets,
      elements,
      isGeneratingPlaceholder: false,
      generationStatus: slideData.imagePrompt ? 'visuals' : 'ready',
    };
    const newSlide = finalizeSlideMotion(rawSlide, {
      animationStyle: currentPres.animationStyle,
      presentationType: currentPres.presentationType,
      styleMode: currentPres.styleMode,
      defaultSlideTransition: currentPres.defaultSlideTransition,
    });
    const deckIdAtStream = get().presentation?.id;
    set((state) => {
      if (!state.presentation) return state;
      const slides = [...state.presentation.slides];
      if (placeholderIdx >= 0) {
        slides[placeholderIdx] = newSlide;
      } else {
        slides.push(newSlide);
      }
      return {
        presentation: { ...state.presentation, slides },
        currentSlideIndex: placeholderIdx >= 0 ? placeholderIdx : slides.length - 1,
      };
    });
    if (deckIdAtStream && get().presentation?.id === deckIdAtStream) {
      for (const job of pendingImageJobs) job();
    }
  },

  // ─── Onboarding ────────────────────────────────────────────────────────────
  onboarding: {
    isActive: false,
    step: 0,
    hasSeenTour: (() => {
      if (typeof window === 'undefined') return false;
      try {
        return window.localStorage.getItem('orbstera_tour_seen') === 'true';
      } catch {
        // Some browsers/environments can throw on localStorage access (privacy mode / blocked storage).
        return false;
      }
    })(),
  },

  startOnboarding: () => set({ onboarding: { isActive: true, step: 0, hasSeenTour: false } }),
  
  nextOnboardingStep: () => set((state) => ({ 
    onboarding: { 
      ...state.onboarding, 
      step: state.onboarding.step + 1 
    } 
  })),

  skipOnboarding: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orbstera_tour_seen', 'true');
    }
    set((state) => ({ 
      onboarding: { 
        ...state.onboarding, 
        isActive: false, 
        hasSeenTour: true 
      } 
    }));
  },
}));
