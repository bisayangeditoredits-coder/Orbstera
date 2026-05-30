'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Sparkles, Loader2, X, Wand2, Trash2 } from 'lucide-react';
import { persistGeneratedImage } from '@/lib/client/persist-generated-image';
import { regionToLeonardoPixels } from '@/lib/leonardo-dimensions';

const QUICK_PROMPTS = [
  'Cinematic glassmorphism card with subtle brand gradient',
  'Premium SaaS dashboard hero with floating analytics tiles',
  'Diverse leadership team portrait on soft studio backdrop',
  'Futuristic data tunnel with neon blues and clean grid',
];

export function GenerativeFillToolbar() {
  const {
    presentation,
    currentSlideIndex,
    editor,
    setEditorState,
    updateElement,
    removeElement,
    selectElement,
  } = usePresentationStore();

  const target = editor.generativeFillTarget;
  const slide = presentation?.slides[currentSlideIndex];
  const [prompt, setPrompt] = useState('');
  const [enhance, setEnhance] = useState(true);
  const [polish, setPolish] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'enhance' | 'render' | 'remove_bg'>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const el =
    target && slide ? slide.elements?.find((e) => e.id === target.elementId) : undefined;
  const isGenFillRegion = !!el && el.type === 'image' && !el.src?.trim();

  useEffect(() => {
    if (!target) {
      setPrompt('');
      setError('');
      setPhase('idle');
      return;
    }
    inputRef.current?.focus();
  }, [target]);

  useEffect(() => {
    if (!target || !slide) return;
    if (target.slideId !== slide.id) {
      setEditorState({ generativeFillTarget: null });
    }
  }, [slide, target, setEditorState]);

  const dismiss = useCallback(() => {
    setEditorState({ generativeFillTarget: null });
    setPrompt('');
    setError('');
    setPhase('idle');
  }, [setEditorState]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, dismiss]);

  const runFill = async () => {
    if (!target || !slide || !el || !isGenFillRegion || !prompt.trim()) return;
    setError('');
    let finalPrompt = prompt.trim();
    if (transparent) {
      finalPrompt += " (isolated on a pure solid white background, central focus, sticker style)";
    }

    try {
      if (enhance) {
        setPhase('enhance');
        const er = await fetch('/api/enhance-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: finalPrompt, purpose: 'image' }),
        });
        if (er.ok) {
          const data = await er.json();
          if (typeof data.enhancedPrompt === 'string' && data.enhancedPrompt.trim()) {
            finalPrompt = data.enhancedPrompt.trim();
          }
        }
      }

      setPhase('render');
      // Mark as AI-driven slot so the canvas placeholder reflects realtime rendering.
      updateElement(slide.id, el.id, { aiImagePending: true, src: '' });
      const { width, height } = regionToLeonardoPixels(el.width, el.height);
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          width,
          height,
          format: 'png',
          polish,
          transparent,
          visualProfile: 'cinematic',
          task: 'genfill_image',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      if (!data.url) throw new Error('No image URL returned');
      const cacheBustedUrl =
        typeof data.url === 'string' && data.url.trim()
          ? data.url.startsWith('data:') 
            ? data.url 
            : `${data.url}${data.url.includes('?') ? '&' : '?'}v=${Date.now()}`
          : data.url;

      // Persist to R2 so the URL is permanent and available for PPTX export
      const deckId = presentation?.id || 'draft';
      const persistedUrl = await persistGeneratedImage(cacheBustedUrl, deckId);

      updateElement(slide.id, el.id, {
        src: persistedUrl,
        animation: el.animation ?? { entrance: 'fadeIn', duration: 600, delay: 0 },
        aiImagePending: false,
        aiMetadata: data.imageId ? { leonardoImageId: data.imageId } : undefined
      }, true);
      setEditorState({
        generativeFillTarget: null,
        activeTool: 'select',
        previewElementId: el.id,
      });
      setPrompt('');
      window.dispatchEvent(new Event('credits-updated'));

      // Fire-and-forget usage log for dashboard cost tracking (if backend supports it).
      fetch('/api/usage/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'genfill_image',
          meta: { width, height, enhanced: enhance, polished: polish },
        }),
      }).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      // Restore canvas placeholder — clear the pending flag so it doesn't stay stuck
      if (slide && el) {
        updateElement(slide.id, el.id, { aiImagePending: false });
      }
      if (msg === 'FREE_LIMIT_REACHED') {
        setError('Free limit reached (15/month). Upgrade to Pro for unlimited Generative Fill.');
      } else if (msg === 'RATE_LIMITED') {
        setError('AI servers are busy right now. Please wait a moment and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setPhase('idle');
    }
  };

  const removeRegion = () => {
    if (!target || !slide || !el) return;
    removeElement(slide.id, el.id);
    selectElement(null);
    dismiss();
  };

  if (!target || !slide || !el || !isGenFillRegion) return null;

  const busy = phase !== 'idle';
  const phaseLabel =
    phase === 'enhance' ? 'Refining prompt…' : phase === 'render' ? 'Rendering region…' : '';

  return (
    <AnimatePresence>
      <motion.div
        key={`genfill-${target.elementId}`}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-[6.5rem] sm:bottom-[7.25rem] left-1/2 -translate-x-1/2 z-[52] pointer-events-auto w-[min(520px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] px-2"
      >
        <div className="rounded-2xl border border-sky-500/25 bg-white/[0.97] backdrop-blur-xl shadow-[0_25px_80px_-20px_rgba(15,23,42,0.35)] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.06] bg-gradient-to-r from-sky-500/[0.07] to-transparent">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Wand2 size={15} className="text-sky-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-800 tracking-tight">Generative fill</p>
              <p className="text-[10px] text-slate-500 truncate">
                Region {Math.round(el.width)}×{Math.round(el.height)} · describe what belongs here
              </p>
            </div>
            <button
              type="button"
              onClick={removeRegion}
              title="Remove region"
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={dismiss}
              title="Close"
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-black/[0.05] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-3 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={busy}
                  onClick={() => setPrompt(q)}
                  className="text-[9px] font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-sky-500/15 hover:text-sky-800 transition-colors disabled:opacity-40 max-w-full truncate"
                >
                  {q.length > 42 ? `${q.slice(0, 40)}…` : q}
                </button>
              ))}
            </div>

            <div className="animated-border shadow-[0_18px_38px_-18px_rgba(15,23,42,0.45)]">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch bg-gradient-to-r from-white via-white to-sky-50/40">
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !busy) {
                        e.preventDefault();
                        runFill();
                      }
                    }}
                    disabled={busy}
                    placeholder="Describe the missing content — lighting, subject, mood…"
                    className="w-full h-11 rounded-2xl border border-transparent bg-transparent px-3 pr-4 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={runFill}
                  disabled={!prompt.trim() || busy}
                  className="shrink-0 h-11 px-4 rounded-2xl bg-gradient-to-b from-[#5B7CFF] to-primary hover:from-primary hover:to-[#3d5ef0] text-white text-[12px] font-bold flex items-center justify-center gap-2 disabled:opacity-35 transition-all shadow-[0_4px_14px_-4px_rgba(59,130,246,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset]"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={15} />}
                  {busy ? 'Working…' : 'Fill region'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enhance}
                  onChange={(e) => setEnhance(e.target.checked)}
                  disabled={busy}
                  className="rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                AI refine prompt
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(e) => setTransparent(e.target.checked)}
                  disabled={busy}
                  className="rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                Transparent (No BG)
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={polish}
                  onChange={(e) => setPolish(e.target.checked)}
                  disabled={busy}
                  className="rounded border-slate-300 text-primary focus:ring-primary/30"
                />
                Presentation polish
              </label>
            </div>

            <AnimatePresence>
              {(error || phaseLabel) && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-[11px] font-medium ${error ? 'text-red-600' : 'text-sky-700'}`}
                >
                  {error || phaseLabel}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
