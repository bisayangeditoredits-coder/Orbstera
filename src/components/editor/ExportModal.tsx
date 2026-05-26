'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle2,
  FileText,
  Presentation,
  Sparkles,
  PackageCheck,
  FileDown,
  Image,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type ExportFormat = 'pptx' | 'pdf';

export type ExportModalPhase = 'options' | 'progress' | 'success' | 'error';

export type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  phase: ExportModalPhase;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onStartExport: () => void;
  step: number;
  error: string | null;
};

const PPTX_STEPS = [
  { icon: Sparkles, label: 'Analyzing layout', detail: 'Mapping slide elements and coordinates' },
  { icon: PackageCheck, label: 'Building PPTX', detail: 'Embedding fonts, shapes, and images' },
  { icon: FileDown, label: 'Finalizing download', detail: 'Preparing your file' },
] as const;

const PDF_STEPS = [
  { icon: Image, label: 'Preparing slides', detail: 'Loading canvas for each slide' },
  { icon: Sparkles, label: 'Capturing slides', detail: 'Rendering high-quality slide images' },
  { icon: FileDown, label: 'Building PDF', detail: 'Assembling your document' },
] as const;

const FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  description: string;
  icon: typeof Presentation;
}[] = [
  {
    id: 'pptx',
    label: 'Export as PPTX',
    description: 'Fully editable in PowerPoint and Keynote',
    icon: Presentation,
  },
  {
    id: 'pdf',
    label: 'Export as PDF',
    description: 'High quality static document',
    icon: FileText,
  },
];

export function ExportModal({
  open,
  onClose,
  phase,
  format,
  onFormatChange,
  onStartExport,
  step,
  error,
}: ExportModalProps) {
  const [mounted, setMounted] = useState(false);
  const steps = format === 'pdf' ? PDF_STEPS : PPTX_STEPS;
  const progressPct = Math.round(((step + 1) / steps.length) * 100);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'progress') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, phase]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="export-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6 safe-pad-y"
          role="presentation"
          onClick={phase === 'progress' ? undefined : onClose}
        >
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            aria-hidden
            onClick={phase === 'progress' ? undefined : onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            className="relative z-[1] my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Advanced export
                </p>
                <h2
                  id="export-modal-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {phase === 'options' && 'Export presentation'}
                  {phase === 'progress' && 'Exporting…'}
                  {phase === 'success' && 'Export complete'}
                  {phase === 'error' && 'Export failed'}
                </h2>
                {phase === 'options' && (
                  <p className="mt-1 text-sm text-slate-600">
                    Choose a format, then start your download.
                  </p>
                )}
              </div>
              {phase !== 'progress' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close export modal"
                >
                  <X size={20} strokeWidth={1.75} />
                </button>
              )}
            </header>

            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <AnimatePresence mode="wait">
                {phase === 'options' && (
                  <motion.div
                    key="options"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      {FORMAT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const selected = format === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onFormatChange(opt.id)}
                            className={cn(
                              'flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all',
                              selected
                                ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/20'
                                : 'border-slate-200 bg-white hover:border-slate-300',
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-11 w-11 items-center justify-center rounded-xl',
                                selected ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600',
                              )}
                            >
                              <Icon size={22} strokeWidth={1.75} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                              <p className="mt-1 text-sm text-slate-600">{opt.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {format === 'pptx' && (
                      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200/80">
                        Slide animations are experienced in Orbstera but will not be applied to the
                        exported PPTX file.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartExport();
                      }}
                      className="w-full min-h-[48px] rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                    >
                      Start export
                    </button>
                  </motion.div>
                )}

                {phase === 'progress' && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {format === 'pptx' && (
                      <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
                        Slide animations will not be applied to the exported PPTX.
                      </p>
                    )}

                    <ul className="space-y-2">
                      {steps.map((s, i) => {
                        const Icon = s.icon;
                        const active = i === step;
                        const isDone = i < step;
                        return (
                          <li
                            key={s.label}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                              active
                                ? 'border-slate-200 bg-slate-50'
                                : 'border-transparent bg-transparent',
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                isDone && 'bg-primary/10 text-primary',
                                active && !isDone && 'bg-slate-100 text-slate-900',
                                !active && !isDone && 'bg-slate-50 text-slate-400',
                              )}
                            >
                              {isDone ? (
                                <CheckCircle2 size={18} strokeWidth={1.75} />
                              ) : active ? (
                                <Loader2 size={18} className="animate-spin" strokeWidth={1.75} />
                              ) : (
                                <Icon size={18} strokeWidth={1.75} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  'text-sm font-semibold',
                                  active || isDone ? 'text-slate-900' : 'text-slate-400',
                                )}
                              >
                                {s.label}
                              </p>
                              {active && (
                                <p className="mt-0.5 text-xs text-slate-600">{s.detail}</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: '4%' }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
                        <span>
                          Step {step + 1} of {steps.length}
                        </span>
                        <span className="tabular-nums text-slate-700">{progressPct}%</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {phase === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-6 py-4 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CheckCircle2 size={32} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Ready to go
                      </h3>
                      <p className="mt-2 max-w-sm text-sm text-slate-600">
                        {format === 'pdf'
                          ? 'Your PDF has been saved to your device.'
                          : 'Your PPTX is fully editable in PowerPoint, Keynote, and LibreOffice.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full min-h-[48px] rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90"
                    >
                      Done
                    </button>
                  </motion.div>
                )}

                {phase === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-6 py-4 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <X size={28} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Something went wrong
                      </h3>
                      <p className="mt-2 max-w-sm break-words text-sm text-red-600/90">
                        {error || 'Export failed. Please try again.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full min-h-[48px] rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
