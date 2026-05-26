'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Sparkles, Loader2, X, Type, Wand2, Crown, Mic, MicOff } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import {
  createEditorSpeechRecognition,
  resolveEditorSpeechLang,
  resetEditorSpeechSession,
  flushEditorSpeechInterim,
} from '@/lib/editor-speech';
import { explainGetUserMediaError, explainRecognitionStartError } from '@/lib/mic-access';
import { findDeckBackgroundElement } from '@/lib/slide-background';

export function MagicEditToolbar() {
  const { presentation, currentSlideIndex, editor, updateElement, removeElement } = usePresentationStore();
  const [prompt,    setPrompt]    = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [isPro, setIsPro]         = useState(true);
  const [freeGenfillRemaining, setFreeGenfillRemaining] = useState<number | null>(null);
  const [planChecked, setPlanChecked] = useState(true);
  const FREE_GENFILL_LIMIT = 15;
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldBeListeningRef = useRef(false);
  const speechLangRef = useRef(resolveEditorSpeechLang());
  const voicePromptPrefixRef = useRef('');
  const voiceStartBusyRef = useRef(false);

  const ensureVoiceRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    recognitionRef.current = createEditorSpeechRecognition({
      shouldBeListeningRef,
      speechLangRef,
      promptPrefixRef: voicePromptPrefixRef,
      onTranscript: (text) => setPrompt(text),
      onListeningEnd: () => setIsListening(false),
      onErrorMessage: (msg) => {
        setErrorHint(msg);
        setTimeout(() => setErrorHint(''), 5500);
      },
    });
    return recognitionRef.current;
  };

  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, []);

  const selectedElementId = editor.selectedElementId;

  // Re-enable visibility automatically whenever the selected element changes
  useEffect(() => {
    setDismissed(null);
  }, [selectedElementId]);

  const slide             = presentation?.slides[currentSlideIndex];
  
  // Find background element if it exists
  const bgElement = findDeckBackgroundElement(slide?.elements);
  
  // If an element is selected, use it. Otherwise, target the background element (or create a virtual one).
  const targetElement     = selectedElementId ? slide?.elements?.find((el) => el.id === selectedElementId) : bgElement;
  
  // The toolbar is visible if an element is selected, OR if no element is selected (acts as slide background editor)
  const isVisible         = !!slide && (selectedElementId !== dismissed);
  const genFillOpen       = !!editor.generativeFillTarget;

  // Fetch plan + free Gen-Fill allowance once on mount
  useEffect(() => {
    const controller = new AbortController();
    const checkPlan = async () => {
      try {
        const res = await fetch('/api/credits/summary', { credentials: 'include', signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (json.freeTier) {
            setIsPro(false);
            const remaining =
              typeof json.freeTier.freeGenFillRemaining === 'number'
                ? json.freeTier.freeGenFillRemaining
                : Math.max(
                    0,
                    (json.freeTier.freeGenFillLimit ?? FREE_GENFILL_LIMIT) -
                      (json.freeTier.freeGenFillUsed ?? 0),
                  );
            setFreeGenfillRemaining(remaining);
          } else {
            setIsPro(true);
            setFreeGenfillRemaining(null);
          }
        } else {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('plan')
              .eq('id', user.id)
              .single();
            const plan = profile?.plan?.toLowerCase() || 'free';
            if (plan === 'student_pro' || plan === 'pro' || plan === 'creator_pro' || plan === 'admin') {
              setIsPro(true);
            }
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
      setPlanChecked(true);
    };
    checkPlan();
    return () => controller.abort();
  }, []);

  const freeImageTarget = !selectedElementId || targetElement?.type === 'image';
  const freeImageAtLimit =
    !isPro && freeImageTarget && (freeGenfillRemaining ?? 0) <= 0;

  const handleMagicEdit = async () => {
    if (!prompt.trim() || !slide || isLoading || freeImageAtLimit) return;

    setErrorHint('');
    let elementToEdit = targetElement;
    let createdBgId: string | null = null;
    const prevImageSrc =
      elementToEdit?.type === 'image' && elementToEdit.src ? elementToEdit.src : undefined;

    if (!elementToEdit && !selectedElementId) {
      elementToEdit = {
        id: `el-bg-${Date.now()}`,
        type: 'image',
        src: `PROMPT: ${prompt}`,
        x: 0, y: 0,
        width: 1280, height: 720,
        zIndex: 0,
        visible: true,
        opacity: 0.18,
        locked: false,
      };
      const { addElement } = usePresentationStore.getState();
      addElement(slide.id, { ...elementToEdit, src: '' });
      createdBgId = elementToEdit.id;
    } else if (elementToEdit && elementToEdit.type === 'image') {
      updateElement(slide.id, elementToEdit.id, { src: '' });
    }

    setIsLoading(true);
    setPhaseLabel('Interpreting your request…');
    try {
      const res = await fetch('/api/magic-edit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          prompt: prompt.trim(),
          element: elementToEdit,
          slideContext: {
            deckTitle: presentation?.title,
            slideTitle: slide.title,
            palette: presentation?.colorPalette,
          },
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Magic Edit failed');
      }
      setPhaseLabel('Applying to canvas…');
      updateElement(slide.id, elementToEdit!.id, payload);
      setPrompt('');
      setPhaseLabel('');
      if (!isPro && freeGenfillRemaining !== null && elementToEdit?.type === 'image') {
        setFreeGenfillRemaining(Math.max(0, freeGenfillRemaining - 1));
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Magic Edit failed';
      if (msg === 'FREE_LIMIT_REACHED') {
        setFreeGenfillRemaining(0);
        setErrorHint('Free limit reached (15/month). Upgrade to Pro for unlimited AI edits.');
      } else {
        setErrorHint(msg);
      }
      if (createdBgId) {
        removeElement(slide.id, createdBgId);
      } else if (prevImageSrc && elementToEdit) {
        updateElement(slide.id, elementToEdit.id, { src: prevImageSrc });
      }
      setPhaseLabel('');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      shouldBeListeningRef.current = false;
      try {
        flushEditorSpeechInterim(recognitionRef.current);
      } catch {
        /* noop */
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      setIsListening(false);
      return;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setErrorHint('Voice needs HTTPS or localhost.');
      setTimeout(() => setErrorHint(''), 5000);
      return;
    }

    const rec = ensureVoiceRecognition();
    if (!rec) {
      setErrorHint('Voice not supported. Try Chrome or Edge.');
      setTimeout(() => setErrorHint(''), 5000);
      return;
    }

    if (voiceStartBusyRef.current) return;
    voiceStartBusyRef.current = true;
    speechLangRef.current = resolveEditorSpeechLang();
    resetEditorSpeechSession(rec);
    voicePromptPrefixRef.current = prompt;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorHint('Microphone is not available in this browser. Try Chrome or Edge.');
        setTimeout(() => setErrorHint(''), 6000);
        return;
      }

      let tempStream: MediaStream;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (gumErr) {
        console.error('[Voice] getUserMedia:', gumErr);
        shouldBeListeningRef.current = false;
        setIsListening(false);
        const hint = explainGetUserMediaError(gumErr);
        setErrorHint(hint || 'Could not open the microphone.');
        setTimeout(() => setErrorHint(''), 7000);
        return;
      }

      tempStream.getTracks().forEach((t) => t.stop());
      await new Promise((resolve) => setTimeout(resolve, 150));

      try {
        rec.stop();
      } catch {
        /* not running */
      }
      shouldBeListeningRef.current = true;
      rec.lang = speechLangRef.current;
      try {
        rec.start();
      } catch (recErr) {
        console.error('[Voice] recognition.start:', recErr);
        shouldBeListeningRef.current = false;
        setIsListening(false);
        const hint = explainRecognitionStartError(recErr);
        setErrorHint(hint || 'Speech recognition failed to start. Try again in a moment.');
        setTimeout(() => setErrorHint(''), 6000);
        return;
      }
      setIsListening(true);
    } finally {
      voiceStartBusyRef.current = false;
    }
  };

  if (!isVisible || !planChecked || genFillOpen) return null;

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
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !freeImageAtLimit) { e.preventDefault(); handleMagicEdit(); } }}
                disabled={isLoading || freeImageAtLimit}
                placeholder={
                  isListening
                    ? 'ðŸŽ¤ Listening...'
                    : isPro
                      ? !selectedElementId
                        ? `Generate AI Background... e.g. "cyberpunk city"`
                        : `Edit with AI... e.g. "make it more exciting"`
                      : `Edit with AI (Free limit applies)...`
                }
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] font-medium px-1 h-9 text-textMain placeholder:text-textMuted/50"
              />

              {/* 1-Click Image Regenerate Button */}
              {isPro && targetElement?.type === 'image' && (
                <button
                  type="button"
                  onClick={() => {
                    const themeText = presentation?.colorPalette?.[0] ? `matching the slide theme` : '';
                    const slideTitle = slide?.title || 'this presentation';
                    setPrompt(`PROMPT: A professional, high-quality photograph or digital art suitable for a presentation slide about "${slideTitle}", ${themeText}. Cinematic lighting.`);
                    setTimeout(() => handleMagicEdit(), 50);
                  }}
                  disabled={isLoading}
                  title="Auto-Regenerate Image for this Slide"
                  className="shrink-0 h-9 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[12px] font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles size={13} /> Replace
                </button>
              )}

              {/* Voice mic button */}
              <button
                type="button"
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

              {isPro || !freeImageAtLimit ? (
                <button
                  onClick={handleMagicEdit}
                  disabled={!prompt.trim() || isLoading}
                  className="shrink-0 h-9 px-3 sm:px-5 bg-primary hover:bg-primary/90 text-white text-[12px] font-bold rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation"
                >
                  {isLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><Sparkles size={13} /><span>Apply</span></>}
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

          <p className="text-[10px] text-black/25 font-medium text-center max-w-full px-1 break-words min-h-[14px]">
            {isPro ? (
              <>
                {phaseLabel ? (
                  <span className="text-primary/70 font-semibold animate-pulse">{phaseLabel}</span>
                ) : errorHint ? (
                  <span className="text-red-500/90 font-semibold">{errorHint}</span>
                ) : !selectedElementId ? (
                  <>Magic AI: <span className="text-primary/50 font-bold">slide background</span> — results stream in as the image loads</>
                ) : (
                  <>Magic AI: editing <span className="text-primary/50 font-bold">{targetElement?.type}</span>
                    {targetElement?.type === 'text' && targetElement?.content && (
                      <>
                        {' — "'}
                        {targetElement.content.slice(0, 40)}
                        {targetElement.content.length > 40 ? '…' : ''}
                        {'"'}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {phaseLabel ? (
                  <span className="text-primary/70 font-semibold animate-pulse">{phaseLabel}</span>
                ) : errorHint ? (
                  <span className="text-red-500/90 font-semibold">{errorHint}</span>
                ) : freeImageAtLimit && freeImageTarget ? (
                  <>
                    Free limit reached (0/{FREE_GENFILL_LIMIT}) —{' '}
                    <a href="/pricing" className="text-amber-600/80 underline font-bold">Upgrade to Pro</a> for unlimited AI edits
                  </>
                ) : (
                  <>
                    Free AI edits left: {freeGenfillRemaining ?? FREE_GENFILL_LIMIT}/{FREE_GENFILL_LIMIT} —{' '}
                    <a href="/pricing" className="text-amber-600/70 underline">Upgrade to Pro</a> for unlimited
                  </>
                )}
              </>
            )}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
