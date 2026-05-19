'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, LayoutTemplate, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function OnboardingModal({ 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] isolate flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-[210] w-full max-w-[480px] overflow-hidden rounded-[24px] bg-white shadow-[0_30px_100px_-10px_rgba(0,0,0,0.2)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-neutral-500 backdrop-blur-md transition-colors hover:bg-black/10 hover:text-neutral-800"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            {/* Mockup "GIF/Video" Header Area */}
            <div className="relative h-[240px] w-full overflow-hidden bg-gradient-to-br from-indigo-50 via-sky-50 to-white flex flex-col items-center justify-end px-8 pt-8">
              {/* Animated Mock UI */}
              <motion.div 
                className="w-full flex-1 bg-white rounded-t-xl border border-neutral-200/60 shadow-xl overflow-hidden flex flex-col relative"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
              >
                {/* Mock Header */}
                <div className="h-8 border-b border-neutral-100 flex items-center px-3 gap-2 bg-neutral-50/50">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-2 h-3 w-24 bg-neutral-200/80 rounded-full" />
                </div>
                
                {/* Mock Body */}
                <div className="p-4 flex flex-col gap-3">
                  <motion.div 
                    className="self-end bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-[10px] font-medium w-3/4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    Generate a pitch deck for a new SaaS product
                  </motion.div>

                  <motion.div 
                    className="self-start bg-neutral-100/80 px-3 py-2 rounded-xl w-5/6 flex flex-col gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={10} className="text-primary" />
                      <div className="h-2 w-16 bg-neutral-300 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <motion.div className="h-1.5 w-full bg-neutral-200 rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ delay: 1.5, duration: 0.5 }} />
                      <motion.div className="h-1.5 w-4/5 bg-neutral-200 rounded-full" initial={{ width: "0%" }} animate={{ width: "80%" }} transition={{ delay: 1.7, duration: 0.5 }} />
                      <motion.div className="h-1.5 w-2/3 bg-neutral-200 rounded-full" initial={{ width: "0%" }} animate={{ width: "66%" }} transition={{ delay: 1.9, duration: 0.5 }} />
                    </div>
                    
                    <motion.div 
                      className="mt-1 h-12 w-full border border-primary/20 bg-white rounded-lg flex items-center justify-center shadow-sm"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 2.5 }}
                    >
                       <LayoutTemplate size={16} className="text-primary/60" />
                       <div className="ml-2 flex flex-col gap-1">
                          <div className="h-1.5 w-16 bg-neutral-200 rounded-full" />
                          <div className="h-1 w-10 bg-neutral-100 rounded-full" />
                       </div>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent pointer-events-none" />
            </div>

            {/* Text Content */}
            <div className="flex flex-col items-center px-8 pb-8 pt-4 text-center bg-white">
              <h2 className="mb-2.5 text-[22px] font-bold tracking-tight text-neutral-900 leading-tight">
                Meet Orbstera AI Planner
              </h2>
              <p className="mb-8 text-[14px] leading-relaxed text-neutral-500">
                Plans your slides, uses AI to write content, and designs beautiful presentations automatically. Just tell it what you need.
              </p>
              
              <button
                onClick={onConfirm}
                className="group relative flex w-full sm:w-[85%] items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-3.5 text-[14px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,0.45)] transition-all hover:bg-primaryHover hover:shadow-primary/30 active:scale-[0.98]"
              >
                <span className="relative z-10">Start Creating</span>
                <ArrowRight size={16} className="relative z-10 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
