'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          href="/my-presentations"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
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

        <div className="min-w-0 border-l border-slate-200 pl-3 sm:pl-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
              <Sparkles size={18} strokeWidth={1.75} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-[15px] font-semibold leading-tight tracking-tight text-slate-900 truncate">
                Presentation Copilot
              </h1>
              <div className="mt-1 flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                {planTier === 'pro' ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-inset ring-amber-500/20">
                    <Crown size={9} strokeWidth={2.5} /> PRO
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200">
                    <Zap size={9} strokeWidth={2.5} /> FREE
                  </span>
                )}
                {topic && (
                  <>
                    <span className="h-3 w-px shrink-0 bg-slate-200" aria-hidden="true" />
                    <span
                      className="truncate text-[10px] sm:text-[11px] font-medium text-slate-500 max-w-[80px] sm:max-w-[150px] md:max-w-[250px] lg:max-w-[340px]"
                      title={topic}
                    >
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
          className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm md:flex"
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
          className="hidden text-[12px] font-semibold text-slate-600 transition hover:text-slate-900 lg:inline"
        >
          My decks
        </Link>

          <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          title={!canGenerate ? 'Waiting for Copilot to finish your outline' : 'Generate your presentation'}
          className={cn(
            'group relative overflow-hidden inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold transition sm:w-auto sm:flex-none sm:px-6',
            canGenerate
                ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primaryHover active:scale-[0.99]'
              : 'cursor-not-allowed border border-slate-200/90 bg-white text-slate-500 shadow-sm',
          )}
        >
          {canGenerate && (
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
            />
          )}
          <CheckCircle2 size={17} strokeWidth={1.75} className="relative z-10" />
          <span className="relative z-10">Generate deck</span>
          <ArrowRight size={15} className={cn("relative z-10 opacity-80", canGenerate && "group-hover:translate-x-1 transition-transform")} />
        </button>
      </div>
      </div>
    </header>
  );
}
