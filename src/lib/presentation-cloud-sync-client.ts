import { usePresentationStore } from '@/store/usePresentationStore';
import { postPresentationCloudSave } from '@/lib/presentation-cloud-save';
import { buildPresentationUpdatesAfterCloudSave } from '@/lib/merge-cloud-prepared';
import { suppressCloudDirtyDuring } from '@/lib/cloud-dirty-suppress';
import { humanizeFetchError, isAbortLikeError } from '@/lib/network-error-message';
import { enqueueCloudSave } from '@/lib/cloud-save-lock';

export type CloudSaveResult =
  | { ok: true; saveVersion: number }
  | {
      ok: false;
      error: string;
      code?: 'offline' | 'unauthorized' | 'conflict' | 'skipped' | 'error';
    };

/** Point the editor URL at the saved deck id so refresh loads from cloud. */
export function syncEditorUrlWithPresentationId(): void {
  if (typeof window === 'undefined') return;
  const pid = usePresentationStore.getState().presentation?.id;
  if (!pid) return;
  const url = new URL(window.location.href);
  if (!url.pathname.includes('/editor')) return;
  if (url.searchParams.get('id') === pid) return;
  url.searchParams.set('id', pid);
  url.searchParams.delete('prompt');
  url.searchParams.delete('copilot_approved');
  url.searchParams.delete('mode');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

export async function performPresentationCloudSaveOnce(): Promise<CloudSaveResult> {
  const body = usePresentationStore.getState().presentation;
  if (!body?.id || body.title === 'Generating...' || !body.slides?.length) {
    return { ok: false, error: 'Nothing to save yet', code: 'skipped' };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      error: 'Offline — changes will sync when you reconnect.',
      code: 'offline',
    };
  }

  const setEditorState = usePresentationStore.getState().setEditorState;
  setEditorState({ cloudSyncStatus: 'saving', cloudSyncMessage: undefined });

  try {
    const { response: res, prepared } = await postPresentationCloudSave(body);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      setEditorState({
        cloudSyncStatus: 'error',
        cloudSyncMessage: 'Sign in to sync to the cloud.',
      });
      return { ok: false, error: 'Sign in to sync to the cloud.', code: 'unauthorized' };
    }

    if (res.status === 409) {
      setEditorState({
        cloudSyncStatus: 'conflict',
        cloudSyncMessage: 'This deck was saved elsewhere. Reload to get the latest version.',
      });
      return {
        ok: false,
        error: 'This deck was saved elsewhere. Reload to get the latest version.',
        code: 'conflict',
      };
    }

    if (!res.ok) {
      const msg =
        res.status === 413
          ? 'Save failed: deck too large for one upload. Set NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL so images can be stored on R2, or remove heavy embedded images.'
          : typeof data.error === 'string'
            ? data.error
            : `Save failed (${res.status})`;
      setEditorState({ cloudSyncStatus: 'error', cloudSyncMessage: msg });
      return { ok: false, error: msg, code: 'error' };
    }

    if (data.message === 'Placeholder skipped') {
      setEditorState({ cloudSyncStatus: 'idle' });
      return { ok: false, error: 'Presentation not ready', code: 'skipped' };
    }

    if (data.success && typeof data.saveVersion === 'number') {
      const current = usePresentationStore.getState().presentation;
      const updatePresentation = usePresentationStore.getState().updatePresentation;
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
      setEditorState({ cloudSyncStatus: 'saved', cloudSyncMessage: undefined });
      window.setTimeout(() => {
        const st = usePresentationStore.getState().editor.cloudSyncStatus;
        if (st === 'saved') setEditorState({ cloudSyncStatus: 'idle' });
      }, 2000);
      return { ok: true, saveVersion: data.saveVersion };
    }

    setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
    return { ok: false, error: 'Unexpected save response', code: 'error' };
  } catch (e: unknown) {
    if (isAbortLikeError(e)) {
      setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
      return { ok: false, error: 'Save aborted', code: 'error' };
    }
    const msg = humanizeFetchError(e) || 'Sync failed';
    setEditorState({ cloudSyncStatus: 'error', cloudSyncMessage: msg });
    return { ok: false, error: msg, code: 'error' };
  }
}

/** Immediate cloud persist — used after deck generation and manual retry. */
export async function flushPresentationCloudSave(opts?: {
  retries?: number;
}): Promise<CloudSaveResult> {
  const retries = Math.max(0, opts?.retries ?? 2);
  return enqueueCloudSave(async () => {
    let last: CloudSaveResult = { ok: false, error: 'Sync failed', code: 'error' };
    for (let attempt = 0; attempt <= retries; attempt++) {
      last = await performPresentationCloudSaveOnce();
      if (last.ok) {
        syncEditorUrlWithPresentationId();
        return last;
      }
      if (last.code === 'unauthorized' || last.code === 'conflict' || last.code === 'skipped') {
        return last;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
      }
    }
    return last;
  });
}
