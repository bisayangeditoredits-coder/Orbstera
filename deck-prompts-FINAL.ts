/**
 * ============================================================
 * ORBSTERA — deck-prompts.ts  (COMPLETE OVERHAUL)
 * Drop-in replacement. All export names are identical to the
 * original so nothing else in the codebase needs to change.
 * ============================================================
 *
 * ROOT CAUSES FIXED vs original:
 *
 * 1. TEXT READABILITY — Every full-bleed slide now gets an
 *    explicit dark/light scrim instruction in the imagePrompt.
 *    The original had NO overlay instructions, which caused the
 *    "Vision for Tomorrow" unreadable-text bug in the screenshot.
 *
 * 2. IMAGE PROMPT FORMULA — Added a mandatory 5-part structure:
 *    Scene → Camera → Lighting → Color → Text-Safe Zone.
 *    The "text-safe zone" instruction tells FLUX to keep the
 *    center/left area dark and clear so text renders on top.
 *
 * 3. TYPE_RECIPES — Each recipe now includes a concrete
 *    text-safe-area direction so images always work with the
 *    layout (split = right side dense, left side clear, etc.).
 *
 * 4. DIRECTOR_INTENT_SYSTEM — Added `overlayStrategy` field
 *    so the composer knows upfront whether to use dark/light
 *    scrim on full-bleed slides.
 *
 * 5. DIRECTOR_STRUCTURE_SYSTEM — Added `textSafeZone` field
 *    per slide so the layout engine knows where to place text.
 *
 * 6. COMPOSER_EXECUTION_RULES — Added rule #7: every full-bleed
 *    slide MUST set backgroundStyle.overlayOpacity ≥ 0.45 and
 *    backgroundStyle.overlayColor to a dark or light tone.
 *
 * 7. VISUAL_QUALITY_BAR — Replaced vague aspirational language
 *    with 8 specific, measurable, binary rules.
 *
 * 8. buildComposerUserPrompt — Added a READABILITY CHECKLIST
 *    block that the model must verify before outputting.
 *
 * 9. buildDeckImagePrompt — Rewrote to always append a
 *    text-safe-zone sentence matching the slide type.
 */

// ─────────────────────────────────────────────────────────────
// CORE PHILOSOPHY
// ─────────────────────────────────────────────────────────────

export const GAMMA_PHILOSOPHY = `
GAMMA MODE — how premium auto-decks are built:

1. DIRECTOR analyzes intent and writes explicit ORDERS for every slide (slideSpine).
2. COMPOSER is an EXECUTOR — it does NOT freestyle structure. It fills each ordered slot with JSON.
3. Every slide is a cinematic SCENE: headline + optional bullets + mandatory background imagePrompt.
4. Visual continuity: one imageryMood family, one palette story, one typography pairing across the
   deck — but every slide gets a unique scene, crop, and composition.
5. Headlines are punchy (3–8 words). Bullets MUST be highly detailed and informative (15–30 words each).
6. Zero generic AI slop: ban "revolutionary", "game-changing", "synergy", "leverage", "cutting-edge".
7. No cheap template look: no pale grey washed backgrounds, no repeated white cards.

TEXT READABILITY IS NON-NEGOTIABLE:
- Every full-bleed image slide MUST have backgroundStyle.overlayOpacity ≥ 0.45 (dark mode)
  or ≥ 0.35 (light mode). Never set overlay to 0 or omit it.
- Text color on full-bleed slides: ALWAYS white (#FFFFFF) or near-white (#F0F0F0) in dark mode.
  NEVER use mid-tone colors (blue, orange, grey) as title color on a photographic background.
- The imagePrompt MUST request a "text-safe zone" — a dark, low-detail area where the text sits.
`;

// ─────────────────────────────────────────────────────────────
// VISUAL QUALITY BAR  (measurable binary rules)
// ─────────────────────────────────────────────────────────────

