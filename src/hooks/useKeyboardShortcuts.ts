'use client';

/**
 * useKeyboardShortcuts
 * --------------------
 * Handles global keyboard shortcuts for the canvas editor.
 * Wires into the existing store actions so no store code needs to change.
 *
 * Shortcuts:
 *   Ctrl/Cmd + Z   → undo
 *   Ctrl/Cmd + Y   → redo
 *   Ctrl/Cmd + Shift + Z → redo (Mac style)
 *   Ctrl/Cmd + C   → copy selected element
 *   Ctrl/Cmd + V   → paste element
 *   Ctrl/Cmd + D   → duplicate selected element
 *   Delete / Backspace → remove selected element
 *   Escape         → deselect
 */

import { useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Do not intercept when user is typing in an input / textarea / contenteditable
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;
      const tag = active.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        active.isContentEditable
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const store = usePresentationStore.getState();

      // ── Undo ──────────────────────────────────────────────────────────────
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        store.undo();
        return;
      }

      // ── Redo ──────────────────────────────────────────────────────────────
      if (
        (ctrl && e.key.toLowerCase() === 'y') ||
        (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        store.redo();
        return;
      }

      // ── Copy ──────────────────────────────────────────────────────────────
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'c') {
        store.copyElement();
        return;
      }

      // ── Paste ─────────────────────────────────────────────────────────────
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'v') {
        store.pasteElement();
        return;
      }

      // ── Duplicate ─────────────────────────────────────────────────────────
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'd') {
        const { presentation, currentSlideIndex, editor } = store;
        const slide = presentation?.slides?.[currentSlideIndex];
        if (slide && editor.selectedElementId) {
          e.preventDefault();
          store.duplicateElement(slide.id, editor.selectedElementId);
        }
        return;
      }

      // ── Delete selected element ────────────────────────────────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { presentation, currentSlideIndex, editor } = store;
        const slide = presentation?.slides?.[currentSlideIndex];
        if (slide && editor.selectedElementId) {
          store.removeElement(slide.id, editor.selectedElementId);
        }
        return;
      }

      // ── Escape: deselect ──────────────────────────────────────────────────
      if (e.key === 'Escape') {
        store.selectElement(null);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
