import type { IntelligenceTier } from './models';

/** Strict structured deck schema — NEVER HTML; frontend renders everything. */
export const DECK_JSON_RULES = `
OUTPUT: VALID RAW JSON ONLY. No markdown fences, no HTML, no explanations.

Root object MUST match:
{
  "title": "Deck title",
  "theme": "glass-dark | industrial-minimal | tech-luxury | apple-keynote | editorial-magazine | startup-pitch | cinematic",
  "presentationType": "startup_pitch | investor_deck | business_proposal | education | product_showcase | marketing | corporate | storytelling | futuristic | timeline | portfolio | data_story",
  "styleMode": "apple_keynote | startup_pitch | minimal_dark | corporate | futuristic | luxury | glassmorphism | bento | editorial | creative | cinematic",
  "colorPalette": ["#Background","#PrimaryText","#Accent","#SecondaryText"],
  "fontPairing": {"heading":"Font Name","body":"Font Name"},
  "animationStyle": "cinematic-reveal | minimal-fade | kinetic",
  "defaultSlideTransition": "optional: fade | smoothSlide | zoom | blurReveal | parallaxFlow | morph | crossDissolve | glassSwipe | depth | dynamicScale | verticalFlow | horizontalCinematic | layerReveal | floating | keynote",
  "cinematicPresenterEffects": true,
  "slides": [ ... ]
}

Each slide:
{
  "id": "unique-id",
  "type": "hero | split | media | quote | chart | stats | timeline | bullets | comparison | closing",
  "layout": "full-bleed | split-image-left | split-image-right | bento | timeline | minimal | cinematic | keynote-title | magazine",
  "title": "Short powerful headline",
  "subtitle": "Optional supporting line",
  "bullets": ["max 5 concise points unless stats slide"],
  "content": { "bullets": ["optional nested — merged with bullets"] },
  "visualStyle": "cinematic | glass | minimal | editorial",
  "imagePrompt": "Detailed cinematic prompt for image models — mood-aligned",
  "visualDirection": "composition notes",
  "backgroundStyle": "mesh-gradient | frosted-glass | radial-glow | pure-dark",
  "slideTransition": "optional per-slide; same vocabulary as defaultSlideTransition",
  "animation": {"entrance":"fadeSlideUp|fadeSlideLeft|slideRight|zoomIn|reveal|blurIn|parallaxDrift|verticalRise|glassBlur|depthRise|typewriterWords|staggerLines|cinematicImageZoom","duration":800},
  "speakerNotes": "Delivery notes",
  "chart": null
}

RULES:
- Never repeat the same layout 3 times in a row.
- Keep bullets ≤5 per slide; prefer whitespace over clutter.
- imagePrompt must stay on-brand across slides (consistent lighting/mood).
- Vary slide types for narrative rhythm (hook → tension → proof → vision → close).
`;

export function buildComposerSystemPrompt(
  tier: IntelligenceTier,
  preflightBlock: string
): string {
  const tierHint =
    tier === 'elite'
      ? 'You are in ELITE mode: investor-stage prose, zero generic filler, museum-grade hierarchy.'
      : tier === 'fast'
        ? 'You are in FAST mode: crisp structure, high signal, rapid scan-friendly slides.'
        : 'You are in STANDARD mode: professional, cinematic, still premium — no clichés.';

  return `You are Orbstera's Principal Presentation Architect — world-class narrative, typography rhythm, and spatial hierarchy.

${tierHint}

${DECK_JSON_RULES}

ORCHESTRATION CONTEXT (from multi-model pre-analysis — MUST inform themes, arc, and layouts):
${preflightBlock}

Remember: JSON ONLY. Slides must feel handcrafted, not template-stuffed.`;
}

export const PREFLIGHT_SYSTEM = `You are a strategic analyst. Output ONE raw JSON object only.

Schema:
{
  "presentationType": "startup_pitch | investor_deck | business_proposal | education | product_showcase | marketing | corporate | storytelling | futuristic | timeline | portfolio | data_story",
  "detectedIntent": "one sentence",
  "recommendedStyle": "apple_keynote | startup_pitch | minimal_dark | corporate | futuristic | luxury | glassmorphism | bento | editorial | creative | cinematic",
  "narrativeArc": ["act labels e.g. Hook", "Problem", ...],
  "outline": [{"segment":"section name","slideIdeas":["idea 1","idea 2"]}],
  "visualRules": {
    "density": "sparse | balanced | rich",
    "maxBulletsPerSlide": 4,
    "imageryMood": "short phrase for consistent AI imagery"
  }
}

No markdown. No HTML. JSON only.`;
