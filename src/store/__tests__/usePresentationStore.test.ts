import { createEditorGeneratingShell } from '@/lib/editor-generating-shell';
import { usePresentationStore } from '../usePresentationStore';

describe('usePresentationStore History', () => {
  beforeEach(() => {
    // Reset store before each test
    usePresentationStore.setState({
      presentation: null,
      history: [],
      historyIndex: -1,
      currentSlideIndex: 0,
      editor: {
        activeTool: 'select',
        selectedElementId: null,
        selectedElementIds: [],
        clipboardElement: null,
        isPanningImage: null,
        generativeFillTarget: null,
        isDragging: false,
        isResizing: false,
        zoom: 1,
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
      }
    });
  });

  it('should push history correctly', () => {
    const store = usePresentationStore.getState();
    store.setPresentation({
      ...createEditorGeneratingShell({ themeName: 'dark' }),
      id: 'test-1',
    } as any);
    
    // pushHistory is called in setPresentation, so history length should be 1
    expect(usePresentationStore.getState().history.length).toBe(1);
    expect(usePresentationStore.getState().historyIndex).toBe(0);
  });

  it('should undo and redo correctly', () => {
    const store = usePresentationStore.getState();
    store.setPresentation({
      ...createEditorGeneratingShell({ themeName: 'dark' }),
      id: 'test-1',
    } as any);
    
    // Add a slide
    usePresentationStore.getState().addSlide({ id: 's1', elements: [] } as any);
    
    expect(usePresentationStore.getState().history.length).toBe(2);
    expect(usePresentationStore.getState().historyIndex).toBe(1);
    expect(usePresentationStore.getState().presentation?.slides.length).toBe(1);

    // Undo
    usePresentationStore.getState().undo();
    expect(usePresentationStore.getState().historyIndex).toBe(0);
    expect(usePresentationStore.getState().presentation?.slides.length).toBe(0);

    // Redo
    usePresentationStore.getState().redo();
    expect(usePresentationStore.getState().historyIndex).toBe(1);
    expect(usePresentationStore.getState().presentation?.slides.length).toBe(1);
  });

  it('caps history at MAX_HISTORY_STEPS and stores slides + theme only', () => {
    const store = usePresentationStore.getState();
    store.setPresentation({
      ...createEditorGeneratingShell({ themeName: 'dark' }),
      id: 'test-1',
    } as any);

    for (let i = 0; i < 15; i++) {
      usePresentationStore.getState().addSlide({ id: `s${i}`, elements: [] } as any);
    }

    const { history, historyIndex } = usePresentationStore.getState();
    expect(history.length).toBeLessThanOrEqual(10);
    expect(historyIndex).toBe(history.length - 1);
    expect(history[0]).toMatchObject({ theme: 'dark' });
    expect(history[0]).not.toHaveProperty('editor');
  });
});
