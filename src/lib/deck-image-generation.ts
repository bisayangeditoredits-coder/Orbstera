import { persistGeneratedImage } from '@/lib/client/persist-generated-image';
import { buildGradientPlaceholderDataUrl, resolveVisualTheme } from '@/lib/visual-themes';

export type DeckImageTask = {
  slideId: string;
  elementId: string;
  prompt: string;
  w: number;
  h: number;
  visualProfile: 'cinematic' | 'typography';
};

/** Parallel Leonardo jobs — 4 keeps speed without tripping rate limits */
const DECK_IMAGE_CONCURRENCY = 4;

type StoreGet = () => {
  presentation?: { id?: string; slides?: { id: string }[]; theme?: string; colorPalette?: string[] } | null;
  editor: {
    generationEpoch: number;
    isGenerating: boolean;
    plannerHandoff?: { imageSource?: 'ai' | 'unsplash' | 'none'; themeName?: string };
  };
  trackDeckGenerationImage: (work: () => Promise<void>) => void;
  updateElement: (slideId: string, elementId: string, patch: Record<string, unknown>) => void;
};

function placeholderForTask(get: StoreGet, task: DeckImageTask): string {
  const pres = get().presentation;
  const themeId = get().editor.plannerHandoff?.themeName ?? pres?.theme;
  const preset = resolveVisualTheme(themeId);
  const [c1, c2] = [preset.colorPalette[2], preset.colorPalette[0]];
  return buildGradientPlaceholderDataUrl(task.w, task.h, c1, c2);
}

function clearPendingImage(get: StoreGet, task: DeckImageTask, src: string): void {
  get().updateElement(task.slideId, task.elementId, {
    src,
    aiImagePending: false,
  });
}

async function fetchImageUrl(
  imageSource: 'ai' | 'unsplash',
  task: DeckImageTask,
): Promise<{ url?: string; imageId?: string; failed?: boolean }> {
  if (imageSource === 'unsplash') {
    const res = await fetch('/api/unsplash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: task.prompt }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { failed: true };
    return { url: typeof json.url === 'string' ? json.url : undefined };
  }

  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: task.prompt,
      width: task.w,
      height: task.h,
      visualProfile: task.visualProfile,
      task: 'deck_slide_image',
      polish: false,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.warn('[deck-image] API error', res.status, json);
    return { failed: true };
  }

  return {
    url: typeof json.url === 'string' ? json.url : undefined,
    imageId: typeof json.imageId === 'string' ? json.imageId : undefined,
    failed: !json.url,
  };
}

/**
 * Deck image jobs with bounded concurrency. CDN URLs paint instantly; R2 upload is background.
 */
export function runDeckImageTasks(get: StoreGet, tasks: DeckImageTask[], deckId: string): void {
  if (tasks.length === 0) return;

  const imageSource = get().editor.plannerHandoff?.imageSource ?? 'ai';

  if (imageSource === 'none') {
    for (const task of tasks) {
      if (get().presentation?.id !== deckId) return;
      clearPendingImage(get, task, '');
    }
    return;
  }

  const runOne = async (task: DeckImageTask) => {
    if (get().presentation?.id !== deckId) return;

    let result = await fetchImageUrl(imageSource, task);

    if (!result.url) {
      await new Promise((r) => setTimeout(r, 300));
      result = await fetchImageUrl(imageSource, task);
    }

    if (get().presentation?.id !== deckId) return;

    if (!result.url) {
      clearPendingImage(get, task, placeholderForTask(get, task));
      return;
    }

    const rawUrl = result.url;

    get().updateElement(task.slideId, task.elementId, {
      src: rawUrl,
      aiImagePending: false,
      ...(result.imageId ? { aiMetadata: { leonardoImageId: result.imageId } } : {}),
    });

    if (!rawUrl.startsWith('data:') && !rawUrl.includes('/api/presentations/read-asset')) {
      void persistGeneratedImage(rawUrl, deckId).then((finalSrc) => {
        if (get().presentation?.id !== deckId) return;
        if (finalSrc && finalSrc !== rawUrl) {
          get().updateElement(task.slideId, task.elementId, { src: finalSrc });
        }
      });
    }
  };

  let nextIndex = 0;
  let active = 0;

  const pump = () => {
    while (active < DECK_IMAGE_CONCURRENCY && nextIndex < tasks.length) {
      const task = tasks[nextIndex++];
      active++;
      get().trackDeckGenerationImage(async () => {
        try {
          await runOne(task);
        } finally {
          active--;
          pump();
        }
      });
    }
  };

  pump();
}