export const VISUAL_QUALITY_BAR = `
VISUAL QUALITY BAR — 8 binary rules (pass/fail, not guidelines):

1. OVERLAY PRESENT: Every full-bleed image slide has backgroundStyle.overlayOpacity between 0.42–0.62.
   FAIL if overlayOpacity is 0, missing, or > 0.70 (too dark).

2. TEXT COLOR CONTRAST: Title and subtitle color on full-bleed slides is #FFFFFF or #F5F5F5.
   FAIL if any mid-tone color is used on a photographic background.

3. NO TWIN SLIDES: No two consecutive slides share the same type AND same backgroundStyle.
   FAIL if slide N and slide N+1 have identical type + backgroundStyle.type.

4. STATS ARE NUMBERS: Every stats slide has real numeric values (87%, $2.4M, 3×) in bullets.
   FAIL if bullets on a stats slide are vague text labels with no numbers.

5. QUOTE HAS ATTRIBUTION: Every quote slide has a non-empty subtitle (the attribution).
   FAIL if subtitle is empty or null on a quote slide.

6. IMAGE PROMPT IS REAL: Every imagePrompt describes a specific filmable scene.
   FAIL if imagePrompt contains "abstract gradient", "blur", "texture only", or is < 40 characters.

7. SPLIT ALTERNATES: Split slides alternate image-left / image-right across the deck.
   FAIL if two adjacent split slides use the same side.

8. HERO & CLOSING UNIQUE: Hero and closing slides do NOT share the same imagePrompt scene.
   FAIL if closing imagePrompt is a restatement of the hero imagePrompt.
`;

// ─────────────────────────────────────────────────────────────
// SLIDE TYPE PLAYBOOK
// ─────────────────────────────────────────────────────────────

export const SLIDE_TYPE_PLAYBOOK = `
SLIDE TYPE PLAYBOOK — concrete layout contracts:

hero:
  Background: Full-bleed cinematic image. overlayOpacity: 0.50–0.58.
  Text: Large title (centered or left), subtitle below. Color: #FFFFFF.
  imagePrompt zone: "Keep center-bottom area dark and free of detail for title text overlay."
  Use: Once, slide 1 only.

split:
  Background: Solid panel (left) + image panel (right, or flipped). No full-bleed.
  Text: Title + 3–5 bullet pills in left glass panel. Color: theme textPrimary.
  imagePrompt zone: "Subject fills right half; left third is deliberately dark or blurred."
  Alternate: image-right on odd occurrences, image-left on even occurrences.

content:
  Three distinct variants — vary per occurrence:
  A) Editorial: Title with left accent bar + stacked bullet rows.
  B) Bento: 2×2 numbered glass cards grid.
  C) Cinematic overlay: Full-bleed image (overlayOpacity 0.48) + centered glass block.
  imagePrompt zone for C: "Center of frame is deliberately shadowed for a glass card overlay."

bullets:
  Background: Solid or subtle full-bleed (overlayOpacity 0.28–0.35 max, near solid).
  Text: Title + full-width pill rows (accent tick left). Font ≥ 26px.
  imagePrompt zone: "Very subtle background texture only — image should not compete with text."

quote:
  Background: Full-bleed cinematic image. overlayOpacity: 0.52–0.60.
  Text: Large centered quote (56–64px italic), attribution subtitle. Color: #FFFFFF.
  imagePrompt zone: "Keep entire center 60% of frame dark and low-detail for quote text."
  Required: subtitle MUST be non-empty (attribution name/role).

stats:
  Background: Solid background (no full-bleed image).
  Text: Title + 2–4 glass stat cards. Each card: large number (68px accent color) + label.
  Bullets MUST contain real numbers/percentages, not vague labels.

comparison:
  Background: Solid. Two glass columns with distinct colored header badges.
  Left column: accent-colored badge. Right column: muted badge. Visual distinction required.

timeline:
  Background: Full-bleed image (overlayOpacity 0.38–0.48) OR solid.
  Text: Title + horizontal dot-line + numbered step labels (01–05).
  imagePrompt zone: "Top quarter and bottom half are clear for title and step labels."

media:
  Background: Split — 60% image panel (right), 40% solid text panel (left).
  Image: Portrait-oriented product/subject, studio lighting.
  imagePrompt zone: "Subject centered in right 60%; left 40% is dark/blurred."

closing:
  Background: Full-bleed cinematic image. overlayOpacity: 0.50–0.58.
  Text: Large centered title (80px), subtitle, accent CTA button. Color: #FFFFFF.
  imagePrompt zone: "Center-bottom area dark and spacious for title and CTA button."
  Scene MUST differ from hero slide.

LAYOUT RHYTHM (mandatory):
- Never 3+ adjacent slides with same type.
- For N slides: use ≥ min(N-2, 5) distinct types when N ≥ 6.
`;

