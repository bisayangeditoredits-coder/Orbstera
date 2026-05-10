'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Sparkles, Loader2, X, Type, Wand2, Crown, Lock, Mic, MicOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function MagicEditToolbar() {
  const { presentation, currentSlideIndex, editor, updateElement } = usePresentationStore();
  const [prompt,    setPrompt]    = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [isPro, setIsPro]         = useState(false);
  const [planChecked, setPlanChecked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const selectedElementId = editor.selectedElementId;
  const slide             = presentation?.slides[currentSlideIndex];
  
  // Find background element if it exists
  const bgElement         = slide?.elements?.find(el => el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0);
  
  // If an element is selected, use it. Otherwise, target the background element (or create a virtual one).
  const targetElement     = selectedElementId ? slide?.elements?.find((el) => el.id === selectedElementId) : bgElement;
  
  // The toolbar is visible if an element is selected, OR if no element is selected (acts as slide background editor)
  const isVisible         = !!slide && (selectedElementId !== dismissed);

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
          setIsPro(plan === 'student_pro' || plan === 'pro' || plan === 'creator_pro');
        }
      } catch (_) {}
      setPlanChecked(true);
    };
    checkPlan();
  }, []);

  const handleMagicEdit = async () => {
    if (!prompt.trim() || !slide || isLoading || !isPro) return;
    
    // If we have a target element, use it. If not, we are generating a NEW background element.
    let elementToEdit = targetElement;
    if (!elementToEdit && !selectedElementId) {
      // Create a virtual background element to send to the API
      elementToEdit = {
        id: `el-bg-${Date.now()}`,
        type: 'image',
        src: `PROMPT: ${prompt}`,
        x: 0, y: 0,
        width: 1280, height: 720,
        zIndex: 0,
        visible: true,
        opacity: 0.18
      };
      // Instantly add it to the canvas with an empty src so it shows the "Generating..." state
      const { addElement } = usePresentationStore.getState();
      addElement(slide.id, { ...elementToEdit, src: '' });
    } else if (elementToEdit && elementToEdit.type === 'image') {
      // Real-time update: clear src instantly so KonvaCanvas shows "DREAMING IMAGE..."
      updateElement(slide.id, elementToEdit.id, { src: '' });
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/magic-edit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt: prompt.trim(), element: elementToEdit }),
      });
      if (!res.ok) throw new Error('Magic Edit failed');
      const updated = await res.json();
      updateElement(slide.id, elementToEdit!.id, updated);
      setPrompt('');
    } catch (err) {
      console.error(err);
      // Revert if failed (optional, but for now we just log)
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      setPrompt(e.results[0]?.[0]?.transcript || '');
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  if (!isVisible || !planChecked) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={targetElement?.id || 'bg-editor'}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto select-none w-[min(500px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] px-2"
      >
        <div className="flex flex-col items-center gap-1.5 w-full min-w-0">
          {/* ── Always show the same toolbar UI ── */}
          <div className={`animated-border shadow-2xl shadow-primary/10 w-full max-w-full ${!isPro ? 'opacity-80' : ''}`}>
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 bg-white/98 backdrop-blur-xl px-2 py-2 w-full min-w-0">
              <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-primary/8 border border-primary/15">
                {!selectedElementId               ? <Sparkles size={16} className="text-primary" />
               : targetElement?.type === 'text'  ? <Type     size={16} className="text-primary" />
               : targetElement?.type === 'image' ? <Sparkles size={16} className="text-primary" />
               :                                    <Wand2    size={16} className="text-primary" />}
              </div>

              <input
                type="text"
                value={prompt}
                onChange={(e) => (isPro || isListening) && setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && isPro) { e.preventDefault(); handleMagicEdit(); } }}
                disabled={isLoading || (!isPro && !isListening)}
                placeholder={isListening ? '🎤 Listening...' : isPro ? (!selectedElementId ? `Generate AI Background... e.g. "cyberpunk city"` : `Edit with AI... e.g. "make it more exciting"`) : `🔒 Pro feature — upgrade to edit with AI`}
                className={`flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] font-medium px-1 h-9 ${
                  isPro
                    ? 'text-textMain placeholder:text-textMuted/50'
                    : 'text-textMuted/60 placeholder:text-textMuted/50 cursor-not-allowed'
                }`}
              />

              {/* Voice mic button */}
              <button
                onClick={toggleVoice}
                title={isListening ? 'Stop' : 'Voice input'}
                className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all relative ${
                  isListening
                    ? 'bg-red-50 text-red-500 animate-pulse'
                    : 'text-textMuted hover:text-primary hover:bg-primary/5'
                }`}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>

              {isPro ? (
                <button
                  onClick={handleMagicEdit}
                  disabled={!prompt.trim() || isLoading}
                  className="shrink-0 h-9 px-3 sm:px-5 bg-primary hover:bg-primary/90 text-white text-[12px] font-bold rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation"
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
                onClick={() => setDismissed(selectedElementId || 'bg')}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-textMuted hover:text-textMain hover:bg-hoverSurface transition-all shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <p className="text-[10px] text-black/25 font-medium text-center max-w-full px-1 break-words">
            {isPro ? (
              <>
                {!selectedElementId ? (
                  <>AI generating <span className="text-primary/50 font-bold">Slide Background</span></>
                ) : (
                  <>AI editing <span className="text-primary/50 font-bold">{targetElement?.type}</span>
                    {targetElement?.type === 'text' && targetElement?.content && (
                      <> — "{targetElement.content.slice(0, 40)}{targetElement.content.length > 40 ? '…' : ''}"</>
                    )}
                  </>
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
