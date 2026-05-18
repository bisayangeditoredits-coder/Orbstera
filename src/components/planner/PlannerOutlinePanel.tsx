'use client';

import { useState } from 'react';
import { LayoutList, Sparkles, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { OutlineSlide } from './planner-utils';
import { getOutlineProgress } from './planner-utils';
import { cn } from '@/lib/cn';

type PlannerOutlinePanelProps = {
  slides: OutlineSlide[];
  loading: boolean;
  topic: string;
  canGenerate: boolean;
  onGenerate: () => void;
};

function SlideSkeleton({ index }: { index: number }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.1 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary"
        >
          {index + 1}
        </motion.div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-slate-200" />
          <div className="h-2.5 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function PlannerOutlinePanel({
  slides,
  loading,
  topic,
  canGenerate,
  onGenerate,
}: PlannerOutlinePanelProps) {
  const hasSlides = slides.length > 0;
  const { count, isStreaming, target } = getOutlineProgress(slides, loading);
  const progressPct = Math.min(100, Math.round((count / target) * 100));

  return (
    <div className="dot-grid flex h-full min-h-0 flex-col overflow-hidden border-l border-white/50 bg-white/50 backdrop-blur-sm">
      <header className="shrink-0 border-b border-white/60 bg-white/60 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LayoutList size={18} className="text-primary" strokeWidth={1.75} />
            <h2 className="font-space-grotesk text-sm font-bold text-slate-900">Live outline</h2>
          </div>
          {isStreaming && !hasSlides && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Loader2 size={10} className="animate-spin" />
              Building…
            </span>
          )}
          {hasSlides && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {count} slide{count === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {topic && (
          <p className="mt-1 truncate text-xs text-slate-500" title={topic}>
            {topic}
          </p>
        )}
        {(loading || hasSlides) && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200/80">
            <motion.div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${loading && !hasSlides ? 12 : progressPct}%` }}
              animate={loading ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 1.2, repeat: loading ? Infinity : 0 }}
            />
          </div>
        )}
      </header>

      <div
        data-lenis-prevent
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5 [-webkit-overflow-scrolling:touch]"
      >
        {loading && !hasSlides ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <SlideSkeleton key={i} index={i} />
            ))}
          </div>
        ) : hasSlides ? (
          <ul className="space-y-3">
            {slides.map((slide, i) => (
              <motion.li
                key={slide.number}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <article className="group flex min-h-[88px] flex-col gap-2 rounded-2xl border border-white/70 bg-white p-4 shadow-sm transition hover:border-primary/20 hover:shadow-md sm:min-h-[96px] sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-white shadow-sm shadow-primary/25">
                      {slide.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold leading-snug text-slate-900">{slide.title}</h3>
                        {slide.type && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                              slide.type === 'Problem'
                                ? 'bg-amber-50 text-amber-800'
                                : slide.type === 'Solution'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600',
                            )}
                          >
                            {slide.type}
                          </span>
                        )}
                      </div>
                      {slide.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                          {slide.description}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </motion.li>
            ))}
            {loading && (
              <li className="pt-1">
                <SlideSkeleton index={slides.length} />
              </li>
            )}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <Sparkles size={24} strokeWidth={1.75} />
            </div>
            <p className="mt-5 font-space-grotesk text-base font-bold text-slate-900">
              Outline builds here
            </p>
            <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-slate-500">
              As Copilot plans your deck, each slide appears as a card you can review before
              generating.
            </p>
            <ol className="mt-8 max-w-[240px] space-y-3 text-left text-[11px] text-slate-500">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  1
                </span>
                Describe your topic in chat
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  2
                </span>
                Review slides as they appear
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  3
                </span>
                Click Generate deck when ready
              </li>
            </ol>
          </div>
        )}

        {hasSlides && !loading && (
          <p className="mt-4 text-center text-[11px] font-medium text-emerald-600">
            Ready to build — review your slides below.
          </p>
        )}
      </div>

      {canGenerate && (
        <div className="shrink-0 border-t border-white/60 bg-white/70 p-4 sm:px-5">
          <button
            type="button"
            onClick={onGenerate}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[13px] font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primaryHover"
          >
            <CheckCircle2 size={18} strokeWidth={1.75} />
            Generate deck
            <ArrowRight size={15} className="opacity-80" />
          </button>
        </div>
      )}
    </div>
  );
}