// ─────────────────────────────────────────────────────────────
// LAYOUT CATEGORY PLAYBOOK
// ─────────────────────────────────────────────────────────────

export const LAYOUT_CATEGORY_PLAYBOOK = `
LAYOUT CATEGORY PLAYBOOK (user-selected — obey as deck's structural language):
- editorial:   Magazine-style asymmetry, large headlines, image/text tension.
- bento:       Modular card grids, nested panels, compact dashboards.
- cinematic:   Full-bleed imagery, dramatic crops, minimal copy, scene storytelling.
- corporate:   Executive clarity, safe grids, metrics, comparisons, readable structure.
- pitch:       Investor rhythm — problem, solution, market, product, traction, roadmap, ask.
- product:     Large product/media showcases, feature callouts, visual proof.
- data_story:  KPI cards, comparisons, dashboards, insight-first evidence slides.
- timeline:    Roadmaps, milestones, process flows, chronological sequences.
- minimal:     Sparse layouts, generous whitespace, precise hierarchy.
- luxury:      Refined editorial spacing, premium restraint, boutique imagery.
`;

// ─────────────────────────────────────────────────────────────
// IMAGE PROMPT FORMULA
// ─────────────────────────────────────────────────────────────

export const IMAGE_PROMPT_FORMULA = `
IMAGE PROMPT FORMULA — 5-part mandatory structure:

Part 1 — SCENE: Specific subject + location + action (never abstract).
  BAD: "abstract gradient mesh with violet tones"
  GOOD: "low-angle shot of a gleaming skyscraper at dusk"

Part 2 — CAMERA: Angle + distance + lens character.
  Vary per slide: wide/establishing, medium/editorial, close/macro, overhead, low-angle.

Part 3 — LIGHTING: Quality + time-of-day + color temperature.
  Vary per slide: dawn, noon, dusk, night, studio, dramatic side-light, soft overcast.

Part 4 — COLOR: Palette alignment with the deck's imageryPalette.

Part 5 — TEXT-SAFE ZONE (MANDATORY): Tell FLUX where to keep the image dark and clear.
  hero/closing:  "Keep center-bottom quarter of frame dark and free of detail for title text."
  split:         "Keep left third of frame dark and blurred; subject dense on right side."
  quote:         "Keep center 60% of frame in deep shadow for quote text overlay."
  content-C:     "Keep center of frame shadowed for a glass card overlay."
  timeline:      "Keep top 20% and bottom 40% clear and dark for title and step labels."
  bullets:       "Very low contrast background only — no bright focal point competing with text."

End every prompt with: "Full-bleed 16:9. No text, no logos, no watermarks."

VARIETY RULES:
- Camera distance must vary: no two consecutive slides use the same distance.
- Lighting must vary: no two consecutive slides use the same lighting condition.
- Subject must vary: each slide has a completely different scene/subject.
- NO generic office scenes, stock-photo handshakes, or abstract blobs unless explicitly requested.
`;

// ─────────────────────────────────────────────────────────────
// HEADLINE RULES
// ─────────────────────────────────────────────────────────────

