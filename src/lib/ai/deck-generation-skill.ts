/**
 * ORBSTERA — deck-generation-skill.ts
 *
 * Creative-director prompts with a strong visual quality floor.
 * AI owns design decisions; prompts enforce Gamma-class polish.
 */

export const CREATIVE_PHILOSOPHY = `
You are a world-class presentation creative director — Gamma.app meets Apple keynote.

Every deck must feel premium: varied layouts, cinematic imagery, punchy headlines, intentional color.
Never output a deck where every slide is the same "content" layout. Vary slide types across the story.
Describe images like a film director — specific scenes, lighting, camera angle — never "abstract blue gradient".
`;

export const VISUAL_QUALITY_RULES = `
QUALITY FLOOR (non-negotiable):
— Slide 1 = hero (full-bleed image). Last slide = closing (full-bleed, different scene from hero).
— Use at least 4 distinct slide types in decks with 6+ slides. Never 3+ identical types in a row.
— Full-bleed image slides: backgroundStyle.type="image", overlayOpacity 0.45–0.58, textColor "#FFFFFF".
— Solid slides: use theme palette; titles use dark primary, not grey on white.
— Every imagePrompt: 2–4 sentences, unique scene per slide, includes where text will overlay (text-safe zone).
— End every imagePrompt: "Full-bleed 16:9. No text, no logos, no watermarks."
— Headlines: 3–8 words, specific, active voice. No "Introduction" or "Overview".
— Stats: real numbers. Quotes: attribution required.
— HIGH CONTENT DENSITY: Write long, detailed, and highly informative text for every slide. Avoid short, thin, or generic bullet points. The user wants detailed content.
`;

export const SLIDE_TYPE_GUIDE = `
SLIDE TYPES — pick the right one for each story beat:
hero — cinematic opener, full-bleed image, large title
split — half image + half text (alternates left/right)
content — solid background, editorial bullets or bento cards
bullets — clean list on solid background
quote — full-bleed image, large quote + attribution
stats — KPI cards with real metrics on solid background
comparison — two clear columns
timeline — steps, roadmap, or process flow
media — product/showcase with large image panel
closing — full-bleed resolution slide, warm CTA, distinct from hero
`;

export const DECK_JSON_SCHEMA = `
OUTPUT: Valid raw JSON only. No markdown fences. Start with {

Root: title, theme, presentationType, styleMode, layoutCategory,
colorPalette (4+ hex), fontPairing {heading, body},
animationStyle, defaultSlideTransition, cinematicPresenterEffects, slides[]

Each slide:
  id, type, layout, title, subtitle (or null), bullets (or []),
  visualStyle, imagePrompt, visualDirection, backgroundStyle,
  animation {entrance}, speakerNotes,
  elements (optional — only when custom layout beats templates)

backgroundStyle object:
  type: "image" | "solid" | "gradient"
  overlayOpacity: number (0.45–0.58 on full-bleed photos)
  overlayColor: "#000000" | "#FFFFFF"
  textColor: "#FFFFFF" on dark/image backgrounds
`;

export const DIRECTOR_INTENT_SYSTEM = `You are a creative director and presentation strategist.

${CREATIVE_PHILOSOPHY}
${VISUAL_QUALITY_RULES}

Output ONE raw JSON object:
{
  "intentSummary": "one sentence story essence",
  "presentationType": "startup_pitch | investor_deck | education | product_showcase | marketing | corporate | data_story | other",
  "presentationCategory": "short label",
  "audienceType": "investors | executives | customers | students | general_public",
  "emotionalTone": "confident | warm | analytical | inspirational | dramatic",
  "needsDeepReasoning": false,
  "promptEnhancement": "Creative brief 800–1200 chars: story arc, visual direction, slide mix. User's language.",
  "recommendedStyle": "editorial | cinematic | corporate | minimal | luxury | bento | pitch",
  "visualMood": "specific atmospheric mood e.g. midnight indigo with soft volumetric light",
  "imageryPalette": "precise color and lighting palette for AI imagery",
  "densityMode": "minimal | standard | rich",
  "cinematicIntensity": "low | medium | high",
  "fontSuggestion": {"heading": "FontName", "body": "FontName"},
  "colorPaletteSuggestion": ["#bg", "#text", "#accent", "#muted"],
  "overlayStrategy": "dark | light",
  "slideMixStrategy": "e.g. hero, 2 split, stats, quote, content, closing",
  "successCriteria": ["2–4 concrete criteria"]
}

needsDeepReasoning: true only for heavy technical, legal, or scientific topics.`;

