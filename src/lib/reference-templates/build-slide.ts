import type { Slide, SlideElement } from '@/types';
import type { ReferenceTemplateId } from './catalog';
import { applyAiContentToTemplateElements } from './apply-content';

export type ReferenceTemplatePack = {
  packId: ReferenceTemplateId;
  slides: Slide[];
};

export function buildSlideFromReferenceTemplate(args: {
  pack: ReferenceTemplatePack;
  slideIndex: number;
  ai: {
    id: string;
    type?: string;
    title?: string;
    subtitle?: string;
    bullets?: string[];
    content?: { bullets?: string[] };
  };
  uid: (prefix: string) => string;
}): { elements: SlideElement[]; imageTasks: never[] } {
  const templateSlides = args.pack.slides;
  if (templateSlides.length === 0) {
    return { elements: [], imageTasks: [] };
  }

  const templateIdx = args.slideIndex % templateSlides.length;
  const templateSlide = templateSlides[templateIdx]!;
  const mergedBullets = [
    ...(args.ai.bullets || []),
    ...(args.ai.content?.bullets || []),
  ];

  const elements = applyAiContentToTemplateElements(
    templateSlide.elements || [],
    {
      title: args.ai.title,
      subtitle: args.ai.subtitle,
      bullets: mergedBullets,
    },
    args.uid,
  );

  return { elements, imageTasks: [] };
}