export const HEADLINE_RULES = `
HEADLINE & COPY RULES:
- title: 3–8 words, active voice, specific. NOT "Introduction", "Overview", "Our Approach".
  GOOD: "We Cut Onboarding Time by Half", "Three Reasons Clients Stay".
- subtitle: optional, ≤ 12 words, adds context the title doesn't have.
- bullets: 3–6 per slide, each 15–30 words, parallel grammar, highly informative.
  Avoid shallow one-liners. Each bullet should teach something specific.
- speakerNotes: 2–4 sentences of delivery cues, not a transcript.
- Write in the user's requested language throughout.
`;

// ─────────────────────────────────────────────────────────────
// DECK JSON SCHEMA
// ─────────────────────────────────────────────────────────────

export const DECK_JSON_SCHEMA = `
OUTPUT: VALID RAW JSON ONLY. No markdown fences. No HTML. No preamble.

Root fields: title, theme, presentationType, styleMode, layoutCategory,
colorPalette, fontPairing, animationStyle, defaultSlideTransition,
cinematicPresenterEffects, slides[]

Each slide MUST include:
  id, type, layout, title, subtitle (optional), bullets (optional),
  visualStyle, imagePrompt (REQUIRED — 2–4 sentences, NEVER empty or < 40 chars),
  visualDirection, backgroundStyle, slideTransition (optional), animation,
  speakerNotes, chart

backgroundStyle MUST include:
  type: "image" | "solid" | "gradient"
  overlayOpacity: number (0.42–0.62 for full-bleed image slides — NEVER 0 or missing)
  overlayColor: "#000000" for dark mode, "#FFFFFF" for light mode
  textColor: "#FFFFFF" or "#F5F5F5" for full-bleed slides (NEVER mid-tone colors)
`;

// ─────────────────────────────────────────────────────────────
// COMPOSER EXECUTION RULES
// ─────────────────────────────────────────────────────────────

export const COMPOSER_EXECUTION_RULES = `
COMPOSER EXECUTION RULES (Gamma-style):

1. SPINE OBEDIENCE: slideSpine[i] → slides[i]. Map type, headline, bullets, imagePrompt 1:1.

2. IMAGE PROMPT: Every slide has a non-empty imagePrompt (≥ 40 chars, real scene).

3. VARIETY: No deck where > 35% slides are same type. No 3 identical types in a row.

4. MOTION: Hero/closing → cinematicImageZoom or blurIn. Lists → staggerLines.
   Splits → slideRight. Stats → zoomIn. Quotes → fadeIn.

5. IMAGE RHYTHM: Same palette/mood family, but every slide: different subject,
   camera distance, angle, lighting condition.

6. OVERLAY RULE (CRITICAL): Every slide where backgroundStyle.type = "image" MUST have:
   overlayOpacity: 0.45–0.60 (never 0, never > 0.65)
   overlayColor: "#000000" (dark mode) or "#1a1a2e" (cinematic)
   title/subtitle color: "#FFFFFF" or "#F5F5F5" — NEVER blue, orange, grey, or mid-tone.

7. ANTI-DEGENERATE: Before outputting, verify:
   □ No slide has only centered title + centered subtitle and nothing else
   □ No two consecutive slides have identical type + backgroundStyle.type
   □ Every imagePrompt is a real scene (not "abstract gradient" or "blur")
   □ Stats slides have real numbers in bullets
   □ Quote slides have non-empty subtitle (attribution)
   □ Hero and closing have different imagePrompt scenes

8. OUTPUT: Start with { — no text before JSON.
`;

