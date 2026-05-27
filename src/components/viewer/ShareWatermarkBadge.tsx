'use client';

import { isPaidPlan } from '@/lib/billing/free-genfill-redis';

type ShareWatermarkBadgeProps = {
  ownerPlan?: string;
  /** Lift badge when visitor CTA bar is visible */
  hasBottomBar?: boolean;
};

export function ShareWatermarkBadge({ ownerPlan, hasBottomBar }: ShareWatermarkBadgeProps) {
  const plan = ownerPlan || 'free';
  if (isPaidPlan(plan)) return null;

  return (
    <a
      href="https://orbstera.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-4 sm:right-6 z-[215] pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200/80 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-sm ${
        hasBottomBar ? 'bottom-20 sm:bottom-[4.5rem]' : 'bottom-6'
      }`}
      style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}
    >
      Made with Orbstera ✨
    </a>
  );
}
