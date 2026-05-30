'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { isCloudDirtySuppressed } from '@/lib/cloud-dirty-suppress';
import { enqueueCloudSave } from '@/lib/cloud-save-lock';
import { performPresentationCloudSaveOnce } from '@/lib/presentation-cloud-sync-client';

const AUTOSAVE_INTERVAL_MS = 60_000;
const DEBOUNCE_SAVE_MS = 4_000;

/**
 * Debounced + interval cloud autosave while the deck has local changes, plus flush on tab hide.
 * Applies merged updates after save so concurrent edits are not overwritten by stale prepared slides.
 */
export function usePresentationCloudSync() {
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  const runSaveInternal = useCallback(async () => {
    const result = await performPresentationCloudSaveOnce();
    if (result.ok) {
      dirtyRef.current = false;
    }
  }, []);

  const runSave = useCallback(() => {
    const editor = usePresentationStore.getState().editor;
    if (editor.isGenerating && editor.deckGenerationLifecycle !== 'idle') return;
    if (savingRef.current) return;
    savingRef.current = true;
    void enqueueCloudSave(runSaveInternal).finally(() => {
      savingRef.current = false;
    });
  }, [runSaveInternal]);

  useEffect(() => {
    return usePresentationStore.subscribe((state, prev) => {
      if (isCloudDirtySuppressed()) return;
      if (state.presentation !== prev.presentation) {
        dirtyRef.current = true;
        if (state.editor.isGenerating && state.editor.deckGenerationLifecycle !== 'idle') {
          return;
        }
        if (debounceTimerRef.current != null) {
          window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
          debounceTimerRef.current = null;
          runSave();
        }, DEBOUNCE_SAVE_MS);
      }
    });
  }, [runSave]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!dirtyRef.current) return;
      runSave();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [runSave]);

  const flushOnExit = useCallback(() => {
    if (!dirtyRef.current) return;
    const body = usePresentationStore.getState().presentation;
    if (!body?.id) return;
    void enqueueCloudSave(async () => {
      await performPresentationCloudSaveOnce();
      dirtyRef.current = false;
    });
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current) {
        flushOnExit();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [flushOnExit]);

  useEffect(() => {
    const onPageHide = () => {
      if (dirtyRef.current) flushOnExit();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [flushOnExit]);
}
