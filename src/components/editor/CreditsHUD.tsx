'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RefreshCw, Sparkles, ChevronDown, Layers, Image as ImageIcon, Wand2, Info } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import Link from 'next/link';

export function CreditsHUD() {
  const { remaining, monthlyLimit, used, plan, estimates, loading, refresh, usagePct } = useCredits();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const planNameDisplay = 
    plan === 'creator_pro' ? 'Creator Pro' :
    plan === 'student_pro' ? 'Student Pro' :
    plan === 'pro' ? 'Pro Plan' :
    plan === 'admin' ? 'Enterprise Admin' : 'Free Plan';

  // Cost warning styling based on remaining vs usage
  const isLow = remaining < 40 && !loading;

  return (
    <div className="relative inline-block text-left z-50">
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-9 h-9 sm:h-[36px] px-2.5 sm:px-3 rounded-full border transition-all flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] font-semibold active:scale-[0.98] touch-manipulation shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
          isLow 
            ? 'bg-amber-50/90 border-amber-200/80 text-amber-900 hover:bg-amber-100/80' 
            : 'bg-white border-black/[0.08] hover:bg-neutral-50 hover:border-black/12 text-neutral-800'
        }`}
        aria-label="View AI Credits and cost consumption"
      >
        <div className="relative flex items-center justify-center">
          <Zap size={14} className={isLow ? 'text-amber-600 fill-amber-500/20' : 'text-primary fill-primary/10'} strokeWidth={2} />
          {loading && (
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <span className="font-bold tabular-nums tracking-tight">
            {loading ? '...' : remaining.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase font-extrabold text-neutral-400 tracking-wider hidden md:inline">
            CR
          </span>
        </div>

        <ChevronDown 
          size={12} 
          className={`text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          strokeWidth={2} 
        />
      </button>

      {/* ── Dropdown / Popover HUD ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile closing */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-transparent"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden z-50 flex flex-col border border-black/[0.08]"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-b from-neutral-50/80 to-white border-b border-black/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-[12px] font-bold text-neutral-900 tracking-tight truncate">
                        {planNameDisplay}
                      </h4>
                      <span className="text-[8px] uppercase tracking-widest font-black px-1.5 py-0.2 bg-primary/10 text-primary rounded-full">
                        Active
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 tracking-tight truncate mt-0.5">
                      AI Presentation Engine Tier
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.04] rounded-lg transition-all shrink-0 disabled:opacity-40"
                  title="Refresh credit balance"
                >
                  <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-primary' : ''} strokeWidth={2} />
                </button>
              </div>

              {/* Consumption Overview */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-baseline min-w-0">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Monthly Allocation
                  </span>
                  <div className="text-right">
                    <span className="text-[14px] font-black tracking-tight text-neutral-900">
                      {remaining.toLocaleString()}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-400">
                      {' '} / {monthlyLimit.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, usagePct))}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        usagePct > 90 ? 'bg-red-500' :
                        usagePct > 75 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                    <span>{used.toLocaleString()} consumed</span>
                    <span>{usagePct}% used</span>
                  </div>
                </div>
              </div>

              {/* Action Cost References */}
              <div className="px-4 py-3 bg-neutral-50/60 border-t border-black/[0.04] space-y-2">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <Info size={11} strokeWidth={2} />
                  <span>AI Cost Per Action</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 min-w-0">
                      <Layers size={11} className="text-neutral-400 shrink-0" />
                      <span className="truncate">Small Deck</span>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-900 shrink-0 tabular-nums">
                      {estimates.deck_small}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 min-w-0">
                      <Layers size={11} className="text-neutral-400 shrink-0" />
                      <span className="truncate">Large Deck</span>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-900 shrink-0 tabular-nums">
                      {estimates.deck_large}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 min-w-0">
                      <ImageIcon size={11} className="text-neutral-400 shrink-0" />
                      <span className="truncate">AI Image</span>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-900 shrink-0 tabular-nums">
                      {estimates.image_standard}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 min-w-0">
                      <Wand2 size={11} className="text-neutral-400 shrink-0" />
                      <span className="truncate">Magic Edit</span>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-900 shrink-0 tabular-nums">
                      {estimates.magic_edit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Upgrade Link */}
              <div className="p-3 bg-white border-t border-black/[0.05] flex items-center justify-between gap-2">
                <span className="text-[10px] text-neutral-400 font-medium">
                  Renews monthly
                </span>
                <Link
                  href="/pricing"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-bold text-primary hover:underline transition-all"
                >
                  Upgrade Tier →
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
