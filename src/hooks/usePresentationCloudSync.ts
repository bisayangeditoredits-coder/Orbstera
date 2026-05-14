'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { postPresentationCloudSave } from '@/lib/presentation-cloud-save';
import { buildPresentationUpdatesAfterCloudSave } from '@/lib/merge-cloud-prepared';
import { isCloudDirtySuppressed, suppressCloudDirtyDuring } from '@/lib/cloud-dirty-suppress';
import { humanizeFetchError, isAbortLikeError } from '@/lib/network-error-message';

const AUTOSAVE_INTERVAL_MS = 60_000;

/**
 * Interval-based cloud autosave (~60s while the deck has local changes) plus flush on tab hide.
 * Applies merged updates after save so concurrent edits are not overwritten by stale prepared slides.
 */
export function usePresentationCloudSync() {
  const updatePresentation = usePresentationStore((s) => s.updatePresentation);
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);

  const runSave = useCallback(async () => {
    if (savingRef.current) return;

    const body = usePresentationStore.getState().presentation;
    if (!body?.id || body.title === 'Generating...' || !body.slides?.length) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    savingRef.current = true;
    setEditorState({ cloudSyncStatus: 'saving', cloudSyncMessage: undefined });

    try {
      const { response: res, prepared } = await postPresentationCloudSave(body);
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
        if (res.status === 413) {
          throw new Error(
            'Save failed: deck too large for one upload. Set NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL so images can be stored on R2, or remove heavy embedded images.',
          );
        }
        throw new Error(typeof data.error === 'string' ? data.error : `Save failed (${res.status})`);
      }

      if (data.message === 'Placeholder skipped') {
        setEditorState({ cloudSyncStatus: 'idle' });
        return;
      }

      if (data.success && typeof data.saveVersion === 'number') {
        const current = usePresentationStore.getState().presentation;
        if (current) {
          suppressCloudDirtyDuring(() => {
            updatePresentation(
              buildPresentationUpdatesAfterCloudSave(
                current,
                body,
                prepared,
                data.saveVersion,
                data.updatedAt || new Date().toISOString(),
              ),
            );
          });
        }
        dirtyRef.current = false;
        setEditorState({ cloudSyncStatus: 'saved', cloudSyncMessage: undefined });
        window.setTimeout(() => {
          const st = usePresentationStore.getState().editor.cloudSyncStatus;
          if (st === 'saved') setEditorState({ cloudSyncStatus: 'idle' });
        }, 2000);
      }
    } catch (e: unknown) {
      if (isAbortLikeError(e)) {
        setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
        return;
      }
      const msg = humanizeFetchError(e);
      setEditorState({
        cloudSyncStatus: 'error',
        cloudSyncMessage: msg || 'Sync failed',
      });
    } finally {
      savingRef.current = false;
    }
  }, [updatePresentation, setEditorState]);

  useEffect(() => {
    return usePresentationStore.subscribe((state, prev) => {
      if (isCloudDirtySuppressed()) return;
      if (state.presentation !== prev.presentation) {
        dirtyRef.current = true;
      }
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!dirtyRef.current) return;
      void runSave();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [runSave]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current) {
        void runSave();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [runSave]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (dirtyRef.current && usePresentationStore.getState().presentation?.id) {
        void runSave();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [runSave]);
}
