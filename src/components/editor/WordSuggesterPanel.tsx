'use client';

import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { SpellCheck, Loader2, X, RefreshCw, Type, ArrowRight } from 'lucide-react';

type DatamuseWord = {
  word: string;
  score: number;
  tags?: string[];
};

type SuggestionMode = 'synonyms' | 'rhymes' | 'related' | 'adjectives';

const MODES: { id: SuggestionMode; label: string; param: string }[] = [
  { id: 'synonyms', label: 'Synonyms', param: 'ml' },
  { id: 'related', label: 'Related', param: 'rel_trg' },
  { id: 'adjectives', label: 'Adjectives', param: 'rel_jjb' },
  { id: 'rhymes', label: 'Rhymes', param: 'rel_rhy' },
];

export function WordSuggesterPanel({ onClose }: { onClose?: () => void }) {
  const [inputWord, setInputWord] = useState('');
  const [suggestions, setSuggestions] = useState<DatamuseWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<SuggestionMode>('synonyms');
  const [error, setError] = useState('');
  const [replaced, setReplaced] = useState<string | null>(null);

  const selectedElement = usePresentationStore((s) => s.editor.selectedElementId);
  const presentation = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const updateElement = usePresentationStore((s) => s.updateElement);

  // Auto-extract last word from selected text element
  useEffect(() => {
    if (!selectedElement || currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    const el = slide?.elements?.find((e) => e.id === selectedElement);
    if (el?.type === 'text' && el.content) {
      const words = el.content.trim().split(/\s+/);
      const lastWord = words[words.length - 1].replace(/[^a-zA-Z]/g, '');
      if (lastWord) setInputWord(lastWord);
    }
  }, [selectedElement, currentSlideIndex, presentation]);

  const fetchSuggestions = async (word: string, currentMode: SuggestionMode) => {
    if (!word.trim()) return;
    const modeConfig = MODES.find((m) => m.id === currentMode)!;
    setLoading(true);
    setSuggestions([]);
    setError('');
    setReplaced(null);
    try {
      const url = `https://api.datamuse.com/words?${modeConfig.param}=${encodeURIComponent(word.trim())}&max=30`;
      const res = await fetch(url);
      const data: DatamuseWord[] = await res.json();
      setSuggestions(data);
      if (data.length === 0) setError(`No ${currentMode} found for "${word}"`);
    } catch {
      setError('Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: SuggestionMode) => {
    setMode(newMode);
    if (inputWord.trim()) fetchSuggestions(inputWord, newMode);
  };

  const replaceInSelectedElement = (newWord: string) => {
    if (!selectedElement || currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    const el = slide?.elements?.find((e) => e.id === selectedElement);
    if (el?.type !== 'text' || !el.content) return;

    // Replace last occurrence of inputWord (case-insensitive)
    const escapedInput = inputWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedInput}\\b`, 'gi');
    const updated = el.content.replace(regex, newWord);
    updateElement(slide.id, selectedElement, { content: updated });
    setReplaced(newWord);
  };

  const getSelectedElContent = () => {
    if (!selectedElement || currentSlideIndex === null || !presentation) return null;
    const slide = presentation.slides[currentSlideIndex];
    return slide?.elements?.find((e) => e.id === selectedElement && e.type === 'text') || null;
  };

  const selectedEl = getSelectedElContent();

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
            <SpellCheck size={16} className="text-neutral-700" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900 leading-tight">Word Suggester</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">Synonyms & words · 100% Free</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all flex items-center justify-center">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
        {/* Selected text context */}
        {selectedEl && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Type size={10} /> Selected Text Layer
            </p>
            <p className="text-[12px] text-neutral-600 line-clamp-2 leading-relaxed">
              {selectedEl.content}
            </p>
          </div>
        )}

        {/* Word input */}
        <div>
          <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">Word to look up</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputWord}
              onChange={(e) => setInputWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSuggestions(inputWord, mode)}
              placeholder="Enter a word..."
              className="flex-1 h-10 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
            />
            <button
              onClick={() => fetchSuggestions(inputWord, mode)}
              disabled={!inputWord.trim() || loading}
              className="h-10 px-4 rounded-xl bg-neutral-900 text-white font-bold text-[12px] hover:bg-neutral-800 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex bg-neutral-100 p-0.5 rounded-xl gap-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                mode === m.id
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Replaced success */}
        <AnimatePresence>
          {replaced && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-neutral-900 text-white text-[12px] font-semibold rounded-xl px-3 py-2.5 flex items-center gap-2"
            >
              <RefreshCw size={12} />
              Replaced &quot;{inputWord}&quot; with &quot;{replaced}&quot;
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-[12px] text-neutral-500 text-center py-2">{error}</p>
        )}

        {/* Word chips */}
        {suggestions.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
              {suggestions.length} suggestions
            </p>
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence>
                {suggestions.map((word, i) => (
                  <motion.button
                    key={word.word}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.015 }}
                    onClick={() => selectedEl ? replaceInSelectedElement(word.word) : setInputWord(word.word)}
                    className="px-3 py-1.5 bg-white border border-neutral-200 rounded-full text-[12px] font-medium text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all active:scale-95 shadow-sm"
                  >
                    {word.word}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            {selectedEl && (
              <p className="text-[10px] text-neutral-400 mt-3 text-center">
                Click a word to replace &quot;{inputWord}&quot; in your text layer
              </p>
            )}
          </div>
        )}

        {!inputWord && !loading && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-8 opacity-40">
            <SpellCheck size={32} className="mb-3 text-neutral-400" strokeWidth={1.2} />
            <p className="text-[12px] font-medium text-neutral-500 max-w-[160px] leading-relaxed">
              {selectedEl
                ? 'Auto-detected your last word. Click Search!'
                : 'Select a text layer or type any word to find suggestions'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