// ─────────────────────────────────────────────────────────────
// DIRECTOR INTENT SYSTEM
// ─────────────────────────────────────────────────────────────

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
  "visualMood": "Specific mood family e.g. 'midnight indigo, volumetric light shafts'",
  "imageryPalette": "Color/lighting keywords for FLUX e.g. 'deep navy, electric violet, soft ambient bloom'",
  "densityMode": "minimal | standard | rich",
  "cinematicIntensity": "low | medium | high",
  "fontSuggestion": {"heading": "FontName", "body": "FontName"},
  "colorPaletteSuggestion": ["#bg", "#text", "#accent", "#muted"],
  "overlayStrategy": "dark | light — which overlay mode for full-bleed slides",
  "slideMixStrategy": "Planned mix e.g. '1 hero, 2 split, 1 stats, 1 quote, 2 content, 1 timeline, 1 closing'",
  "successCriteria": ["2–5 measurable criteria for a great deck"]
}

needsDeepReasoning: true ONLY for heavy technical/legal/scientific decks.`;

// ─────────────────────────────────────────────────────────────
// DIRECTOR STRUCTURE SYSTEM
// ─────────────────────────────────────────────────────────────

export const DIRECTOR_STRUCTURE_SYSTEM = `You are the Slide Architect — write explicit ORDERS for every slide.

${SLIDE_TYPE_PLAYBOOK}

Output ONE raw JSON only:
{
  "acts": [{"name": "Act name", "beats": ["beat descriptions"]}],
  "slideSpine": [
    {
      "index": 1,
      "typeHint": "hero|split|content|quote|stats|comparison|timeline|closing|media|bullets",
      "headlineAngle": "3–8 word active-voice headline",
      "subtitleAngle": "optional or null",
      "supportingPoints": ["detailed bullet intents (20–30 words each)"],
      "layoutHint": "full-bleed | split-image-right | split-image-left | bento | editorial | cinematic-overlay",
      "imageBrief": "2-sentence FLUX scene — SPECIFIC REAL SCENE + text-safe zone instruction",
      "overlayOpacity": 0.52,
      "textSafeZone": "center-bottom | left-third | center | top-and-bottom | none",
      "emotionalBeat": "curiosity | tension | proof | relief | aspiration | action",
      "animationHint": "fadeSlideUp | cinematicImageZoom | staggerLines | zoomIn | slideRight"
    }
  ],
  "flowNotes": "emotional tension and release across the deck",
  "toneGuardrails": "voice rules and banned clichés for this deck",
  "imageryContinuity": "how to keep images cohesive while varying per slide"
}

CRITICAL RULES:
- slideSpine length MUST EXACTLY equal the requested slide count (index 1..N).
- index 1 = hero, index N = closing (unless user explicitly forbids).
- Every imageBrief: specific real scene + ends with text-safe zone instruction.
- overlayOpacity: 0.45–0.58 for full-bleed types (hero, quote, closing, timeline, content-C).
  Use 0 for solid-background types (stats, comparison, bullets).
- Never assign same typeHint 3 times in a row.
- No type exceeds 35% of total slides.`;

// ─────────────────────────────────────────────────────────────
// OTHER SYSTEMS
// ─────────────────────────────────────────────────────────────

export const DIRECTOR_REASON_SYSTEM = `Strategic reasoning for a high-stakes deck.
Plain text, max 600 words: persuasion logic, proof points, risks,
emotional landing per act. No JSON.`;

export const POLISH_SYSTEM = `Final polish agent for Gamma-class deck JSON.

${HEADLINE_RULES}
${IMAGE_PROMPT_FORMULA}
${VISUAL_QUALITY_BAR}

