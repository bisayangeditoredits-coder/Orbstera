/**
 * Central AI credit economics + plan caps (server-safe).
 *
 * ── Unit economics (illustrative, not financial advice; tune with provider bills) ──
 * Student Pro (~$5/mo): allowance 1500 credits. If internal COGS averages ~US$0.0012/credit
 * on Gemini-heavy routing, worst-case nominal API ~$1.80 + image bursts — gross margin stays
 * positive vs $5 ARPU before infra. Tune ORBSTERA_INTERNAL_COST_PER_CREDIT_USD with real data.
 * Creator (~$19/mo): allowance default 8000 credits (override CREATOR_MONTHLY_AI_CREDITS).
 * At similar COGS assumptions, nominal API stays below ARPU unless users max premium images;
 * orchestration lowers spend via Flash-first routing + optional ORBSTERA_AI_ECONOMY_MODE.
 */
export type BillingPlan = 'free' | 'student_pro' | 'creator_pro';

export function normalizeBillingPlan(raw: string | undefined | null): BillingPlan {
  const p = (raw || 'free').toLowerCase().trim();
  if (p === 'creator_pro') return 'creator_pro';
  if (p === 'student_pro' || p === 'pro') return 'student_pro';
  return 'free';
}

/** Fixed monthly AI credit allowances by plan */
export function monthlyCreditAllowance(plan: BillingPlan): number {
  if (plan === 'creator_pro') {
    const n = Number.parseInt(process.env.CREATOR_MONTHLY_AI_CREDITS || '8000', 10);
    if (!Number.isFinite(n)) return 8000;
    return Math.min(10_000, Math.max(6000, n));
  }
  if (plan === 'student_pro') return 1500;
  return 100;
}

/** Free tier lifetime cap on AI-generated decks (separate from monthly credits). */
export const FREE_LIFETIME_DECK_CAP = 3;

export function maxSlidesForPlan(plan: BillingPlan): number {
  switch (plan) {
    case 'free':
      return 5;
    case 'student_pro':
      return 25;
    case 'creator_pro':
      return 40;
    default:
      return 5;
  }
}

export const CREDIT_COSTS = {
  presentationSmall: 40,
  presentationMedium: 80,
  presentationLarge: 150,
  magicEdit: 5,
  rewrite: 3,
  imageStandard: 10,
  imagePremiumCinematic: 20,
  animationPolish: 5,
  coach: 2,
  enhancePpt: 80,
} as const;

export function creditsForPresentation(slideCount: number): number {
  const n = Math.max(1, Math.round(Number(slideCount) || 1));
  if (n <= 7) return CREDIT_COSTS.presentationSmall;
  if (n <= 14) return CREDIT_COSTS.presentationMedium;
  return CREDIT_COSTS.presentationLarge;
}

export function creditsForPremiumImage(polish: boolean, visualProfile?: string): number {
  const cinematic =
    typeof visualProfile === 'string' && visualProfile.toLowerCase() === 'cinematic';
  if (polish && cinematic) return CREDIT_COSTS.imagePremiumCinematic;
  return CREDIT_COSTS.imageStandard;
}

export function creditsForGenerativeFill(opts: {
  enhancePrompt: boolean;
  polish: boolean;
  visualProfile?: string;
}): number {
  let total = creditsForPremiumImage(Boolean(opts.polish), opts.visualProfile);
  if (opts.enhancePrompt) total += CREDIT_COSTS.rewrite;
  return total;
}

export function internalAssumedUsdPerCredit(): number {
  const n = Number.parseFloat(process.env.ORBSTERA_INTERNAL_COST_PER_CREDIT_USD || '0');
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
