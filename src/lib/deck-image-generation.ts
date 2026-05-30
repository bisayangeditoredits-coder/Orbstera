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

type StoreGet = () => {
  presentation?: { id?: string; slides?: { id: string }[]; theme?: string; colorPalette?: string[] } | null;
  editor: {
    generationEpoch: number;
    isGenerating: boolean;
    plannerHandoff?: { imageSource?: 'ai' | 'unsplash' | 'none'; themeName?: string };
  };
  trackDeckGenerationImage: (work: () => Promise<void>) => void;
  updateElement: (slideId: string, elementId: string, patch: Record<string, unknown>) => void;
  setCurrentSlideIndex: (index: number) => void;
  setEditorState: (patch: Record<string, unknown>) => void;
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
 * Fire every deck image job in parallel with live progress tracking.
 * Deck slides use Leonardo AI when configured; Pollinations data-URL fallback if Leonardo fails.
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
      await new Promise((r) => setTimeout(r, 800));
      result = await fetchImageUrl(imageSource, task);
    }

    if (get().presentation?.id !== deckId) return;

    if (!result.url) {
      clearPendingImage(get, task, placeholderForTask(get, task));
      return;
    }

    const rawUrl = result.url;
    const finalSrc =
      rawUrl.startsWith('data:') ? rawUrl : await persistGeneratedImage(rawUrl, deckId);

    if (get().presentation?.id !== deckId) return;

    get().updateElement(task.slideId, task.elementId, {
      src: finalSrc,
      aiImagePending: false,
      ...(result.imageId ? { aiMetadata: { leonardoImageId: result.imageId } } : {}),
    });

    if (get().editor.isGenerating) {
      const slideIdx = get().presentation?.slides?.findIndex((s) => s.id === task.slideId) ?? -1;
      if (slideIdx >= 0) {
        get().setCurrentSlideIndex(slideIdx);
        get().setEditorState({ previewElementId: task.elementId });
      }
    }
  };

  for (const task of tasks) {
    get().trackDeckGenerationImage(() => runOne(task));
  }
}
