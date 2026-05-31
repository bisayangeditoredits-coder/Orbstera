import type { PresentationData, PresentationDNA, Slide, SlideLayoutType } from '@/types';
import { coerceSlideTransition } from '@/lib/presentationMotion';
import { resolveVisualTheme } from '@/lib/visual-themes';
import { normalizeDeckLayoutCategory, getDeckLayoutCategoryOption } from '@/lib/deck-layout-categories';
import { openRouterComplete, extractJsonObject } from './openrouter';
import { PREFLIGHT_SYSTEM, buildComposerSystemPrompt, buildComposerUserPrompt, buildDeckImagePrompt } from './deck-generation-skill';
import { enforceSlideBackgroundStyles } from './generation-constraints';
import type { DeckGenerationConstraints } from './generation-constraints';
import { AGENT_MODELS } from './agent-models';

export interface PreflightResult {
  raw: Record<string, unknown>;
  summaryForPrompt: string;
  dna?: PresentationDNA;
}

/** Optional standalone preflight (e.g. tools). Deck generation uses prompt-chain output instead. */
export async function runPreflight(args: {
  appUrl: string;
  userPrompt: string;
  slideCount: number;
  tone: string;
  language: string;
  model?: string;
}): Promise<PreflightResult> {
  const model = args.model ?? AGENT_MODELS.gptOrchestrator;
  const user = `User request:\n${args.userPrompt}\n\nConstraints:\n- Target slides: ${args.slideCount}\n- Tone: ${args.tone}\n- Language: ${args.language}\n- Infer the best presentation type and narrative arc.`;

  try {
    const text = await openRouterComplete(args.appUrl, {
      model,
      messages: [
        { role: 'system', content: PREFLIGHT_SYSTEM },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    });
    const raw = extractJsonObject(text) ?? {};
    const summaryForPrompt = JSON.stringify(raw, null, 2);
    const dnaRaw = (raw as { dna?: PresentationDNA }).dna;
    const dna = dnaRaw && typeof dnaRaw === 'object' ? (dnaRaw as PresentationDNA) : undefined;
    return { raw, summaryForPrompt, dna };
  } catch (e) {
    console.warn('[Preflight] failed, continuing without context:', e);
    return {
      raw: {},
      summaryForPrompt:
        '{"note":"preflight_unavailable","fallback":"Compose a cinematic, non-generic deck from the user prompt."}',
    };
  }
}

export function buildComposerMessages(args: {
  preflightSummary: string;
  userPrompt: string;
  refinedBrief: string;
  slideCount: number;
  tone: string;
  language: string;
  styleMode?: string;
  layoutCategory?: string;
  layoutCategoryExplicit?: boolean;
  imageSource?: 'ai' | 'unsplash' | 'none';
  systemConstraints?: string;
}): { system: string; user: string } {
  let system = buildComposerSystemPrompt(args.preflightSummary);
  if (args.systemConstraints?.trim()) {
    system += `\n\n${args.systemConstraints.trim()}`;
  }
  const user = buildComposerUserPrompt({
    userPrompt: args.userPrompt,
    refinedBrief: args.refinedBrief,
    slideCount: args.slideCount,
    tone: args.tone,
    language: args.language,
    styleMode: args.styleMode,
    layoutCategory: args.layoutCategory,
    imageSource: args.imageSource,
  });

  return { system, user };
}

const KNOWN_LAYOUT_TYPES = new Set<string>([
  'hero',
  'content',
  'split',
  'media',
  'quote',
  'stats',
  'team',
  'timeline',
  'closing',
  'bullets',
  'stats',
  'comparison',
]);

function coerceSlideType(raw: string): SlideLayoutType {
  if (KNOWN_LAYOUT_TYPES.has(raw)) return raw as SlideLayoutType;
  if (raw === 'bento' || raw === 'roadmap') return 'content';
  return 'content';
}

const MIN_IMAGE_PROMPT_CHARS = 40;

function needsImagePromptFill(prompt?: string): boolean {
  const trimmed = prompt?.trim() ?? '';
  return trimmed.length < MIN_IMAGE_PROMPT_CHARS;
}

/** Merge director/architect metadata into composer JSON before normalization */
export function mergeOrchestrationMetadata(
  deckJson: Record<string, unknown>,
  preflightSummary?: string | Record<string, unknown> | null,
): Record<string, unknown> {
  if (!preflightSummary) return deckJson;
  try {
    const pre =
      typeof preflightSummary === 'string'
        ? (JSON.parse(preflightSummary) as Record<string, unknown>)
        : preflightSummary;
    const intent = (pre.dna as Record<string, unknown> | undefined) ?? pre;
    return {
      ...deckJson,
      slideSpine: deckJson.slideSpine ?? pre.slideSpine,
      visualMood: deckJson.visualMood ?? pre.visualMood ?? intent.visualMood,
      imageryPalette: deckJson.imageryPalette ?? pre.imageryPalette ?? intent.imageryPalette,
      colorPaletteSuggestion:
        deckJson.colorPaletteSuggestion ??
        pre.colorPaletteSuggestion ??
        intent.colorPaletteSuggestion,
      fontSuggestion: deckJson.fontSuggestion ?? pre.fontSuggestion ?? intent.fontSuggestion,
    };
  } catch {
    return deckJson;
  }
}

/** Normalize AI quirks → PresentationData shape the editor expects */
export function normalizePresentationPayload(
  input: Record<string, unknown>,
  opts?: { imageSource?: 'ai' | 'unsplash' | 'none'; constraints?: DeckGenerationConstraints },
): PresentationData {
  // API routes (e.g. /api/generate/polish) wrap the deck as `{ presentation: ... }`
  if (
    input.presentation &&
    typeof input.presentation === 'object' &&
    !Array.isArray(input.presentation)
  ) {
    input = input.presentation as Record<string, unknown>;
  }

  const title =
    (input.presentationTitle as string) ||
    (input.title as string) ||
    'Untitled Presentation';

  const slidesRaw = Array.isArray(input.slides) ? input.slides : [];
  const visualMood =
    typeof input.visualMood === 'string'
      ? input.visualMood
      : typeof (input as { preflight?: { visualMood?: string } }).preflight?.visualMood === 'string'
        ? (input as { preflight?: { visualMood?: string } }).preflight!.visualMood
        : undefined;
  const imageryPalette =
    typeof input.imageryPalette === 'string' ? input.imageryPalette : undefined;
  const layoutCategory = normalizeDeckLayoutCategory(
    (opts?.constraints?.layoutCategoryExplicit && opts.constraints.layoutCategory) ||
      input.layoutCategory ||
      input.recommendedStyle ||
      input.styleMode ||
      input.presentationType,
  );
  const layoutOption = getDeckLayoutCategoryOption(layoutCategory);

  const slides: Slide[] = slidesRaw.map((s, i) => {
    const obj = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
    const nested = (obj.content as Record<string, unknown> | undefined)?.bullets;
    const nestedBullets = Array.isArray(nested)
      ? (nested as string[])
      : [];
    const topBullets = Array.isArray(obj.bullets) ? (obj.bullets as string[]) : [];
    const bullets = Array.from(new Set([...topBullets, ...nestedBullets])).filter(Boolean);

    let type = coerceSlideType(String(obj.type || 'content'));

    let imagePrompt =
      typeof obj.imagePrompt === 'string' && obj.imagePrompt.trim()
        ? obj.imagePrompt.trim()
        : undefined;

    if (needsImagePromptFill(imagePrompt)) {
      const spineRaw = (input as { slideSpine?: unknown[] }).slideSpine;
      const spineEntry =
        Array.isArray(spineRaw) && spineRaw[i] && typeof spineRaw[i] === 'object'
          ? (spineRaw[i] as { imageBrief?: string; typeHint?: string })
          : null;
      imagePrompt = buildDeckImagePrompt({
        basePrompt: spineEntry?.imageBrief?.trim() || imagePrompt,
        title: (obj.title as string) || undefined,
        type,
        slideIndex: i,
        slideCount: slidesRaw.length || undefined,
        layoutHint: spineEntry?.typeHint || type,
        layoutCategory,
        visualMood,
        imageryPalette,
      });
    } else {
      imagePrompt = buildDeckImagePrompt({
        basePrompt: imagePrompt,
        title: (obj.title as string) || undefined,
        type,
        slideIndex: i,
        slideCount: slidesRaw.length || undefined,
        layoutHint: type,
        layoutCategory,
        visualMood,
        imageryPalette,
      });
    }

    return {
      id: (obj.id as string) || `slide-${i}-${Date.now()}`,
      type,
      title: (obj.title as string) || '',
      subtitle: obj.subtitle as string | undefined,
      bullets: bullets.length ? bullets : undefined,
      imagePrompt,
      imageUrl: obj.imageUrl as string | undefined,
      animation: obj.animation as Slide['animation'],
      slideTransition: coerceSlideTransition(obj.slideTransition),
      elements: obj.elements as Slide['elements'],
      backgroundStyle: obj.backgroundStyle as string | undefined,
      backgroundColor: obj.backgroundColor as string | undefined,
      speakerNotes: obj.speakerNotes as string | undefined,
      visualDirection: obj.visualDirection as string | undefined,
      layout: obj.layout as string | undefined,
      visualStyle: obj.visualStyle as string | undefined,
      content: obj.content as Slide['content'],
    };
  });

  // Apply slideSpine types for bookends and when composer defaulted to generic content
  const spineRaw = (input as { slideSpine?: { typeHint?: string; headlineAngle?: string }[] }).slideSpine;
  if (Array.isArray(spineRaw) && spineRaw.length === slides.length) {
    const lastIdx = slides.length - 1;
    slides.forEach((slide, i) => {
      const order = spineRaw[i];
      if (!order || typeof order !== 'object') return;

      if (order.typeHint) {
        const hinted = coerceSlideType(String(order.typeHint));
        if (i === 0) slide.type = 'hero';
        else if (i === lastIdx) slide.type = 'closing';
        else if (slide.type === 'content') slide.type = hinted;
      }

      if (
        order.headlineAngle &&
        (!slide.title?.trim() || slide.title.length < 3 || slide.title.toLowerCase() === 'untitled')
      ) {
        slide.title = String(order.headlineAngle).slice(0, 80);
      }
    });
  }

  // Rescue monotonous decks — only when variety is clearly broken
  const typeSet = new Set(slides.map((s) => s.type));
  const runsTooLong = (() => {
    let run = 1;
    for (let i = 1; i < slides.length; i++) {
      if (slides[i].type === slides[i - 1].type) {
        run += 1;
        if (run >= 3) return true;
      } else {
        run = 1;
      }
    }
    return false;
  })();
  const lowVariety = slides.length >= 4 && typeSet.size <= 2;
  if (slides.length >= 4 && (runsTooLong || lowVariety)) {
    const rhythm: SlideLayoutType[] = layoutOption.rhythm.length
      ? layoutOption.rhythm
      : ['hero', 'content', 'split', 'quote', 'comparison', 'timeline', 'stats', 'media', 'bullets'];
    const lastIndex = slides.length - 1;
    slides.forEach((slide, i) => {
      if (i === 0) {
        slide.type = 'hero';
        return;
      }
      if (i === lastIndex) {
        slide.type = 'closing';
        return;
      }
      slide.type = rhythm[Math.min(i, rhythm.length - 1)] ?? 'content';
    });
    slides.forEach((slide, i) => {
      slide.imagePrompt = buildDeckImagePrompt({
        basePrompt: slide.imagePrompt,
        title: slide.title,
        type: slide.type,
        slideIndex: i,
        slideCount: slides.length,
        layoutHint: slide.layout || slide.type,
        layoutCategory,
        visualMood,
        imageryPalette,
      });
    });
  }

  const imageSource = opts?.imageSource ?? opts?.constraints?.imageSource ?? 'ai';
  enforceSlideBackgroundStyles(slides, imageSource);

  const dna = (input as { dna?: PresentationDNA }).dna;

  const paletteFromIntent = (input as { colorPaletteSuggestion?: string[] }).colorPaletteSuggestion;
  const fontFromIntent = (input as { fontSuggestion?: { heading?: string; body?: string } }).fontSuggestion;

  const themeId = (input.theme as string) || undefined;
  const visualPreset = resolveVisualTheme(themeId);
  const useExplicitPalette =
    opts?.constraints?.paletteExplicit && (opts.constraints.colorPalette?.length ?? 0) >= 2;

  return {
    id: (input.id as string) || undefined,
    title,
    theme: themeId || visualPreset.id,
    layoutCategory,
    colorPalette: useExplicitPalette
      ? opts!.constraints!.colorPalette!
      : Array.isArray(input.colorPalette)
        ? (input.colorPalette as string[])
        : Array.isArray(paletteFromIntent) && paletteFromIntent.length >= 2
          ? paletteFromIntent
          : [...visualPreset.colorPalette],
    fontPairing: {
      heading:
        (input.fontPairing as { heading?: string })?.heading ||
        fontFromIntent?.heading ||
        visualPreset.fontPairing.heading,
      body:
        (input.fontPairing as { body?: string })?.body ||
        fontFromIntent?.body ||
        visualPreset.fontPairing.body,
    },
    animationStyle: (input.animationStyle as string) || 'cinematic-reveal',
    defaultSlideTransition: coerceSlideTransition(input.defaultSlideTransition),
    cinematicPresenterEffects:
      typeof input.cinematicPresenterEffects === 'boolean'
        ? input.cinematicPresenterEffects
        : undefined,
    slides,
    presentationType: input.presentationType as string | undefined,
    styleMode: input.styleMode as string | undefined,
    intentSummary: input.intentSummary as string | undefined,
    saveVersion: typeof (input as { saveVersion?: unknown }).saveVersion === 'number'
      ? ((input as { saveVersion?: number }).saveVersion as number)
      : undefined,
    source: (input as { source?: PresentationData['source'] }).source,
    importMeta: (input as { importMeta?: PresentationData['importMeta'] }).importMeta,
    dna,
  };
}