Tasks:
1. Sharpen every title to active-voice, specific (not "Introduction").
2. Fix every imagePrompt to include a text-safe zone instruction.
3. Verify overlayOpacity is 0.45–0.58 on all full-bleed slides — fix if not.
4. Verify title/subtitle color on full-bleed slides is #FFFFFF or #F5F5F5 — fix if mid-tone.
5. Verify no two consecutive slides have same type — fix if so.
6. Improve animation choices to match the slide type playbook.
7. Preserve slide count, ids, and types. Return JSON only.`;

// ─────────────────────────────────────────────────────────────
// BUILDER FUNCTIONS
// ─────────────────────────────────────────────────────────────

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

Before outputting: verify slide count correct, every imagePrompt ≥ 40 chars and real scene,
spine mapped 1:1, all full-bleed slides have overlayOpacity 0.45–0.58 and white text.
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
      ? `\nArt style (imagePrompt must reflect): ${args.styleMode}`
      : '';
  const images =
    args.imageSource === 'none'
      ? '\nImage source: none — prioritize typography and layout; imagePrompt still required for optional backgrounds.'
      : args.imageSource === 'unsplash'
        ? '\nImage source: unsplash — imagePrompt must describe realistic stock-photo scenes (no AI art styles).'
        : '\nImage source: AI (FLUX) — imagePrompt must be vivid, specific, filmable, unique per slide. Include text-safe zone instruction.';
  const layoutCategory = args.layoutCategory?.trim()
    ? `\nLayout category (must shape slide structures AND image compositions): ${args.layoutCategory}`
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

LAYOUT VARIETY (mandatory — violations will be rejected):
- Use hero ONCE (slide 1), closing ONCE (last slide).
- Use ≥ 4 DISTINCT types from: split, content, stats, timeline, comparison, quote, bullets, media.
- NEVER assign "content" or "split" to more than 35% of slides.
- No 3 identical types in a row.
- layoutCategory must be respected in every slide.layout field.

READABILITY CHECKLIST (verify before outputting — every item must pass):
□ Every full-bleed image slide: overlayOpacity between 0.45–0.58, never 0 or missing
□ Every full-bleed slide: title/subtitle color is #FFFFFF or #F5F5F5, NOT blue/orange/grey
□ Every imagePrompt: contains a text-safe zone instruction matching the slide type
□ Every imagePrompt: describes a real filmable scene (≥ 40 chars, no "abstract gradient")
□ Stats slides: bullets contain real numbers/percentages
□ Quote slides: subtitle is non-empty (attribution required)
□ Hero and closing: different scenes in imagePrompt
□ No two consecutive slides: same type + same backgroundStyle.type

For each slide i (1..${args.slideCount}):
1. Implement slideSpine[i]: typeHint → type, headlineAngle → title,
   supportingPoints → bullets, expand imageBrief → full imagePrompt
2. title = headlineAngle (3–8 words, active voice, no vague labels)
3. imagePrompt = expand imageBrief + visualMood + distinct composition + text-safe zone
4. backgroundStyle.overlayOpacity = slideSpine[i].overlayOpacity (preserve exactly)
5. backgroundStyle.textColor = "#FFFFFF" for all full-bleed image slides

Return ONLY the deck JSON. No markdown. No preamble. Start with {.`;
}

// ─────────────────────────────────────────────────────────────
// IMAGE PROMPT BUILDER
// ─────────────────────────────────────────────────────────────

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

// Text-safe zone instructions per slide type
const TEXT_SAFE_ZONES: Record<string, string> = {
  hero:       'Keep the center-bottom quarter of the frame dark, low-detail, and free of busy elements so a large title can be overlaid.',
  closing:    'Keep the center and lower-center of the frame in deep shadow and free of clutter for title and CTA button overlay.',
  quote:      'Keep the center 60% of the frame in controlled deep shadow — the quote text must be fully legible on top.',
  split:      'Keep the left third of the frame dark and slightly blurred; the subject should be dense on the right two-thirds.',
  'split-r':  'Keep the right third of the frame dark and slightly blurred; the subject should be dense on the left two-thirds.',
  content:    'Keep the center of the frame shadowed and low-contrast so a glass content card can float on top.',
  bullets:    'Extremely low contrast — this is a near-solid background. No bright focal point. Subtle texture only.',
  timeline:   'Keep the top 20% and bottom 40% of the frame dark and clear for title text and step labels.',
  media:      'Subject fills the right 60%; left 40% is deliberately dark or softly blurred for text panel.',
  default:    'Keep one third of the frame dark and low-detail to serve as a text-safe overlay area.',
};

