'use client';

import { useState, useCallback } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, SpellCheck, Loader2, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';

type LTMatch = {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  context: { text: string; offset: number; length: number };
  offset: number;
  length: number;
};

type TextElementError = {
  elementId: string;
  slideId: string;
  originalText: string;
  matches: LTMatch[];
};

const LANGS = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es',    label: 'EspaÃ±ol' },
  { code: 'fr',    label: 'FranÃ§ais' },
  { code: 'de',    label: 'Deutsch' },
  { code: 'tl',    label: 'Filipino' },
];

function applyFix(text: string, match: LTMatch, replacement: string): string {
  return text.slice(0, match.offset) + replacement + text.slice(match.offset + match.length);
}

export function GrammarPanel({ onClose }: { onClose?: () => void }) {
  const presentation = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const updateElement = usePresentationStore((s) => s.updateElement);

  const [lang, setLang] = useState('en-US');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<TextElementError[] | null>(null);
  const [checkedCount, setCheckedCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const slide = presentation?.slides[currentSlideIndex ?? -1];

  const handleCheck = useCallback(async () => {
    if (!slide) return;
    setLoading(true); setErrors(null); setApplied(new Set()); setExpandedId(null);

    const textEls = (slide.elements ?? []).filter(
      (el: any) => el.type === 'text' && el.content && el.content.trim()
    );
    setCheckedCount(textEls.length);

    if (!textEls.length) { setErrors([]); setLoading(false); return; }

    const results: TextElementError[] = [];
    for (const el of textEls as any[]) {
      try {
        const res = await fetch('https://api.languagetoolplus.com/v2/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `language=${lang}&text=${encodeURIComponent(el.content)}`,
        });
        const data = await res.json();
        if (data.matches?.length) {
          results.push({ elementId: el.id, slideId: slide.id, originalText: el.content, matches: data.matches });
        }
      } catch { /* skip */ }
    }

    setErrors(results);
    setLoading(false);
    if (results.length > 0) setExpandedId(results[0].elementId);
  }, [slide, lang]);

  const handleFix = useCallback((slideId: string, elId: string, originalText: string, match: LTMatch, replacement: string) => {
    const newText = applyFix(originalText, match, replacement);
    updateElement(slideId, elId, { content: newText } as any);
    setApplied((prev) => new Set([...prev, `${elId}-${match.offset}`]));
    setErrors((prev) => prev?.map((e) =>
      e.elementId === elId ? { ...e, originalText: newText } : e
    ) ?? null);
  }, [updateElement]);

  const totalErrors = errors?.reduce((sum, e) => sum + e.matches.length, 0) ?? 0;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <SpellCheck size={15} className="text-neutral-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-neutral-900 leading-none">Grammar Check</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">LanguageTool Â· Free</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-all">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Language + Check in header */}
        <div className="flex gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="flex-1 h-9 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-[12px] font-semibold text-neutral-700 focus:outline-none focus:border-neutral-400 transition-all"
          >
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <button
            onClick={handleCheck}
            disabled={loading || !slide}
            className="h-9 px-3.5 rounded-xl bg-neutral-900 text-white text-[12px] font-bold flex items-center gap-1.5 shrink-0 hover:bg-neutral-700 transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? 'Checking…' : 'Check Slide'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-3 pb-6">

          {/* No slide warning */}
          {!slide && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700 font-semibold">No slide selected</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {errors !== null && !loading && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {/* Summary */}
                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-1 ${
                  totalErrors === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  {totalErrors === 0
                    ? <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    : <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  }
                  <div>
                    <p className={`text-[12px] font-bold ${totalErrors === 0 ? 'text-green-800' : 'text-amber-800'}`}>
                      {totalErrors === 0 ? 'No issues found!' : `${totalErrors} issue${totalErrors !== 1 ? 's' : ''} found`}
                    </p>
                    <p className={`text-[10px] ${totalErrors === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {checkedCount} text element{checkedCount !== 1 ? 's' : ''} scanned
                    </p>
                  </div>
                </div>

                {/* Error cards */}
                {errors.map((err) => (
                  <div key={err.elementId} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(expandedId === err.elementId ? null : err.elementId)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-[9px] font-bold text-amber-600 flex items-center justify-center shrink-0">
                        {err.matches.length}
                      </span>
                      <p className="flex-1 text-[11px] font-semibold text-neutral-700 truncate min-w-0">
                        &ldquo;{err.originalText.substring(0, 32)}{err.originalText.length > 32 ? '…' : ''}&rdquo;
                      </p>
                      {expandedId === err.elementId
                        ? <ChevronDown size={12} className="text-neutral-400 shrink-0" />
                        : <ChevronRight size={12} className="text-neutral-400 shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {expandedId === err.elementId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.16 }}
                          className="overflow-hidden border-t border-neutral-100"
                        >
                          {err.matches.map((match, mi) => {
                            const key = `${err.elementId}-${match.offset}`;
                            const isApplied = applied.has(key);
                            return (
                              <div key={mi} className={`px-3 py-2.5 border-b border-neutral-100 last:border-0 ${isApplied ? 'opacity-40' : ''}`}>
                                <p className="text-[11px] font-bold text-neutral-800 mb-0.5">
                                  {match.shortMessage || 'Grammar issue'}
                                </p>
                                <p className="text-[10px] text-neutral-500 mb-2 leading-relaxed">
                                  {match.message}
                                </p>
                                <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 mb-2 font-mono text-[10.5px] text-neutral-600">
                                  <span className="text-neutral-400">…</span>
                                  <span className="bg-red-100 text-red-600 px-0.5 rounded mx-0.5">
                                    {match.context.text.slice(match.context.offset, match.context.offset + match.context.length)}
                                  </span>
                                  <span className="text-neutral-400">…</span>
                                </div>
                                {match.replacements.length > 0 && !isApplied && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {match.replacements.slice(0, 4).map((r, ri) => (
                                      <button key={ri}
                                        onClick={() => handleFix(err.slideId, err.elementId, err.originalText, match, r.value)}
                                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
                                      >
                                        {r.value || '(delete)'}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {isApplied && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 size={10} className="text-green-500" />
                                    <span className="text-[10px] font-bold text-green-600">Fixed!</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Initial empty state */}
          {errors === null && !loading && (
            <div className="flex flex-col items-center text-center opacity-30 mt-12 gap-2">
              <SpellCheck size={28} strokeWidth={1.3} className="text-neutral-400" />
              <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                Click &quot;Check Slide&quot; to scan all<br />text elements for grammar errors
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
