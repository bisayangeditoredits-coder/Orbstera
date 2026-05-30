/**
 * Gamma-style deck generation skill — single source of truth for AI orchestration.
 * Pipeline: Director → Spine (orders per slide) → Composer (executor).
 */

export const GAMMA_PHILOSOPHY = `
GAMMA MODE — how premium auto-decks are built:
1. DIRECTOR analyzes intent and writes explicit ORDERS for every slide (slideSpine).
2. COMPOSER is an EXECUTOR — it does NOT freestyle structure. It fills each ordered slot with JSON.
3. Every slide is a cinematic SCENE: headline + optional bullets + mandatory background imagePrompt.
4. Visual continuity: one imageryMood family, one palette story, one typography pairing across the deck, but every slide gets a unique scene, crop, and composition.
5. Headlines are punchy (3–8 words). Bullets MUST be highly detailed, informative, and comprehensive (15-30 words each). Do NOT output short fragments. Ensure the user gets all the needed details.
6. Zero generic AI slop: ban "revolutionary", "game-changing", "synergy", "leverage", "cutting-edge", lorem ipsum.
7. No cheap template look: avoid pale grey washed backgrounds, default centered title slides, repeated white cards, and same-looking slide structure.
`;

export const VISUAL_QUALITY_BAR = `
VISUAL QUALITY BAR:
- Every slide must feel like a professionally art-directed deck page, not a document converted to slides.
- Use specific layout names in slide.layout: e.g. "asymmetric editorial opener", "bento KPI grid", "cinematic media split", "executive comparison board".
- Never create a deck where most slides are grey background + centered white title + generic bullets.
- Vary scale: one large hero moment, one dense proof page, one split proof page, one data/metric page, one quiet close.
- Backgrounds should be intentional: either clean solid brand color or strong image scene. Do not add a light grey wash over the whole slide.
`;

export const SLIDE_TYPE_PLAYBOOK = `
SLIDE TYPE PLAYBOOK (pick intentionally — never default everything to "content"):
- hero: Opening hook. Big title + subtitle. Full-bleed cinematic background. Use once at start.
- split: Concept + visual proof. Title + 2–4 bullets left, hero image right. Great for features, process, story beats.
- content: Single idea with 3–5 bullets. Full-bleed subtle background. Use for frameworks, lists, explanations.
- bullets: Denser list-forward layout when 4–6 points matter.
- quote: Pull-quote or testimonial. Title = quote text, subtitle = attribution.
- stats: Numbers that prove a point. Bullets = stat lines like "87% faster onboarding". Keep ≤4.
- comparison: Contrast pairs or "Option A vs B" points.
- timeline: Chronological steps. Roadmaps, history, process.
- media: Visual-first split — product showcase.
- closing: CTA or memorable close. Title = action headline, subtitle = next step. Use once at end.

LAYOUT RHYTHM (mandatory variety):
- Never 3+ adjacent slides with the same type.
- For N slides: use at least min(N-2, 5) distinct types when N≥6.
`;

export const LAYOUT_CATEGORY_PLAYBOOK = `
LAYOUT CATEGORY PLAYBOOK (user-selected; obey as the deck's structural language):
- editorial: magazine-style asymmetry, large headlines, image/text tension, varied editorial pages.
- bento: modular card grids, nested panels, compact dashboards, grouped proof blocks.
- cinematic: full-bleed imagery, dramatic crops, minimal copy, scene-by-scene storytelling.
- corporate: executive clarity, safe grids, metrics, comparisons, readable boardroom structure.
- pitch: investor rhythm with problem, solution, market, product, traction, roadmap, ask.
- product: large product/media showcases, feature callouts, visual proof, before/after.
- data_story: KPI cards, comparisons, dashboards, insight-first evidence slides.
- timeline: roadmaps, milestones, process flows, chronological and sequence-based pages.
- minimal: sparse layouts, generous whitespace, few elements, precise hierarchy.
- luxury: refined editorial spacing, premium restraint, boutique imagery, elegant contrast.
`;

export const IMAGE_PROMPT_FORMULA = `
IMAGE PROMPT FORMULA (required on EVERY slide — FLUX renders full-bleed backgrounds):
Structure: [Subject/scene] + [lighting/mood] + [color palette alignment] + [camera/style] + [constraints]

Rules:
- 2–4 sentences per imagePrompt. Highly specific. Cinematic photography or abstract texture.
- Match the imageryMood family from the director brief, but vary subject, framing, scale, and camera distance on each slide.
- Never reuse the same scene or composition twice in a row.
- NO text, logos, watermarks in image.
- NO generic stock office scenes unless user asked corporate.
- Background-appropriate: atmospheric, bokeh, gradient mesh, macro texture.
`;

