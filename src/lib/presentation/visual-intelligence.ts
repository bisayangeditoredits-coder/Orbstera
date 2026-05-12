import type { PresentationData, Slide } from '@/types';
import { inferPresentationDnaId } from '@/lib/presentation/presentation-dna';

export interface VisualIntelContext {
  marketingHeavy: boolean;
  educationHeavy: boolean;
  dataHeavy: boolean;
  minimalCorporate: boolean;
}

function buildContext(data: PresentationData): VisualIntelContext {
  const blob = `${data.presentationType || ''} ${data.styleMode || ''} ${data.intentSummary || ''}`.toLowerCase();
  return {
    marketingHeavy:
      blob.includes('marketing') ||
      blob.includes('campaign') ||
      blob.includes('brand') ||
      blob.includes('showcase'),
    educationHeavy: blob.includes('education') || blob.includes('training') || blob.includes('classroom'),
    dataHeavy:
      blob.includes('data') ||
      blob.includes('analytics') ||
      blob.includes('kpi') ||
      blob.includes('quarterly') ||
      blob.includes('metrics'),
    minimalCorporate:
      blob.includes('corporate') ||
      blob.includes('board') ||
      blob.includes('minimal') ||
      blob.includes('proposal'),
  };
}

/** Whether this slide should consume AI image credits — charts/education/data prefer structure over imagery. */
export function slideShouldGenerateAiImage(
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  ctx: VisualIntelContext,
): boolean {
  const archetype = slide.archetype?.toLowerCase() || '';
  if (archetype.includes('quote') || archetype === 'quote') return false;
  if (archetype.includes('vision')) return true;

  if (slide.chart != null) return false;

  switch (slide.type) {
    case 'chart':
    case 'stats':
      return false;
    case 'comparison':
    case 'timeline':
      if (ctx.educationHeavy || ctx.dataHeavy) return slideIndex % 3 === 0;
      return slideIndex % 2 === 0;
    case 'quote':
      return false;
    case 'hero':
      return true;
    case 'closing':
      if (ctx.minimalCorporate || ctx.educationHeavy) return false;
      return slideIndex === totalSlides - 1 && (ctx.marketingHeavy || totalSlides <= 8);
    case 'team':
      return true;
    case 'media':
      return true;
    case 'split':
      if (ctx.educationHeavy && !ctx.marketingHeavy) return slideIndex % 4 === 1;
      if (ctx.dataHeavy) return slideIndex % 3 === 1;
      return true;
    case 'content':
    case 'bullets':
      if (ctx.marketingHeavy && (slideIndex === 1 || slideIndex === Math.floor(totalSlides / 2)))
        return true;
      return false;
    default:
      return false;
  }
}

/** Clear imagePrompt where imagery would be low ROI — reduces cost and clutter. */
export function applyVisualIntelligenceToPresentation(data: PresentationData): PresentationData {
  const ctx = buildContext(data);
  const dna = inferPresentationDnaId({
    presentationType: data.presentationType,
    emotionalTone: undefined,
    presentationCategory: data.styleMode,
  });

  const slides = data.slides.map((slide, i) => {
    let next = slide;
    if (!slideShouldGenerateAiImage(slide, i, data.slides.length, ctx)) {
      next = { ...slide, imagePrompt: undefined };
    }
    if (dna === 'education_clear' && (slide.type === 'content' || slide.type === 'bullets')) {
      next = { ...next, imagePrompt: undefined };
    }
    if (dna === 'data_story' && slide.type !== 'hero' && slide.type !== 'team') {
      next = { ...next, imagePrompt: undefined };
    }
    return next;
  });

  return { ...data, slides };
}
