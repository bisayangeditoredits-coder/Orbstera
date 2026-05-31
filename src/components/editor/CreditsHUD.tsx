'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, RefreshCw, Sparkles, ChevronDown, Layers, Image as ImageIcon, Wand2, Info, CheckCircle2, Layout, ScanIcon } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import Link from 'next/link';

export function CreditsHUD() {
  const { remaining, monthlyLimit, used, plan, estimates, loading, refresh, usagePct } = useCredits();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const planNameDisplay = !mounted ? 'Loading...' :
    plan === 'creator_pro' ? 'Creator Pro' :
    plan === 'student_pro' ? 'Student Pro' :
    plan === 'pro' ? 'Pro Plan' :
    plan === 'admin' ? 'Enterprise Admin' : 'Free Plan';

  const isLow = mounted && remaining < 40 && !loading;

  return (
    <div className="relative inline-block text-left z-50 font-sans">
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative h-10 px-4 rounded-xl border transition-all flex items-center gap-2.5 text-[13px] font-semibold active:scale-[0.98] touch-manipulation overflow-hidden ${
          isLow 
            ? 'bg-amber-50/90 border-amber-200/80 text-amber-900 shadow-lg shadow-amber-500/10' 
            : 'bg-white/95 backdrop-blur-md border-black/[0.06] hover:border-black/15 shadow-sm hover:shadow-md text-neutral-800'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <Zap 
            size={15} 
            className={`${isLow ? 'text-amber-600' : 'text-primary'} ${loading ? 'opacity-20' : 'animate-pulse'}`} 
            fill="currentColor" 
            style={{ filter: isLow ? 'none' : 'drop-shadow(0 0 4px rgba(56,189,248,0.4))' }}
          />
          {loading && (
            <RefreshCw size={14} className="absolute inset-0 animate-spin text-primary" />
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="font-bold tabular-nums tracking-tighter text-[14px]">
            {loading ? '--' : remaining.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest opacity-70">
            CR
          </span>
        </div>

        <ChevronDown 
          size={14} 
          className={`text-neutral-300 group-hover:text-neutral-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* ── Dropdown / Popover HUD ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px]"
            />

            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 8, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/98 backdrop-blur-2xl rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden z-50 flex flex-col border border-black/[0.05]"
            >
              {/* Header with Glassmorphism */}
              <div className="relative p-5 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                      <Sparkles size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-bold text-neutral-900 tracking-tight">
                          {planNameDisplay}
                        </h4>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                          <CheckCircle2 size={8} />
                          <span className="text-[9px] font-bold uppercase tracking-tighter">Active</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium tracking-tight">
                        AI Engine Allocation System
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                    className="w-8 h-8 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 text-neutral-400 hover:text-primary rounded-xl transition-all border border-black/[0.03]"
                  >
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Main Credit Display */}
              <div className="px-5 pb-5 space-y-4">
                <div className="bg-neutral-50/50 rounded-2xl p-4 border border-black/[0.03]">
                  <div className="flex justify-between items-end mb-2.5">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        Credits Available
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tracking-tighter text-neutral-900 tabular-nums">
                          {remaining.toLocaleString()}
                        </span>
                        <span className="text-[12px] font-bold text-neutral-400">CR</span>
                      </div>
                    </div>
                    <div className="text-right pb-1">
                      <span className="text-[11px] font-bold text-neutral-900 bg-white px-2 py-1 rounded-lg border border-black/[0.05] shadow-sm">
                        {used.toLocaleString()} <span className="text-neutral-400">used</span>
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar with Shimmer */}
                  <div className="relative h-2.5 w-full bg-neutral-200/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, usagePct))}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full relative rounded-full ${
                        usagePct > 90 ? 'bg-red-500' :
                        usagePct > 75 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    </motion.div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-neutral-400 font-bold tracking-tight">Tier limit: {monthlyLimit.toLocaleString()} CR</span>
                    <span className="text-[10px] text-primary font-bold uppercase">{usagePct}% consumed</span>
                  </div>
                </div>

                {/* Costs Table - Card Style */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <div className="h-px flex-1 bg-black/[0.04]" />
                    <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest shrink-0">Engine Action Costs</span>
                    <div className="h-px flex-1 bg-black/[0.04]" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <CostCard icon={<Layout size={12} />} label="Gen Presentation" cost={`${estimates.deck_small} - ${estimates.deck_large}`} />
                    <CostCard icon={<Wand2 size={12} />} label="AI Magic Edit" cost={`${estimates.magic_edit}`} />
                    <CostCard icon={<ScanIcon size={12} />} label="Generative Fill" cost="10" />
                    <CostCard icon={<ImageIcon size={12} />} label="Image Generation" cost={`${estimates.image_standard}`} />
                  </div>
                </div>
              </div>

              {/* Pro Footer */}
              <div className="mt-auto p-4 bg-gradient-to-t from-neutral-50 to-white border-t border-black/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400">
                  <Info size={12} />
                  <span>Renews monthly</span>
                </div>
                <Link
                  href="/pricing"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-black/10 active:scale-95"
                >
                  Upgrade Tier
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite linear;
        }
      `}</style>
    </div>
  );
}

function CostCard({ icon, label, cost }: { icon: React.ReactNode, label: string, cost: string }) {
  return (
    <div className="group flex items-center justify-between p-3 bg-white hover:bg-neutral-50 rounded-2xl border border-black/[0.04] transition-all hover:shadow-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-neutral-50 group-hover:bg-primary/5 flex items-center justify-center text-neutral-400 group-hover:text-primary transition-colors border border-black/[0.02]">
          {icon}
        </div>
        <span className="text-[11px] font-bold text-neutral-600 truncate tracking-tight">{label}</span>
      </div>
      <div className="flex items-center gap-1 pl-2">
        <span className="text-[12px] font-bold text-neutral-900 tabular-nums">{cost}</span>
        <span className="text-[8px] font-bold text-neutral-300 uppercase">CR</span>
      </div>
    </div>
  );
}

