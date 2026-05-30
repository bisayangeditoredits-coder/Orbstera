'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SLIDE_COUNT_OPTIONS } from '@/lib/slide-count-options';

export interface SlideCountDropdownProps {
  slideCount: number;
  onChange: (count: number) => void;
  isFree?: boolean;
  /** `inline` = homepage pill; `panel` = full-width visuals step */
  variant?: 'inline' | 'panel';
  className?: string;
}

export function SlideCountDropdown({
  slideCount,
  onChange,
  isFree = false,
  variant = 'inline',
  className,
}: SlideCountDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const triggerClass =
    variant === 'panel'
      ? 'flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition-all hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      : 'flex items-center gap-2 rounded-xl border border-black/[0.09] bg-white/70 px-3.5 py-1.5 text-[13px] font-semibold text-textMain shadow-sm transition-all hover:border-black/[0.15] hover:bg-white';

  return (
    <div ref={dropRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{slideCount} cards</span>
        <ChevronDown
          size={variant === 'panel' ? 16 : 14}
          className={cn(
            'text-gray-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
          strokeWidth={1.5}
        />
      </button>

      <AnimatePresence>
        {open && (
          <div
            role="listbox"
            className={cn(
              'absolute z-50 overflow-hidden rounded-2xl border border-black/[0.08] bg-white py-1 shadow-xl shadow-black/10',
              variant === 'panel' ? 'left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto' : 'left-0 top-full mt-1.5 w-52',
            )}
          >
            <div className="px-4 pb-2 pt-3">
              <p className="text-[11px] font-semibold text-gray-500">Tip: cards are like slides</p>
            </div>

            {SLIDE_COUNT_OPTIONS.map(({ count, tier }) => {
              const locked = isFree && tier !== 'free';
              const selected = slideCount === count;

              return (
                <button
                  key={count}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    if (locked) {
                      setShowUpgrade(true);
                      setTimeout(() => setShowUpgrade(false), 3000);
                      setOpen(false);
                      return;
                    }
                    onChange(count);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-2 text-[13px] transition-colors',
                    locked
                      ? 'cursor-pointer text-slate-400 hover:bg-slate-50'
                      : selected
                        ? 'bg-slate-50 font-medium text-gray-900'
                        : 'text-gray-900 hover:bg-slate-50',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {selected && !locked ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 text-blue-600">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="w-3 shrink-0" />
                    )}
                    {count} cards
                  </span>
                  {tier === 'plus' && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                      PLUS
                    </span>
                  )}
                  {tier === 'pro' && (
                    <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpgrade && (
          <div className="absolute left-0 top-full z-[60] mt-1.5 flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 shadow-lg">
            <Lock size={11} strokeWidth={1.5} />
            <Link href="/pricing" className="underline underline-offset-2">
              Upgrade to Pro
            </Link>{' '}
            for more slides
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
