import type { PresentationData, Slide, SlideLayoutType } from '@/types';
import { coerceSlideTransition } from '@/lib/presentationMotion';
import { applyVisualIntelligenceToPresentation } from '@/lib/presentation/visual-intelligence';
import { repairPresentationQuality } from '@/lib/presentation/quality-engine';
import {
  inferPresentationDnaId,
  PRESENTATION_DNA_PROFILES,
  type PresentationDnaId,
} from '@/lib/presentation/presentation-dna';
import { openRouterComplete, extractJsonObject } from './openrouter';
import { PREFLIGHT_SYSTEM, buildComposerSystemPrompt } from './prompts';
import { AGENT_MODELS } from './agent-models';

export interface PreflightResult {
  raw: Record<string, unknown>;
  summaryForPrompt: string;
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
    return { raw, summaryForPrompt };
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
}): { system: string; user: string } {
  const system = buildComposerSystemPrompt(args.preflightSummary);
  const style =
    args.styleMode && args.styleMode !== 'auto'
      ? `\n- Style hint (optional): ${args.styleMode} — adapt layouts + typography if it helps; otherwise infer from orchestration context.`
      : '';
  const user = `Construct the full presentation JSON.

Original user request:
${args.userPrompt}

Refined orchestration brief (prioritize this):
${args.refinedBrief}

Parameters:
- Exactly ${args.slideCount} slides in the "slides" array.
- Tone: ${args.tone}
- Language: ${args.language}${style}
- First slide should usually be type "hero" unless user requests otherwise.
- Last slide should usually be type "closing" unless user requests otherwise.
- Keep visual rhythm dynamic: alternate structures across adjacent slides.
- Do not generate a deck where most slides are the same type.

Final instruction: Return ONLY the JSON object for the full deck. No preamble.`;

  return { system, user };
}

const KNOWN_LAYOUT_TYPES = new Set<string>([
  'hero',
  'content',
  'split',
  'media',
  'quote',
  'chart',
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
  if (raw === 'minimal' || raw === 'cinematic') return 'hero';
  return 'content';
}

/** Normalize AI quirks → PresentationData shape the editor expects */
export function normalizePresentationPayload(input: Record<string, unknown>): PresentationData {
  const title =
    (input.presentationTitle as string) ||
    (input.title as string) ||
    'Untitled Presentation';

  const slidesRaw = Array.isArray(input.slides) ? input.slides : [];

  const slides: Slide[] = slidesRaw.map((s, i) => {
    const obj = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
    const nested = (obj.content as Record<string, unknown> | undefined)?.bullets;
    const nestedBullets = Array.isArray(nested)
      ? (nested as string[])
      : [];
    const topBullets = Array.isArray(obj.bullets) ? (obj.bullets as string[]) : [];
    const bullets = Array.from(new Set([...topBullets, ...nestedBullets])).filter(Boolean);

    const type = coerceSlideType(String(obj.type || 'content'));

    return {
      id: (obj.id as string) || `slide-${i}-${Date.now()}`,
      type,
      archetype: typeof obj.archetype === 'string' ? obj.archetype : undefined,
      title: (obj.title as string) || '',
      subtitle: obj.subtitle as string | undefined,
      bullets: bullets.length ? bullets : undefined,
      imagePrompt: obj.imagePrompt as string | undefined,
      imageUrl: obj.imageUrl as string | undefined,
      chart: (obj.chart as Slide['chart']) ?? null,
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

  // If the model returns low variety, rebalance slide types for a less template-like deck.
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
  const lowVariety = slides.length >= 6 && typeSet.size <= 3;
  if (slides.length >= 4 && (runsTooLong || lowVariety)) {
    const rhythm: SlideLayoutType[] = [
      'hero',
      'content',
      'split',
      'quote',
      'comparison',
      'chart',
      'timeline',
      'stats',
      'media',
      'bullets',
    ];
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
      const mapped = rhythm[Math.min(i, rhythm.length - 1)];
      slide.type = mapped;
    });
  }

  const rawDna = typeof input.presentationDNA === 'string' ? input.presentationDNA.trim() : '';
  const dnaFromModel =
    rawDna && rawDna in PRESENTATION_DNA_PROFILES ? rawDna : undefined;
  const presentationDNA =
    dnaFromModel ||
    inferPresentationDnaId({
      presentationType: String(input.presentationType || ''),
      emotionalTone: String((input as { emotionalTone?: string }).emotionalTone || ''),
      presentationCategory: String((input as { presentationCategory?: string }).presentationCategory || ''),
    });

  const dnaProfile =
    presentationDNA in PRESENTATION_DNA_PROFILES
      ? PRESENTATION_DNA_PROFILES[presentationDNA as PresentationDnaId]
      : undefined;

  let normalized: PresentationData = {
    id: (input.id as string) || undefined,
    title,
    theme: (input.theme as string) || 'industrial-minimal',
    colorPalette: Array.isArray(input.colorPalette)
      ? (input.colorPalette as string[])
      : ['#05050A', '#F8FAFC', '#38BDF8', '#94A3B8'],
    fontPairing: {
      heading: (input.fontPairing as { heading?: string })?.heading || 'Space Grotesk',
      body: (input.fontPairing as { body?: string })?.body || 'Inter',
    },
    animationStyle: (input.animationStyle as string) || dnaProfile?.defaultAnimationStyle || 'cinematic-reveal',
    defaultSlideTransition: coerceSlideTransition(input.defaultSlideTransition),
    cinematicPresenterEffects:
      typeof input.cinematicPresenterEffects === 'boolean'
        ? input.cinematicPresenterEffects
        : dnaProfile?.cinematicPresenterEffectsDefault,
    slides,
    presentationType: input.presentationType as string | undefined,
    presentationDNA,
    styleMode: input.styleMode as string | undefined,
    intentSummary: input.intentSummary as string | undefined,
    saveVersion: typeof (input as { saveVersion?: unknown }).saveVersion === 'number'
      ? ((input as { saveVersion?: number }).saveVersion as number)
      : undefined,
    source: (input as { source?: PresentationData['source'] }).source,
    importMeta: (input as { importMeta?: PresentationData['importMeta'] }).importMeta,
  };

  normalized = applyVisualIntelligenceToPresentation(normalized);
  normalized = repairPresentationQuality(normalized);
  return normalized;
}
