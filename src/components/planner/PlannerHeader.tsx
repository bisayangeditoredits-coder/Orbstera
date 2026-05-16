'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = ['Plan', 'Refine', 'Generate'] as const;

type PlannerHeaderProps = {
  topic: string;
  planTier: 'free' | 'pro';
  stepIndex: number;
  canGenerate: boolean;
  onGenerate: () => void;
};

export function PlannerHeader({
  topic,
  planTier,
  stepIndex,
  canGenerate,
  onGenerate,
}: PlannerHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b border-white/50 bg-[#F0F7FF]/90 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          href="/my-presentations"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white text-slate-600 shadow-sm transition hover:text-primary"
          aria-label="Back to workspace"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Link>

        <Link href="/" className="hidden shrink-0 sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png.png"
            alt="Orbstera"
            className="h-7 w-auto max-w-[140px] object-contain"
          />
        </Link>

        <div className="min-w-0 border-l border-slate-200/80 pl-3 sm:pl-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/25">
              <Sparkles size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h1 className="font-space-grotesk text-sm font-bold text-slate-900 sm:text-[15px]">
                Presentation Copilot
              </h1>
              <div className="flex items-center gap-1.5">
                {planTier === 'pro' ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-bold text-white">
                    <Crown size={8} /> PRO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                    <Zap size={8} /> FREE
                  </span>
                )}
                {topic && (
                  <span className="truncate text-[11px] font-medium text-slate-500" title={topic}>
                    · {topic}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <nav
          className="hidden items-center gap-1 rounded-full border border-white/70 bg-white/80 p-1 shadow-sm md:flex"
          aria-label="Progress"
        >
          {STEPS.map((label, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <span
                key={label}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition',
                  done || active ? 'bg-primary/10 text-primary' : 'text-slate-400',
                )}
              >
                {done && <Check size={10} strokeWidth={3} />}
                {label}
              </span>
            );
          })}
        </nav>

        <Link
          href="/my-presentations"
          className="hidden text-[12px] font-semibold text-slate-600 transition hover:text-primary lg:inline"
        >
          My decks
        </Link>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none sm:px-6"
        >
          <CheckCircle2 size={17} strokeWidth={1.75} />
          Generate deck
          <ArrowRight size={15} className="opacity-80" />
        </button>
      </div>
    </header>
  );
}