export const HEADLINE_RULES = `
HEADLINE & COPY RULES:
- title: 3–8 words, active voice, specific (not "Introduction" or "Overview").
- subtitle: optional, ≤12 words.
- bullets: 3-6 per slide, highly detailed and informative, each 15-30 words, parallel grammar. Avoid short shallow statements.
- speakerNotes: 2–4 sentences, conversational delivery cues.
- Write in the user's requested language.
`;

export const DECK_JSON_SCHEMA = `
OUTPUT: VALID RAW JSON ONLY. No markdown fences. No HTML. No preamble.

Root: title, theme, presentationType, styleMode, layoutCategory, colorPalette, fontPairing, animationStyle, defaultSlideTransition, cinematicPresenterEffects, slides[]

Each slide MUST include:
id, type, layout, title, subtitle (optional), bullets (optional), visualStyle,
imagePrompt (REQUIRED 2–4 sentences — NEVER empty),
visualDirection, backgroundStyle, slideTransition (optional), animation, speakerNotes, chart
`;

export const COMPOSER_EXECUTION_RULES = `
COMPOSER EXECUTION RULES (Gamma-style):

1. SPINE OBEDIENCE: If slideSpine exists, slides[i] MUST implement slideSpine[i]:
   type ← typeHint, title ← headlineAngle, bullets ← supportingPoints, imagePrompt ← expand imageBrief

2. IMAGE PROMPT: EVERY slide non-empty imagePrompt.

3. VARIETY: No deck where >40% slides are "content".

4. MOTION: Hero/closing → cinematicImageZoom or blurIn. Lists → staggerLines. Splits → slideRight.

5. IMAGE RHYTHM: Keep the same palette and mood family, but every slide imagePrompt must vary in subject, crop, or scene geometry.

6. OUTPUT: Start with { — no text before JSON.
`;

export const DIRECTOR_INTENT_SYSTEM = `You are the Creative Director for a Gamma-class presentation engine.

${GAMMA_PHILOSOPHY}

Output ONE raw JSON object only (no markdown):
{
  "intentSummary": "one sentence",
  "presentationType": "startup_pitch | investor_deck | business_proposal | education | product_showcase | marketing | corporate | storytelling | data_story | portfolio | other",
  "presentationCategory": "short label",
  "audienceType": "investors | executives | customers | students | conference_attendees | general_public",
  "emotionalTone": "confident | urgent | warm | analytical | inspirational",
  "needsDeepReasoning": false,
  "promptEnhancement": "Rich paragraph 800–1200 chars: sharpen story, infer context, emotional arc. Same language as user.",
  "recommendedStyle": "apple_keynote | startup_pitch | minimal_dark | corporate | futuristic | luxury | glassmorphism | bento | editorial | creative | cinematic",
  "visualMood": "Specific mood family for the slide backgrounds e.g. midnight indigo volumetric light",
  "imageryPalette": "Color/lighting keywords for FLUX e.g. deep navy, electric violet, soft bloom",
  "densityMode": "minimal | standard | rich",
  "cinematicIntensity": "low | medium | high",
  "fontSuggestion": {"heading":"Font","body":"Font"},
  "colorPaletteSuggestion": ["#bg","#text","#accent","#muted"],
  "successCriteria": ["2–5 criteria"]
}

needsDeepReasoning true ONLY for heavy technical/legal/scientific decks.`;

export const DIRECTOR_STRUCTURE_SYSTEM = `You are the Slide Architect — write explicit ORDERS for every slide (Gamma slideSpine).

${SLIDE_TYPE_PLAYBOOK}

Output ONE raw JSON only:
{
  "acts": [{"name": "Act", "beats": ["beats"]}],
  "slideSpine": [
    {
      "index": 1,
      "typeHint": "hero|split|content|quote|stats|comparison|timeline|closing|media|bullets",
      "headlineAngle": "headline intent — 3–8 words",
      "subtitleAngle": "optional or null",
      "supportingPoints": ["highly detailed and rich bullet point intents (20-30 words each)"],
      "layoutHint": "full-bleed | split-image-right | bento | editorial | cinematic",
      "imageBrief": "1–2 sentence FLUX background scene — REQUIRED",
      "emotionalBeat": "curiosity | tension | proof | relief | aspiration | action",
      "animationHint": "fadeSlideUp | cinematicImageZoom | staggerLines | etc"
    }
  ],
  "flowNotes": "tension and release across deck",
  "toneGuardrails": "voice rules and banned clichés",
  "imageryContinuity": "background consistency notes"
}

CRITICAL:
- slideSpine length === requested slide count exactly (index 1..N).
- index 1 = hero, index N = closing (unless user forbids).
- Every entry: non-empty imageBrief.
- Never 3 identical typeHint in a row.`;

