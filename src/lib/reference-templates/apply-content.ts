import type { SlideElement } from '@/types';

export type AiSlideContent = {
  title?: string;
  subtitle?: string;
  bullets?: string[];
};

function sortedTextTargets(elements: SlideElement[]): SlideElement[] {
  return elements
    .filter((e) => e.type === 'text' && e.visible !== false)
    .sort((a, b) => {
      const yDiff = (a.y ?? 0) - (b.y ?? 0);
      if (Math.abs(yDiff) > 36) return yDiff;
      const areaA = (a.width ?? 0) * (a.height ?? 0);
      const areaB = (b.width ?? 0) * (b.height ?? 0);
      return areaB - areaA;
    });
}

/** Replace template placeholder text with AI copy while keeping layout/images intact. */
export function applyAiContentToTemplateElements(
  templateElements: SlideElement[],
  ai: AiSlideContent,
  uid: (prefix: string) => string,
): SlideElement[] {
  const elements = templateElements.map((el) => ({
    ...el,
    id: uid(`el-${el.type}`),
    aiImagePending: false,
  }));

  const lines: string[] = [];
  if (ai.title?.trim()) lines.push(ai.title.trim());
  if (ai.subtitle?.trim()) lines.push(ai.subtitle.trim());
  for (const b of ai.bullets || []) {
    const t = String(b || '').replace(/^•\s*/, '').trim();
    if (t) lines.push(t);
  }

  const textTargets = sortedTextTargets(elements);
  for (let i = 0; i < textTargets.length && i < lines.length; i++) {
    const targetId = textTargets[i]!.id;
    const idx = elements.findIndex((e) => e.id === targetId);
    if (idx >= 0) {
      elements[idx] = { ...elements[idx], content: lines[i] };
    }
  }

  // Preserve embedded template images — never queue Leonardo for these
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]!;
    if (el.type === 'image' && el.src?.trim()) {
      elements[i] = { ...el, aiImagePending: false };
    }
  }

  return elements;
}
