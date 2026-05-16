'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Zap,
  Minus,
} from 'lucide-react';
import type { DeckMeta } from '@/types/deck-meta';
import type { CreditState } from '@/hooks/useCredits';
import {
  computeWeeklyActivity,
  computeWeeklyGrowth,
  sparklineHeights,
  formatPlanLabel,
  totalSlides,
} from './dashboard-utils';

type DashboardStatsProps = {
  decks: DeckMeta[];
  userName: string;
  credits: CreditState;
  onOpenSettings?: () => void;
};

function SparkBars({ heights, accent = 'primary' }: { heights: number[]; accent?: 'primary' | 'red' }) {
  const barClass =
    accent === 'red'
      ? 'bg-red-400/15 group-hover:bg-red-400/25'
      : 'bg-primary/15 group-hover:bg-primary/25';
  return (
    <div className="mt-6 flex h-12 w-full items-end gap-1">
      {heights.map((h, i) => (
        <div key={i} className={`flex-1 rounded-t-md transition-colors ${barClass}`} style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function DashboardStats({ decks, userName, credits, onOpenSettings }: DashboardStatsProps) {
  const deckCount = decks.length;
  const slides = totalSlides(decks);
  const activity = computeWeeklyActivity(decks);
  const growth = computeWeeklyGrowth(decks);
  const activityHeights = sparklineHeights(activity);
  const creditHeights = sparklineHeights(
    Array.from({ length: 7 }, (_, i) => Math.max(0, credits.usagePct - (6 - i) * 3)),
  );

  const firstName = userName.split(' ')[0] || 'Creator';
  const isFree = credits.plan === 'free' || !credits.plan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6"
    >
      <div className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
            <LayoutDashboard size={24} strokeWidth={1.75} />
          </div>
        </div>
        <h2
          className="pr-14 text-2xl font-bold tracking-tight text-slate-900"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          Welcome back, {firstName}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {deckCount} presentation{deckCount === 1 ? '' : 's'} in your workspace
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            {deckCount} decks · {slides} slides
          </span>
          {isFree && (
            <Link
              href="/pricing"
              className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Upgrade
            </Link>
          )}
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Usage details
            </button>
          ) : (
            <Link
              href="/my-presentations#settings"
              className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Usage details
            </Link>
          )}
        </div>
      </div>

      <div className="group rounded-3xl border border-white/70 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Weekly activity</p>
          {growth.percent !== null ? (
            <span
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${
                growth.percent >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {growth.percent >= 0 ? (
                <TrendingUp size={14} strokeWidth={1.75} />
              ) : (
                <TrendingDown size={14} strokeWidth={1.75} />
              )}
              {growth.percent >= 0 ? '+' : ''}
              {growth.percent}%
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
              <Minus size={14} strokeWidth={1.75} />
              —
            </span>
          )}
        </div>
        <p className="font-montserrat text-4xl font-black tabular-nums text-slate-900">{growth.current}</p>
        <p className="text-xs text-slate-400">Decks edited in the last 7 days</p>
        <SparkBars heights={activityHeights} />
      </div>

      {onOpenSettings ? (
        <button
          type="button"
          onClick={onOpenSettings}
          className="group w-full rounded-3xl border border-white/70 bg-white p-6 text-left shadow-sm transition-shadow hover:border-primary/20 hover:shadow-lg sm:p-8"
        >
          <div className="mb-4 flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI credits</p>
          <span className="flex items-center gap-1 rounded-lg bg-primary/5 px-2 py-1 text-xs font-bold text-primary">
            <Zap size={14} strokeWidth={1.75} />
            {formatPlanLabel(credits.plan)}
          </span>
        </div>
        <p className="font-montserrat text-4xl font-black tabular-nums text-slate-900">
          {credits.loading ? '—' : `${credits.usagePct}%`}
        </p>
        <p className="text-xs text-slate-400">
          {credits.loading
            ? 'Loading usage…'
            : `${credits.used} / ${credits.monthlyLimit} credits this month`}
        </p>
        <SparkBars heights={creditHeights} />
        </button>
      ) : (
        <div className="group rounded-3xl border border-white/70 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-8">
          <div className="mb-4 flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI credits</p>
            <span className="flex items-center gap-1 rounded-lg bg-primary/5 px-2 py-1 text-xs font-bold text-primary">
              <Zap size={14} strokeWidth={1.75} />
              {formatPlanLabel(credits.plan)}
            </span>
          </div>
          <p className="font-montserrat text-4xl font-black tabular-nums text-slate-900">
            {credits.loading ? '—' : `${credits.usagePct}%`}
          </p>
          <p className="text-xs text-slate-400">
            {credits.loading
              ? 'Loading usage…'
              : `${credits.used} / ${credits.monthlyLimit} credits this month`}
          </p>
          <SparkBars heights={creditHeights} />
        </div>
      )}
    </motion.div>
  );
}

