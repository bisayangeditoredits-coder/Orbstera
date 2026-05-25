'use client';


import { Zap } from 'lucide-react';
import type { CreditState } from '@/hooks/useCredits';
import { formatPlanLabel } from './dashboard-utils';

type DashboardCreditBreakdownProps = {
  credits: CreditState;
  decksRemainingEstimate?: number;
  onOpenSettings?: () => void;
};

export function DashboardCreditBreakdown({
  credits,
  decksRemainingEstimate,
  onOpenSettings,
}: DashboardCreditBreakdownProps) {
  const resetLabel = credits.resetAt
    ? new Date(credits.resetAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'next billing period';

  return (
    <section
      className="rounded-xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] sm:p-6"
      aria-label="Credit breakdown"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Credits</p>
          <h2 className="mt-1 font-montserrat text-lg font-bold text-slate-900">
            {formatPlanLabel(credits.plan)} — monthly allowance
          </h2>
        </div>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary transition hover:bg-primary/10"
          >
            <Zap size={13} strokeWidth={1.75} />
            Manage plan
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Used</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{credits.used.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Remaining</p>
          <p className="mt-1 text-2xl font-black text-primary">{credits.remaining.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly cap</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{credits.monthlyLimit.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          style={{ width: `${Math.min(100, credits.usagePct)}%` }}
          className="h-full rounded-full bg-primary"
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Resets {resetLabel}.
        {typeof decksRemainingEstimate === 'number' && decksRemainingEstimate >= 0 && (
          <> ~{decksRemainingEstimate} typical AI decks remaining (10 slides with imagery).</>
        )}
      </p>
    </section>
  );
}
