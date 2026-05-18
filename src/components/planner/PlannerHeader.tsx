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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-primary/5 border border-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Sparkles size={18} strokeWidth={1.75} className="text-primary" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h1 className="text-[15px] font-semibold tracking-tight text-slate-900 leading-tight">
                Presentation Copilot
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {planTier === 'pro' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 ring-1 ring-inset ring-amber-500/20">
                    <Crown size={9} strokeWidth={2.5} /> PRO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-200">
                    <Zap size={9} strokeWidth={2.5} /> FREE
                  </span>
                )}
                {topic && (
                  <>
                    <span className="h-3 w-[1px] bg-slate-200" aria-hidden="true" />
                    <span className="truncate text-[11px] font-medium text-slate-400 max-w-[150px] sm:max-w-[300px]" title={topic}>
                      {topic}
                    </span>
                  </>
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
          title={!canGenerate ? 'Waiting for Copilot to finish your outline' : 'Generate your presentation'}
          className={cn(
            'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold transition sm:w-auto sm:flex-none sm:px-6',
            canGenerate
              ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primaryHover'
              : 'cursor-not-allowed border border-slate-200/90 bg-white text-slate-500 shadow-sm',
          )}
        >
          <CheckCircle2 size={17} strokeWidth={1.75} />
          Generate deck
          <ArrowRight size={15} className="opacity-80" />
        </button>
      </div>
    </header>
  );
}
