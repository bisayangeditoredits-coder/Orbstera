'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Sparkles, Loader2, X, Type, Wand2, Crown, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function MagicEditToolbar() {
  const { presentation, currentSlideIndex, editor, updateElement } = usePresentationStore();
  const [prompt,    setPrompt]    = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [isPro, setIsPro]         = useState(false);
  const [planChecked, setPlanChecked] = useState(false);

  const selectedElementId = editor.selectedElementId;
  const slide             = presentation?.slides[currentSlideIndex];
  const selectedElement   = slide?.elements?.find((el) => el.id === selectedElementId);
  const isVisible         = !!selectedElement && selectedElement.id !== dismissed;

  // Fetch the user's plan once on mount
  useEffect(() => {
    const checkPlan = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single();
          const plan = profile?.plan?.toLowerCase() || 'free';
          setIsPro(plan === 'pro' || plan === 'creator_pro');
        }
      } catch (_) {}
      setPlanChecked(true);
    };
    checkPlan();
  }, []);

  const handleMagicEdit = async () => {
    if (!prompt.trim() || !selectedElement || !slide || isLoading || !isPro) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/magic-edit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt: prompt.trim(), element: selectedElement }),
      });
      if (!res.ok) throw new Error('Magic Edit failed');
      const updated = await res.json();
      updateElement(slide.id, selectedElement.id, updated);
      setPrompt('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible || !planChecked) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={selectedElement.id}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none"
      >
        <div className="flex flex-col items-center gap-1.5">
          {/* ── Always show the same toolbar UI ── */}
          <div className={`animated-border shadow-2xl shadow-primary/10 w-[500px] ${!isPro ? 'opacity-80' : ''}`}>
            <div className="flex items-center gap-2 bg-white/98 backdrop-blur-xl px-2 py-2 w-full">
              <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-primary/8 border border-primary/15">
                {selectedElement.type === 'text'  ? <Type     size={16} className="text-primary" />
               : selectedElement.type === 'image' ? <Sparkles size={16} className="text-primary" />
               :                                    <Wand2    size={16} className="text-primary" />}
              </div>

              <input
                type="text"
                value={prompt}
                onChange={(e) => isPro && setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && isPro) { e.preventDefault(); handleMagicEdit(); } }}
                disabled={isLoading || !isPro}
                placeholder={isPro ? `Edit with AI... e.g. "make it more exciting"` : `🔒 Pro feature — upgrade to edit with AI`}
                className={`flex-1 bg-transparent border-none outline-none text-[13px] font-medium px-1 h-9 ${
                  isPro
                    ? 'text-textMain placeholder:text-textMuted/50'
                    : 'text-textMuted/60 placeholder:text-textMuted/50 cursor-not-allowed'
                }`}
              />

              {isPro ? (
                <button
                  onClick={handleMagicEdit}
                  disabled={!prompt.trim() || isLoading}
                  className="shrink-0 h-9 px-5 bg-primary hover:bg-primary/90 text-white text-[12px] font-bold rounded-xl transition-all disabled:opacity-30 flex items-center gap-1.5 active:scale-95"
                >
                  {isLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><Sparkles size={13} /><span>Edit</span></>}
                </button>
              ) : (
                <a
                  href="/pricing"
                  className="shrink-0 h-9 px-4 bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Crown size={12} /> Upgrade
                </a>
              )}

              <button
                onClick={() => setDismissed(selectedElement.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-textMuted hover:text-textMain hover:bg-hoverSurface transition-all shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-black/25 font-medium">
            {isPro ? (
              <>AI editing <span className="text-primary/50 font-bold">{selectedElement.type}</span>
                {selectedElement.type === 'text' && selectedElement.content && (
                  <> — "{selectedElement.content.slice(0, 40)}{selectedElement.content.length > 40 ? '…' : ''}"</>
                )}
              </>
            ) : (
              <span className="text-amber-500/70 font-bold flex items-center gap-1"><Lock size={9} /> Pro members only — <a href="/pricing" className="underline">Upgrade now</a></span>
            )}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
