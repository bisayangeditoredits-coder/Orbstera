import { setPresentationAction } from './actions/setPresentationAction';
import { create } from 'zustand';
import { PresentationData, Slide, SlideElement, HistoryEntry, EditorState } from '@/types';
import { finalizeSlideMotion } from '@/lib/presentationMotion';
import { runDeckImageTasks } from '@/lib/deck-image-generation';
import { buildDeckSlideElements } from '@/lib/deck-slide-layout';
import { resolveVisualTheme } from '@/lib/visual-themes';

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
      console.log('ZUSTAND SET:', new Error().stack.split('\n').slice(1,4).join('\n'));
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
    set((state) => {
      // Bail-out: skip the update if nothing actually changed.
      // This is critical during generation where setEditorState is called frequently
      // (e.g. reasoning text, pan resets) and can trigger infinite re-render loops.
      const current = state.editor;
      let changed = false;
      for (const key of Object.keys(updates) as (keyof typeof updates)[]) {
        const nextVal = (updates as Record<string, unknown>)[key];
        const curVal = current[key];
        // Special-case `pan` (and any object with x/y): compare by value, not reference.
        if (
          key === 'pan' &&
          curVal !== null && typeof curVal === 'object' &&
          nextVal !== null && typeof nextVal === 'object'
        ) {
          const c = curVal as { x: number; y: number };
          const n = nextVal as { x: number; y: number };
          if (c.x !== n.x || c.y !== n.y) { changed = true; break; }
          continue;
        }
        if (curVal !== nextVal) { changed = true; break; }
      }
      if (!changed) return state;
      return { editor: { ...current, ...updates } };
    }),



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
    const handoff = get().editor.plannerHandoff;
    const palette = base?.colorPalette || handoff?.colorPalette || ['#05050A', '#FFFFFF', '#0009fa', '#94A3B8'];
    const titleFromHandoff =
      typeof handoff?.topic === 'string' && handoff.topic.trim()
        ? handoff.topic.trim()
        : base?.title && base.title !== 'Generating...'
          ? base.title
          : 'Untitled Presentation';
    set({
      presentation: {
        title: titleFromHandoff,
        theme: base?.theme || handoff?.themeName || 'modern-dark',
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
      const handoff = state.editor.plannerHandoff;
      const title =
        typeof handoff?.topic === 'string' && handoff.topic.trim()
          ? handoff.topic.trim()
          : 'Untitled Presentation';
      set({
        presentation: {
          title,
          theme: handoff?.themeName || 'modern-dark',
          colorPalette: handoff?.colorPalette?.length
            ? handoff.colorPalette
            : ['#05050A', '#FFFFFF', '#0009fa', '#94A3B8'],
          fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
          animationStyle: 'cinematic-reveal',
          slides: [],
        },
      });
    }

    const currentPres = get().presentation!;
    const palette     = currentPres.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
    const headingFont = currentPres.fontPairing?.heading || 'Space Grotesk';
    const bodyFont    = currentPres.fontPairing?.body    || 'Inter';
    const backgroundMode = resolveVisualTheme(currentPres.theme).backgroundMode;
    const placeholderIdx = currentPres.slides.findIndex((s) => s.isGeneratingPlaceholder);
    const sIdx = placeholderIdx >= 0 ? placeholderIdx : currentPres.slides.length;

    const uid = (prefix: string) => `${prefix}-${sIdx}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const mergedBullets = [
      ...(slideData.bullets || []),
      ...(slideData.content?.bullets || []),
    ];
    const slideId =
      slideData.id || (placeholderIdx >= 0 ? currentPres.slides[placeholderIdx].id : `slide-${sIdx}`);

    const { elements, imageTasks } = buildDeckSlideElements({
      slide: {
        id: slideId,
        type: slideData.type,
        title: slideData.title,
        subtitle: slideData.subtitle,
        bullets: mergedBullets.length ? mergedBullets : slideData.bullets,
        content: slideData.content,
        imagePrompt: slideData.imagePrompt,
      },
      sIdx,
      palette,
      headingFont,
      bodyFont,
      uid,
      backgroundMode,
    });

    const rawSlide: Slide = {
      ...slideData,
      id: slideId,
      bullets: mergedBullets.length ? mergedBullets : slideData.bullets,
      elements,
      isGeneratingPlaceholder: false,
      generationStatus: imageTasks.length > 0 ? 'visuals' : 'ready',
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
    if (deckIdAtStream && get().presentation?.id === deckIdAtStream && imageTasks.length > 0) {
      if (get().editor.isGenerating) {
        set((state) => ({
          editor: {
            ...state.editor,
            deckGenerationLifecycle: 'images',
            generationBlockingOverlay: false,
          },
        }));
      }
      runDeckImageTasks(get, imageTasks, deckIdAtStream);
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