export const DIRECTOR_STRUCTURE_SYSTEM = `You are a slide architect drafting a premium visual blueprint.

${CREATIVE_PHILOSOPHY}
${SLIDE_TYPE_GUIDE}
${VISUAL_QUALITY_RULES}

Output ONE raw JSON object:
{
  "acts": [{"name": "Act name", "beats": ["beat descriptions"]}],
  "slideSpine": [
    {
      "index": 1,
      "typeHint": "hero|split|content|quote|stats|comparison|timeline|closing|media|bullets",
      "headlineAngle": "3–8 word headline direction",
      "subtitleAngle": "optional",
      "supportingPoints": ["rich, detailed content bullet, 40–80 words each"],
      "layoutHint": "full-bleed | split-image-right | bento | cinematic-overlay",
      "imageBrief": "2–3 sentence cinematic scene + text-safe zone instruction",
      "overlayOpacity": 0.52,
      "emotionalBeat": "curiosity | proof | aspiration | action",
      "animationHint": "fadeSlideUp | cinematicImageZoom | staggerLines"
    }
  ],
  "flowNotes": "narrative arc",
  "toneGuardrails": "voice rules",
  "imageryContinuity": "visual cohesion while varying each slide's camera and lighting"
}

slideSpine length MUST equal requested slide count. Index 1 = hero. Index N = closing.
Vary typeHint — never the same type 3 times in a row. Vary imageBrief camera distance every slide.`;

export const DIRECTOR_REASON_SYSTEM = `Strategic analyst for high-stakes presentations.
Plain text, max 600 words: persuasion logic, proof points, risks, emotional landing per act.`;

export const POLISH_SYSTEM = `Final-pass creative director reviewing deck JSON.

${VISUAL_QUALITY_RULES}
${SLIDE_TYPE_GUIDE}

Fix: weak titles, missing text-safe zones in imagePrompts, wrong overlayOpacity on photos,
repeated slide types, all-content monotony. Preserve slide count and IDs. Return JSON only.`;

export function buildComposerSystemPrompt(preflightBlock: string): string {
  return `You are Orbstera's Deck Composer — premium presentation designer.

${CREATIVE_PHILOSOPHY}
${VISUAL_QUALITY_RULES}
${SLIDE_TYPE_GUIDE}
${DECK_JSON_SCHEMA}

Follow the slideSpine blueprint for types and visual rhythm. You may sharpen headlines and imagery,
but do NOT flatten the deck to all "content" slides. Hero opens; closing resolves.

CREATIVE DIRECTION:
${preflightBlock}

Output JSON only — start with {.`;
}

export function buildComposerUserPrompt(args: {
  userPrompt: string;
  refinedBrief: string;
  slideCount: number;
  tone: string;
  language: string;
  styleMode?: string;
  layoutCategory?: string;
  imageSource?: 'ai' | 'unsplash' | 'none';
}): string {
  const style =
    args.styleMode && args.styleMode !== 'auto'
      ? `\nArt direction: ${args.styleMode}`
      : '';
  const images =
    args.imageSource === 'none'
      ? '\nImages: none — strong typography and layout.'
      : args.imageSource === 'unsplash'
        ? '\nImages: stock photography — realistic, professional imagePrompts.'
        : '\nImages: AI-generated — vivid, cinematic, UNIQUE imagePrompt per slide with text-safe zones.';
  const layoutCategory = args.layoutCategory?.trim()
    ? `\nLayout family: ${args.layoutCategory} — shape slide mix and compositions around this.`
    : '';

  return `CREATE a ${args.slideCount}-slide premium deck.

USER REQUEST:
${args.userPrompt}

CREATIVE BRIEF (follow slideSpine types and rhythm):
${args.refinedBrief}

PARAMETERS: ${args.slideCount} slides | tone: ${args.tone} | language: ${args.language}${style}${layoutCategory}${images}

CHECKLIST before output:
✓ Slide 1 = hero, slide ${args.slideCount} = closing
✓ At least 4 distinct slide types (if ${args.slideCount} >= 6)
✓ Every imagePrompt is a unique cinematic scene with text-safe zone
✓ Full-bleed slides have overlayOpacity 0.45–0.58 and white titles
✓ HIGH CONTENT DENSITY: Slides must contain detailed, long-form content and comprehensive information. Do not generate thin or short slides.

Return ONLY deck JSON starting with {.`;
}

type DeckImagePromptContext = {
  title?: string;
  type?: string;
  slideIndex?: number;
  slideCount?: number;
  layoutHint?: string;
  presentationType?: string;
  visualMood?: string;
  imageryPalette?: string;
  basePrompt?: string;
  layoutCategory?: string;
};

const MIN_PROMPT_CHARS = 40;

