// test/storeTest.ts
import { usePresentationStore } from '../src/store/usePresentationStore';

function logState(label: string) {
  const state = usePresentationStore.getState();
  console.log(label, {
    slideCount: state.presentation?.slides?.length || 0,
    historyIndex: state.historyIndex,
    selected: state.editor.selectedElementId,
  });
}

// Initialize store with a simple presentation
usePresentationStore.getState().setPresentation({
  id: 'deck-test',
  title: 'Test Deck',
  theme: 'dark',
  colorPalette: ['#000', '#fff'],
  fontPairing: { heading: 'Inter', body: 'Inter' },
  animationStyle: 'none',
  slides: [],
});
logState('After init');

// Add a slide and element
usePresentationStore.getState().addSlide({
  id: 'slide-1',
  title: 'Slide 1',
  type: 'content',
  elements: [],
});
usePresentationStore.getState().addElement('slide-1', {
  id: 'el-1',
  type: 'text',
  content: 'Hello',
  x: 0, y: 0, width: 100, height: 50,
});
logState('After add');

// Push history manually (should be auto on add)
usePresentationStore.getState().pushHistory();
logState('After pushHistory');

// Undo
usePresentationStore.getState().undo();
logState('After undo');

// Redo
usePresentationStore.getState().redo();
logState('After redo');
