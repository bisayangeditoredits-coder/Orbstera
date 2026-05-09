'use client';

import { useEffect, useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';

const DEBOUNCE_MS = 2400;

/**
 * Debounced autosave of the active presentation to `/api/presentations` (Cloudflare R2).
 * Updates `editor.cloudSyncStatus` and `presentation.saveVersion` on success.
 */
export function usePresentationCloudSync() {
  const presentation = usePresentationStore((s) => s.presentation);
  const updatePresentation = usePresentationStore((s) => s.updatePresentation);
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!presentation?.id || presentation.title === 'Generating...' || !presentation.slides?.length) {
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      setEditorState({ cloudSyncStatus: 'saving', cloudSyncMessage: undefined });

      const body = usePresentationStore.getState().presentation;
      if (!body?.id || body.title === 'Generating...') {
        savingRef.current = false;
        setEditorState({ cloudSyncStatus: 'idle' });
        return;
      }

      try {
        const res = await fetch('/api/presentations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
          setEditorState({
            cloudSyncStatus: 'error',
            cloudSyncMessage: 'Sign in to sync to the cloud.',
          });
          return;
        }

        if (res.status === 409) {
          setEditorState({
            cloudSyncStatus: 'conflict',
            cloudSyncMessage: 'This deck was saved elsewhere. Reload to get the latest version.',
          });
          return;
        }

        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : `Save failed (${res.status})`);
        }

        if (data.message === 'Placeholder skipped') {
          setEditorState({ cloudSyncStatus: 'idle' });
          return;
        }

        if (data.success && typeof data.saveVersion === 'number') {
          updatePresentation({
            saveVersion: data.saveVersion,
            lastCloudSavedAt: data.updatedAt || new Date().toISOString(),
          });
        }

        setEditorState({ cloudSyncStatus: 'saved', cloudSyncMessage: undefined });
        window.setTimeout(() => {
          const st = usePresentationStore.getState().editor.cloudSyncStatus;
          if (st === 'saved') setEditorState({ cloudSyncStatus: 'idle' });
        }, 2000);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Sync failed';
        setEditorState({
          cloudSyncStatus: 'error',
          cloudSyncMessage: msg,
        });
      } finally {
        savingRef.current = false;
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [presentation, updatePresentation, setEditorState]);
}
