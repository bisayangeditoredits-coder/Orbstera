import type { PresentationData, Slide, SlideLayoutType } from '@/types';
import { coerceSlideTransition } from '@/lib/presentationMotion';
import { pickOutlineModel, type IntelligenceTier } from './models';
import { openRouterComplete, extractJsonObject } from './openrouter';
import { PREFLIGHT_SYSTEM, buildComposerSystemPrompt } from './prompts';

export interface PreflightResult {
  raw: Record<string, unknown>;
  summaryForPrompt: string;
}

export async function runPreflight(args: {
  appUrl: string;
  tier: IntelligenceTier;
  userPrompt: string;
  slideCount: number;
  tone: string;
  language: string;
}): Promise<PreflightResult> {
  const model = pickOutlineModel(args.tier);
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
  tier: IntelligenceTier;
  preflightSummary: string;
  userPrompt: string;
  slideCount: number;
  tone: string;
  language: string;
  styleMode?: string;
}): { system: string; user: string } {
  const system = buildComposerSystemPrompt(args.tier, args.preflightSummary);
  const style =
    args.styleMode && args.styleMode !== 'auto'
      ? `\n- Requested style mode: ${args.styleMode} (adapt layouts + typography accordingly).`
      : '';
  const user = `Construct the full presentation JSON.

User brief:
${args.userPrompt}

Parameters:
- Exactly ${args.slideCount} slides in the "slides" array.
- Tone: ${args.tone}
- Language: ${args.language}${style}

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

  return {
    title,
    theme: (input.theme as string) || 'industrial-minimal',
    colorPalette: Array.isArray(input.colorPalette)
      ? (input.colorPalette as string[])
      : ['#05050A', '#F8FAFC', '#38BDF8', '#94A3B8'],
    fontPairing: {
      heading: (input.fontPairing as { heading?: string })?.heading || 'Space Grotesk',
      body: (input.fontPairing as { body?: string })?.body || 'Inter',
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
  };
}
