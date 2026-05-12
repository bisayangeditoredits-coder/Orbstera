import type { AnimationEntrance, PresentationData, Slide, SlideLayoutType } from '@/types';
import {
  coerceAnimationEntrance,
  coerceSlideTransition,
  finalizeAllSlidesMotion,
  sanitizePremiumEntrance,
} from '@/lib/presentationMotion';
import { maxBulletsForArchetype } from '@/lib/presentation/slide-archetypes';

export interface SlideQualityIssue {
  slideIndex: number;
  code: string;
  detail: string;
}

function trimText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function sanitizeAnimationEntrance(raw: unknown): AnimationEntrance {
  return sanitizePremiumEntrance(coerceAnimationEntrance(raw));
}

/** Heuristic scoring pass — deterministic repairs applied in repairPresentationQuality. */
export function evaluatePresentationQuality(data: PresentationData): SlideQualityIssue[] {
  const issues: SlideQualityIssue[] = [];
  const { slides } = data;

  slides.forEach((slide, idx) => {
    const archetypeMax = maxBulletsForArchetype(slide.archetype);
    const bullets = [...(slide.bullets || []), ...(slide.content?.bullets || [])];
    const uniqueBullets = Array.from(new Set(bullets.filter(Boolean)));
    if (uniqueBullets.length > archetypeMax) {
      issues.push({
        slideIndex: idx,
        code: 'density',
        detail: `Too many bullets (${uniqueBullets.length} > ${archetypeMax})`,
      });
    }

    const titleLen = (slide.title || '').length;
    if (titleLen > 100) {
      issues.push({ slideIndex: idx, code: 'title_length', detail: `Title ${titleLen} chars` });
    }

    uniqueBullets.forEach((b, bi) => {
      const wc = wordCount(b);
      if (wc > 28) {
        issues.push({
          slideIndex: idx,
          code: 'bullet_verbose',
          detail: `Bullet ${bi + 1} has ${wc} words`,
        });
      }
    });

    const entrance = slide.animation?.entrance;
    const coerced = entrance ? coerceAnimationEntrance(entrance) : null;
    if (coerced && sanitizePremiumEntrance(coerced) !== coerced) {
      issues.push({ slideIndex: idx, code: 'motion_harsh', detail: String(entrance) });
    }

    if (!slide.animation?.entrance && slide.type !== 'chart') {
      issues.push({ slideIndex: idx, code: 'motion_missing', detail: 'slide animation' });
    }
  });

  let run = 1;
  for (let i = 1; i < slides.length; i++) {
    if (slides[i].type === slides[i - 1].type) {
      run += 1;
      if (run >= 4) {
        issues.push({ slideIndex: i, code: 'pacing_repeat', detail: `Four+ consecutive ${slides[i].type}` });
        break;
      }
    } else {
      run = 1;
    }
  }

  return issues;
}

function repairSlideTypesForPacing(slides: Slide[]): Slide[] {
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
  let run = 1;
  const next = [...slides];
  for (let i = 1; i < next.length; i++) {
    if (next[i].type === next[i - 1].type) {
      run += 1;
      if (run >= 4 && i > 0 && i < next.length - 1) {
        const alt = rhythm.find((t) => t !== next[i].type && t !== next[i - 1].type) || 'content';
        next[i] = { ...next[i], type: alt };
        run = 1;
      }
    } else {
      run = 1;
    }
  }
  return next;
}

export function repairPresentationQuality(input: PresentationData): PresentationData {
  let slides: Slide[] = input.slides.map((slide): Slide => {
    const maxB = maxBulletsForArchetype(slide.archetype);
    const merged = [...(slide.bullets || []), ...(slide.content?.bullets || [])].filter(Boolean);
    const seen = new Set<string>();
    const bullets = merged.filter((b) => {
      if (seen.has(b)) return false;
      seen.add(b);
      return true;
    });
    const trimmedBullets = bullets.slice(0, maxB).map((b) => {
      const w = wordCount(b);
      if (w <= 28) return b.trim();
      const words = b.trim().split(/\s+/);
      return words.slice(0, 22).join(' ') + '…';
    });

    const slideAnim = slide.animation
      ? {
          ...slide.animation,
          entrance: sanitizeAnimationEntrance(slide.animation.entrance),
          duration: Math.min(1600, Math.max(420, slide.animation.duration || 700)),
        }
      : {
          entrance:
            slide.type === 'hero'
              ? ('blurIn' as AnimationEntrance)
              : slide.type === 'quote'
                ? ('fadeIn' as AnimationEntrance)
                : ('fadeSlideUp' as AnimationEntrance),
          duration: 720,
          delay: 0,
        };

    const elements = (slide.elements || []).map((el) => ({
      ...el,
      animation: el.animation
        ? {
            ...el.animation,
            entrance: sanitizeAnimationEntrance(el.animation.entrance),
          }
        : el.animation,
    }));

    return {
      ...slide,
      title: trimText(slide.title || '', 100),
      subtitle: slide.subtitle ? trimText(slide.subtitle, 160) : slide.subtitle,
      bullets: trimmedBullets.length ? trimmedBullets : undefined,
      content:
        trimmedBullets.length && slide.content
          ? { ...slide.content, bullets: trimmedBullets }
          : slide.content,
      animation: slideAnim,
      elements,
      slideTransition: coerceSlideTransition(slide.slideTransition),
    };
  });

  if (slides.length >= 5) {
    slides = repairSlideTypesForPacing(slides);
  }

  const motionCtx = {
    animationStyle: input.animationStyle,
    presentationType: input.presentationType,
    styleMode: input.styleMode,
    defaultSlideTransition: input.defaultSlideTransition,
  };

  slides = finalizeAllSlidesMotion(slides, motionCtx);

  return { ...input, slides };
}
