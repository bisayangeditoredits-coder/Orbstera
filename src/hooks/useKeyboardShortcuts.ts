'use client';

/**
 * Global canvas keyboard shortcuts (single listener — KonvaCanvas keeps canvas-only keys).
 */
import { useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';

function isTypingInField(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  const tag = active.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    active.isContentEditable
  );
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingInField()) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const store = usePresentationStore.getState();
      const { presentation, currentSlideIndex, editor } = store;
      const slide = presentation?.slides?.[currentSlideIndex];

      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        store.undo();
        return;
      }

      if (
        (ctrl && e.key.toLowerCase() === 'y') ||
        (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        store.redo();
        return;
      }

      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        store.copyElement();
        return;
      }

      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        store.pasteElement();
        return;
      }

      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'd') {
        if (slide && editor.selectedElementId) {
          e.preventDefault();
          store.duplicateElement(slide.id, editor.selectedElementId);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!slide) return;
        const ids =
          editor.selectedElementIds.length > 1
            ? editor.selectedElementIds
            : editor.selectedElementId
              ? [editor.selectedElementId]
              : [];
        if (ids.length === 0) return;
        e.preventDefault();
        ids.forEach((id) => store.removeElement(slide.id, id));
        if (ids.length > 1) store.clearMultiSelection();
        else store.selectElement(null);
        return;
      }

      if (e.key === 'Escape') {
        store.selectElement(null);
        store.clearMultiSelection();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