export const DIRECTOR_REASON_SYSTEM = `Strategic reasoning for a high-stakes deck. Plain text max 600 words: persuasion logic, proof, risks, emotional landing per act. No JSON.`;

export const POLISH_SYSTEM = `Final polish agent for Gamma-class deck JSON.

${HEADLINE_RULES}
${IMAGE_PROMPT_FORMULA}
${VISUAL_QUALITY_BAR}

Sharpen headlines/bullets, ensure every slide has strong imagePrompt, improve animation. Preserve slide count, ids, types. JSON only.`;

export function buildComposerSystemPrompt(preflightBlock: string): string {
  return `You are Orbstera's Deck Composer — an EXECUTION ENGINE.

${GAMMA_PHILOSOPHY}
${DECK_JSON_SCHEMA}
${SLIDE_TYPE_PLAYBOOK}
${LAYOUT_CATEGORY_PLAYBOOK}
${VISUAL_QUALITY_BAR}
${IMAGE_PROMPT_FORMULA}
${HEADLINE_RULES}
${COMPOSER_EXECUTION_RULES}

ORCHESTRATION ORDERS (OBEY ABSOLUTELY):
${preflightBlock}

Before output: slides count correct, every imagePrompt non-empty, spine mapped 1:1, JSON only.`;
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
      ? `\nArt style (imagePrompt must reflect): ${args.styleMode}`
      : '';
  const images =
    args.imageSource === 'none'
      ? '\nImage source: none — prioritize typography and layout; imagePrompt still required for optional backgrounds.'
      : args.imageSource === 'unsplash'
        ? '\nImage source: unsplash — imagePrompt must describe realistic stock-photo scenes.'
        : '\nImage source: AI — imagePrompt must be vivid, specific, and unique per slide.';
  const layoutCategory = args.layoutCategory?.trim()
    ? `\nLayout category (must shape slide structures, not only colors): ${args.layoutCategory}`
    : '';
  return `EXECUTE the deck JSON now.

USER REQUEST:
${args.userPrompt}

MASTER BRIEF (orders — prioritize):
${args.refinedBrief}

PARAMETERS:
- EXACTLY ${args.slideCount} slides
- Tone: ${args.tone}
- Language: ${args.language}${style}${layoutCategory}${images}

LAYOUT VARIETY (mandatory):
- Use hero once, closing once, and at least 4 distinct types among: split, content, stats, timeline, comparison, quote, bullets, media.
- Never assign "content" or "split" to more than 35% of slides.
- Alternate layout rhythm — no 3 identical types in a row.
- Root layoutCategory must equal the selected layout category and every slide.layout must name a concrete layout pattern from that category.
- Hard visual ban: no pale grey full-slide overlays, no repeated generic background cards, no default centered-title templates except a deliberate hero/closing.

For each slide i (1..${args.slideCount}):
1. Implement slideSpine[i]: typeHint, headlineAngle, supportingPoints, imageBrief
2. title = headlineAngle (3–8 words)
3. imagePrompt = expand imageBrief + visualMood family + a distinct composition choice for that slide (2–4 sentences)
4. Never empty imagePrompt

Return ONLY the deck JSON. No markdown. No preamble.`;
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

const TYPE_RECIPES: Record<string, string[]> = {
  hero: [
    'wide establishing shot with generous negative space and a single dominant focal subject',
    'low-angle hero composition with strong leading lines and an editorial sense of scale',
    'cinematic portrait framing with layered foreground and background separation',
    'monumental wide shot with quiet atmosphere and one clear visual anchor',
  ],
  split: [
    'editorial split composition with the subject on one side and contextual environment on the other',
    'balanced two-zone layout with a clean text-safe area and a distinct visual proof element',
    'off-center framing that leaves breathing room for copy while keeping the scene grounded',
  ],
  content: [
    'clean editorial scene with one clear subject and a restrained supporting background',
    'quiet concept image with tactile detail and a strong negative-space layout',
    'structured visual metaphor with depth, but no clutter or crowded surfaces',
  ],
  bullets: [
    'organized workspace-style scene with multiple subtle focal points and clear hierarchy',
    'layered concept board composition with enough detail to support multiple bullet ideas',
    'calm, readable scene with a strong center and secondary supporting elements',
  ],
  quote: [
    'intimate portrait or stage-lit scene with soft depth of field and emotional restraint',
    'quiet spotlight composition with a single human or symbolic subject',
    'minimal, reflective image with premium editorial mood and a strong center',
  ],
  stats: [
    'abstract data sculpture with luminous metrics and a crisp, analytical feel',
    'dashboard-inspired scene with geometric structure and one dominant number shape',
    'clean information-rich composition with clear metric emphasis and subtle motion',
  ],
  comparison: [
    'clear left-right contrast with two distinct materials, scenes, or lighting conditions',
    'dual-path composition showing opposing ideas in one cohesive frame',
    'balanced side-by-side visual contrast with a sharp divide and editorial polish',
  ],
  timeline: [
    'progression scene with a clear directional path from foreground to background',
    'linear or diagonal journey composition that visually suggests sequence and momentum',
    'layered process image with depth cues that read like a structured roadmap',
  ],
  media: [
    'product-first showcase with studio lighting and premium presentation framing',
    'visual proof composition centered on the object, screen, or subject with clean margins',
    'hero product scene with strong material detail and a polished showcase feel',
  ],
  closing: [
    'resolving wide shot with optimistic light and a strong call-to-action space',
    'open horizon composition with calm confidence and a memorable final focal point',
    'concluding editorial scene that feels clean, premium, and forward-looking',
  ],
  default: [
    'premium editorial scene with one dominant subject and one supporting visual cue',
    'cinematic concept image with clear hierarchy and generous text-safe spacing',
    'clean atmospheric composition with depth, texture, and restrained motion',
  ],
};

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizePhrase(value?: string): string {
  return (value || '').trim().replace(/\s+/g, ' ').replace(/[.?!]+$/g, '');
}

function chooseRecipe(kind: string, seed: string): string {
  const recipes = TYPE_RECIPES[kind] || TYPE_RECIPES.default;
  const index = recipes.length > 0 ? stableHash(seed) % recipes.length : 0;
  return recipes[index] || TYPE_RECIPES.default[0];
}

function normalizeRecipeKind(raw: string): string {
  const kind = raw.toLowerCase();
  if (kind.includes('hero') || kind.includes('cinematic') || kind.includes('banner')) return 'hero';
  if (kind.includes('split')) return 'split';
  if (kind.includes('quote') || kind.includes('testimonial')) return 'quote';
  if (kind.includes('stat') || kind.includes('metric') || kind.includes('data')) return 'stats';
  if (kind.includes('timeline') || kind.includes('roadmap') || kind.includes('sequence')) return 'timeline';
  if (kind.includes('comparison') || kind.includes('contrast') || kind.includes('vs')) return 'comparison';
  if (kind.includes('media') || kind.includes('product') || kind.includes('showcase')) return 'media';
  if (kind.includes('bullet') || kind.includes('list')) return 'bullets';
  if (kind.includes('close') || kind.includes('cta') || kind.includes('ending')) return 'closing';
  if (kind.includes('editorial') || kind.includes('bento') || kind.includes('content') || kind.includes('full-bleed')) {
    return 'content';
  }
  return kind || 'default';
}

export function buildDeckImagePrompt(args: DeckImagePromptContext): string {
  const title = normalizePhrase(args.title);
  const topic = title || normalizePhrase(args.presentationType) || normalizePhrase(args.type) || 'presentation theme';
  const mood = normalizePhrase(args.visualMood) || 'cinematic atmospheric';
  const palette = normalizePhrase(args.imageryPalette) || 'deep dark elegant tones';
  const kind = normalizePhrase(args.layoutHint || args.type) || 'content';
  const category = normalizePhrase(args.layoutCategory);
  const basePrompt = normalizePhrase(args.basePrompt);
  const slideSeed = `${args.slideIndex ?? 'x'}:${args.slideCount ?? 'x'}:${category}:${kind}:${topic}`;
  const recipeKind = normalizeRecipeKind(kind);
  const recipe = chooseRecipe(recipeKind, slideSeed);
  const sceneKind = recipeKind === 'default' ? kind : recipeKind;
  const scene =
    basePrompt ||
    `${mood} ${sceneKind} image about "${topic}"`;
  const continuity =
    typeof args.slideCount === 'number' && args.slideCount > 1
      ? 'Keep this visually distinct from the other slides in the deck.'
      : 'Keep this visually distinct and non-generic.';
  const categoryLine = category ? `Layout family: ${category}; make the image composition support that layout language. ` : '';
  return `${scene}. Composition: ${recipe}. ${categoryLine}Color and lighting: ${palette}. ${continuity} Full-bleed 16:9, no text, no logos, no watermark.`;
}

export function buildFallbackImagePrompt(args: DeckImagePromptContext): string {
  return buildDeckImagePrompt(args);
}