// Cinematic composition recipes per type (camera + scene direction)
const TYPE_RECIPES: Record<string, string[]> = {
  hero: [
    'Wide establishing shot, low horizon, single dominant focal subject with generous negative space above',
    'Low-angle hero composition, strong leading lines converging at subject, editorial sense of scale',
    'Monumental wide shot, quiet atmosphere, one clear visual anchor against an expansive background',
    'Aerial or elevated perspective, subject small against vast environment, powerful sense of context',
  ],
  split: [
    'Medium editorial shot, subject sharp on right side, left side open and dark for copy',
    'Off-center portrait framing, subject at right-third intersection, clean left half for text',
    'Product or subject fill on right panel, environment fades to dark on left, balanced tension',
  ],
  content: [
    'Clean editorial scene, one clear subject, restrained supporting background, strong negative space',
    'Quiet concept image, tactile close-up detail, generous dark margins for text overlay',
    'Structured visual metaphor, depth without clutter, center shadowed for glass card',
  ],
  bullets: [
    'Very subtle, low-contrast environmental texture — almost abstract, no competing focal point',
    'Soft bokeh background, barely discernible shapes, pure atmosphere and color, no sharp elements',
    'Muted architectural detail, heavily de-focused, serves as a tone wash not a scene',
  ],
  quote: [
    'Intimate stage-lit portrait, soft depth of field, single human subject, emotional restraint',
    'Quiet spotlight composition, single symbolic subject in deep shadow surround',
    'Minimal reflective image, premium editorial mood, center in controlled darkness',
  ],
  stats: [
    'Abstract data sculpture, luminous geometric shapes, crisp analytical feel, dark background',
    'Dashboard-inspired composition, geometric structure, clean dark surface for metric cards',
    'Clean information-rich abstract, geometric precision, subtle motion blur on periphery',
  ],
  comparison: [
    'Clear left-right contrast, two distinct materials or lighting conditions in one frame',
    'Dual-path composition, opposing ideas in one cohesive frame, sharp visual divide at center',
    'Balanced side-by-side visual contrast, editorial polish, each half tells a different story',
  ],
  timeline: [
    'Progression scene, clear directional path from foreground to background, sense of journey',
    'Linear diagonal composition, visual sequence and momentum, depth cues reading like a roadmap',
    'Layered process image, foreground-to-background depth, structured and purposeful movement',
  ],
  media: [
    'Product-first showcase, studio lighting, premium presentation framing, clean margins',
    'Visual proof composition, object centered in right panel, crisp material detail, polished',
    'Hero product scene, strong material detail, controlled studio environment, showcase quality',
  ],
  closing: [
    'Resolving wide shot, optimistic warm light, strong horizon, open space for CTA',
    'Open horizon composition, calm confidence, single focal point in lower third, forward-looking',
    'Concluding editorial scene, clean premium atmosphere, subtle warmth, memorable final frame',
  ],
  default: [
    'Premium editorial scene, one dominant subject, one supporting visual cue, generous negative space',
    'Cinematic concept image, clear hierarchy, text-safe shadowed zone, atmospheric depth',
    'Clean atmospheric composition, depth, texture, restrained motion, strong center anchor',
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
  if (kind.includes('hero') || kind.includes('banner')) return 'hero';
  if (kind.includes('split')) return 'split';
  if (kind.includes('quote') || kind.includes('testimonial')) return 'quote';
  if (kind.includes('stat') || kind.includes('metric') || kind.includes('data')) return 'stats';
  if (kind.includes('timeline') || kind.includes('roadmap') || kind.includes('sequence')) return 'timeline';
  if (kind.includes('comparison') || kind.includes('contrast') || kind.includes('vs')) return 'comparison';
  if (kind.includes('media') || kind.includes('product') || kind.includes('showcase')) return 'media';
  if (kind.includes('bullet') || kind.includes('list')) return 'bullets';
  if (kind.includes('clos') || kind.includes('cta') || kind.includes('ending')) return 'closing';
  if (kind.includes('content') || kind.includes('editorial') || kind.includes('bento')) return 'content';
  return 'default';
}

function getTextSafeZone(kind: string): string {
  return TEXT_SAFE_ZONES[kind] || TEXT_SAFE_ZONES.default;
}

// Camera distance rotation — ensures variety across slides
const CAMERA_DISTANCES = [
  'wide establishing shot',
  'medium editorial shot',
  'close-up detail shot',
  'low-angle hero shot',
  'overhead bird\'s-eye view',
  'extreme close-up macro shot',
];

const LIGHTING_CONDITIONS = [
  'golden hour warm light',
  'cool blue-hour twilight',
  'dramatic side-lit studio lighting',
  'soft overcast diffused light',
  'deep night with artificial glow',
  'crisp midday high-contrast light',
  'moody backlit silhouette',
];

export function buildDeckImagePrompt(args: DeckImagePromptContext): string {
  const title      = normalizePhrase(args.title);
  const topic      = title || normalizePhrase(args.presentationType) || normalizePhrase(args.type) || 'presentation theme';
  const mood       = normalizePhrase(args.visualMood) || 'cinematic atmospheric';
  const palette    = normalizePhrase(args.imageryPalette) || 'deep dark elegant tones';
  const kind       = normalizePhrase(args.layoutHint || args.type) || 'content';
  const category   = normalizePhrase(args.layoutCategory);
  const basePrompt = normalizePhrase(args.basePrompt);
  const idx        = args.slideIndex ?? 0;
  const total      = args.slideCount ?? 1;

  const slideSeed    = `${idx}:${total}:${category}:${kind}:${topic}`;
  const recipeKind   = normalizeRecipeKind(kind);
  const recipe       = chooseRecipe(recipeKind, slideSeed);
  const textSafeZone = getTextSafeZone(recipeKind);

  // Rotate camera distance and lighting by slide index for guaranteed variety
  const cameraDistance = CAMERA_DISTANCES[idx % CAMERA_DISTANCES.length];
  const lighting       = LIGHTING_CONDITIONS[idx % LIGHTING_CONDITIONS.length];

  const scene =
    basePrompt ||
    `${mood} ${recipeKind === 'default' ? kind : recipeKind} image about "${topic}"`;

  const categoryLine = category
    ? `Layout family: ${category} — image composition must support that layout language. `
    : '';

  // FIXED: always append text-safe zone instruction so text is always readable
  return [
    `${scene}.`,
    `Composition: ${recipe}, ${cameraDistance}.`,
    `Lighting: ${lighting}.`,
    `Color and mood: ${palette}.`,
    `${categoryLine}${textSafeZone}`,
    `Full-bleed 16:9. No text, no logos, no watermarks.`,
  ].join(' ');
}

export function buildFallbackImagePrompt(args: DeckImagePromptContext): string {
  return buildDeckImagePrompt(args);
}

// ─────────────────────────────────────────────────────────────
// LEGACY EXPORT (kept for backward compat)
// ─────────────────────────────────────────────────────────────

/** @deprecated Use DIRECTOR_INTENT_SYSTEM via prompt-chain */
export const PREFLIGHT_SYSTEM = `You are a strategic analyst. Output ONE raw JSON object only.
Analyze the user's presentation request and return:
{
  "intentSummary": "string",
  "presentationType": "string",
  "audienceType": "string",
  "emotionalTone": "string",
  "promptEnhancement": "string",
  "recommendedStyle": "string",
  "visualMood": "string",
  "imageryPalette": "string",
  "densityMode": "minimal | standard | rich",
  "fontSuggestion": {"heading": "string", "body": "string"},
  "colorPaletteSuggestion": ["#hex","#hex","#hex","#hex"]
}`;
