'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';
import type { CreditState } from '@/hooks/useCredits';
import { isPaidPlan } from '@/lib/billing/free-genfill-redis';

type CreditWarningBannerProps = {
  credits: CreditState;
};

export function CreditWarningBanner({ credits }: CreditWarningBannerProps) {
  if (credits.loading) return null;

  const plan = credits.plan || 'free';
  if (isPaidPlan(plan)) return null;

  const limit = credits.monthlyLimit;
  if (limit <= 0) return null;

  const remainingRatio = credits.remaining / limit;
  if (remainingRatio >= 0.2) return null;

  return (
    <div
      className="shrink-0 border-b border-amber-200/80 bg-gradient-to-r from-amber-50/95 via-amber-50/70 to-orange-50/60 px-5 py-2.5 sm:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-white/80">
            <Zap size={14} className="text-amber-600" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-amber-900 leading-snug">
              You&apos;re running low on AI credits
            </p>
            <p className="text-[12px] text-amber-800/85 mt-0.5">
              {credits.remaining.toLocaleString()} of {limit.toLocaleString()} credits left this month.
              Upgrade for more generations and premium models.
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="inline-flex shrink-0 items-center justify-center h-8 px-4 rounded-lg bg-amber-600 text-white text-[12px] font-semibold hover:bg-amber-700 transition-colors shadow-sm"
        >
          Upgrade to Creator Pro
        </Link>
      </div>
    </div>
  );
}
