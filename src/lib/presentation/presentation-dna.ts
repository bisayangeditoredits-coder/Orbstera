/**
 * Presentation DNA — cohesive typography, motion, spacing, and visual tone
 * selected automatically from category + emotional tone (Presentation Director).
 */

export type PresentationDnaId =
  | 'tech_startup'
  | 'corporate_premium'
  | 'creative_agency'
  | 'education_clear'
  | 'marketing_cinematic'
  | 'data_story';

export interface PresentationDnaProfile {
  id: PresentationDnaId;
  typographyNotes: string;
  motionNotes: string;
  spacingNotes: string;
  visualTone: string;
  defaultAnimationStyle: string;
  defaultSlideTransitionHint: string;
  cinematicPresenterEffectsDefault: boolean;
}

export const PRESENTATION_DNA_PROFILES: Record<PresentationDnaId, PresentationDnaProfile> = {
  tech_startup: {
    id: 'tech_startup',
    typographyNotes: 'Bold geometric sans headings; crisp body; tight letter-spacing on titles.',
    motionNotes: 'Keynote-style transitions; cinematic fades; staggered reveals — no gimmicks.',
    spacingNotes: 'Confident negative space; asymmetric balance on hero slides.',
    visualTone: 'Dark or high-contrast base; subtle gradients; futuristic clarity.',
    defaultAnimationStyle: 'cinematic-reveal',
    defaultSlideTransitionHint: 'keynote | blurReveal | horizontalCinematic',
    cinematicPresenterEffectsDefault: true,
  },
  corporate_premium: {
    id: 'corporate_premium',
    typographyNotes: 'Refined sans or restrained serif accents for titles; generous line-height.',
    motionNotes: 'Subtle crossDissolve and fade; restrained scale; no bounce or glitch.',
    spacingNotes: 'Editorial whitespace; grid-aligned content; calm hierarchy.',
    visualTone: 'Minimal ornament; trustworthy palette; understated imagery.',
    defaultAnimationStyle: 'minimal-fade',
    defaultSlideTransitionHint: 'crossDissolve | fade | smoothSlide',
    cinematicPresenterEffectsDefault: false,
  },
  creative_agency: {
    id: 'creative_agency',
    typographyNotes: 'Expressive headings with disciplined body copy — still readable.',
    motionNotes: 'Parallax and layerReveal sparingly; energetic but not chaotic.',
    spacingNotes: 'Dynamic grids with clear focal points; avoid crowding.',
    visualTone: 'Bold color accents; hero visuals on pivot beats only.',
    defaultAnimationStyle: 'kinetic',
    defaultSlideTransitionHint: 'parallaxFlow | glassSwipe | horizontalCinematic',
    cinematicPresenterEffectsDefault: true,
  },
  education_clear: {
    id: 'education_clear',
    typographyNotes: 'Large readable body; clear heading stepped hierarchy.',
    motionNotes: 'Simple fades and staggerLines; slower pacing for comprehension.',
    spacingNotes: 'Predictable vertical rhythm; fewer elements per slide.',
    visualTone: 'Diagrams and structure over decorative photography.',
    defaultAnimationStyle: 'minimal-fade',
    defaultSlideTransitionHint: 'fade | smoothSlide | verticalFlow',
    cinematicPresenterEffectsDefault: false,
  },
  marketing_cinematic: {
    id: 'marketing_cinematic',
    typographyNotes: 'High-impact titles; short supporting lines; tight messaging.',
    motionNotes: 'Cinematic reveals and depth; hero moments separated by calm slides.',
    spacingNotes: 'Alternating dense campaign beats with breathing-room slides.',
    visualTone: 'Full-bleed hero imagery on hooks and pivots; polish elsewhere.',
    defaultAnimationStyle: 'cinematic-reveal',
    defaultSlideTransitionHint: 'keynote | blurReveal | depth',
    cinematicPresenterEffectsDefault: true,
  },
  data_story: {
    id: 'data_story',
    typographyNotes: 'Numeric clarity; tabular hierarchy; labels readable at a glance.',
    motionNotes: 'depthRise for charts; minimal slide transitions.',
    spacingNotes: 'Chart-forward layouts; avoid competing visuals.',
    visualTone: 'Icons and charts over stock scenes.',
    defaultAnimationStyle: 'minimal-fade',
    defaultSlideTransitionHint: 'depth | fade | smoothSlide',
    cinematicPresenterEffectsDefault: false,
  },
};

/** Infer DNA from orchestration strings (best-effort; Director step sets explicitly when possible). */
export function inferPresentationDnaId(args: {
  presentationType?: string;
  emotionalTone?: string;
  presentationCategory?: string;
}): PresentationDnaId {
  const p = `${args.presentationType || ''} ${args.presentationCategory || ''}`.toLowerCase();
  const t = `${args.emotionalTone || ''}`.toLowerCase();

  if (p.includes('education') || p.includes('classroom') || p.includes('training'))
    return 'education_clear';
  if (p.includes('data') || p.includes('analytics') || p.includes('kpi'))
    return 'data_story';
  if (p.includes('marketing') || p.includes('campaign') || p.includes('brand'))
    return 'marketing_cinematic';
  if (
    p.includes('corporate') ||
    p.includes('board') ||
    p.includes('executive') ||
    p.includes('proposal')
  )
    return 'corporate_premium';
  if (
    p.includes('agency') ||
    p.includes('portfolio') ||
    p.includes('creative') ||
    t.includes('playful')
  )
    return 'creative_agency';
  if (p.includes('startup') || p.includes('investor') || p.includes('pitch') || p.includes('futuristic'))
    return 'tech_startup';
  return 'tech_startup';
}