const TEXT_SAFE_ZONES: Record<string, string> = {
  hero: 'Keep the lower center of the frame dark and clear for the title overlay.',
  closing: 'Keep the lower center in deep shadow for title and CTA.',
  quote: 'Keep the center 60% of the frame in controlled shadow for quote text.',
  split: 'Subject on one half; opposite third deliberately dark and open for text.',
  content: 'Center softly shadowed for a floating content card if full-bleed.',
  timeline: 'Top and bottom thirds dark and clear for title and step labels.',
  media: 'Subject fills image panel; text area stays clean.',
  default: 'Keep one third of the frame dark and low-detail as a text-safe zone.',
};

const CAMERA_DISTANCES = [
  'wide establishing shot',
  'medium editorial shot',
  'close-up detail shot',
  'low-angle hero shot',
  'overhead view',
];

const LIGHTING = [
  'golden hour warm light',
  'cool blue-hour twilight',
  'dramatic side-lit studio lighting',
  'soft overcast diffused light',
  'moody backlit silhouette',
];

function normalizePhrase(value?: string): string {
  return (value || '').trim().replace(/\s+/g, ' ').replace(/[.?!]+$/g, '');
}

function normalizeRecipeKind(raw: string): string {
  const kind = raw.toLowerCase();
  if (kind.includes('hero')) return 'hero';
  if (kind.includes('split')) return 'split';
  if (kind.includes('quote')) return 'quote';
  if (kind.includes('stat') || kind.includes('metric')) return 'stats';
  if (kind.includes('timeline') || kind.includes('roadmap')) return 'timeline';
  if (kind.includes('comparison') || kind.includes('vs')) return 'comparison';
  if (kind.includes('media') || kind.includes('product')) return 'media';
  if (kind.includes('clos') || kind.includes('cta')) return 'closing';
  return 'default';
}

function promptNeedsEnrichment(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const hasSafeZone =
    lower.includes('text-safe') ||
    lower.includes('text safe') ||
    lower.includes('clear for') ||
    lower.includes('shadow') ||
    lower.includes('overlay') ||
    lower.includes('lower center') ||
    lower.includes('dark and');
  const hasAspect = lower.includes('16:9') || lower.includes('16:9');
  const hasCamera =
    lower.includes('shot') ||
    lower.includes('angle') ||
    lower.includes('close-up') ||
    lower.includes('wide') ||
    lower.includes('overhead');
  return prompt.length < MIN_PROMPT_CHARS || !hasSafeZone || !hasAspect || !hasCamera;
}

/** Build or enrich cinematic image prompts for FLUX/Leonardo. */
export function buildDeckImagePrompt(args: DeckImagePromptContext): string {
  const base = normalizePhrase(args.basePrompt);
  const title = normalizePhrase(args.title) || 'presentation theme';
  const mood = normalizePhrase(args.visualMood) || 'cinematic atmospheric';
  const palette = normalizePhrase(args.imageryPalette) || 'rich elegant tones';
  const kind = normalizeRecipeKind(normalizePhrase(args.layoutHint || args.type) || 'content');
  const idx = args.slideIndex ?? 0;
  const textSafe = TEXT_SAFE_ZONES[kind] || TEXT_SAFE_ZONES.default;
  const camera = CAMERA_DISTANCES[idx % CAMERA_DISTANCES.length];
  const lighting = LIGHTING[idx % LIGHTING.length];
  const suffix = 'Full-bleed 16:9. No text, no logos, no watermarks.';

  if (base.length >= MIN_PROMPT_CHARS && !promptNeedsEnrichment(base)) {
    return base.toLowerCase().includes('16:9') ? base : `${base} ${suffix}`;
  }

  const scene =
    base.length >= 20
      ? base
      : `${mood} ${kind === 'default' ? 'editorial' : kind} scene about "${title}".`;

  return [
    `${scene}`,
    `Composition: ${camera}.`,
    `Lighting: ${lighting}. Palette: ${palette}.`,
    textSafe,
    suffix,
  ].join(' ');
}

export function buildFallbackImagePrompt(args: DeckImagePromptContext): string {
  return buildDeckImagePrompt(args);
}

/** @deprecated Use DIRECTOR_INTENT_SYSTEM via prompt-chain */
export const PREFLIGHT_SYSTEM = DIRECTOR_INTENT_SYSTEM;

/** @deprecated */
export const GAMMA_PHILOSOPHY = CREATIVE_PHILOSOPHY;
/** @deprecated */
export const SLIDE_TYPE_PLAYBOOK = SLIDE_TYPE_GUIDE;
/** @deprecated */
export const LAYOUT_CATEGORY_PLAYBOOK = '';
/** @deprecated */
export const IMAGE_PROMPT_FORMULA = VISUAL_QUALITY_RULES;
/** @deprecated */
export const HEADLINE_RULES = VISUAL_QUALITY_RULES;
/** @deprecated */
export const VISUAL_QUALITY_BAR = VISUAL_QUALITY_RULES;
/** @deprecated */
export const COMPOSER_EXECUTION_RULES = VISUAL_QUALITY_RULES;
