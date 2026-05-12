'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Sidebar } from '@/components/editor/Sidebar';
import { Toolbar } from '@/components/editor/Toolbar';
import { LayersPanel } from '@/components/editor/LayersPanel';
import { TopBar } from '@/components/editor/TopBar';
import { GeneratePanel } from '@/components/editor/GeneratePanel';
import { SurveyModal } from '@/components/editor/SurveyModal';
import { MagicEditToolbar } from '@/components/editor/MagicEditToolbar';
import { GenerativeFillToolbar } from '@/components/editor/GenerativeFillToolbar';
import { DesignPanel } from '@/components/editor/DesignPanel';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePresentationCloudSync } from '@/hooks/usePresentationCloudSync';
import type { PresentationData } from '@/types';

const EditorCanvasLoading = () => (
  <div className="flex-1 min-h-0 flex items-center justify-center bg-background text-textMuted">
    <div className="flex flex-col items-center gap-3">
      <div className="w-9 h-9 border-2 border-primary/25 border-t-primary rounded-full animate-spin" />
      <span className="text-[12px] font-medium">Loading canvas…</span>
    </div>
  </div>
);

const CanvasArea = dynamic(
  () => import('@/components/editor/CanvasArea').then((m) => m.CanvasArea),
  { ssr: false, loading: () => <EditorCanvasLoading /> }
);

const PresentMode = dynamic(
  () => import('@/components/editor/PresentMode').then((m) => m.PresentMode),
  { ssr: false }
);

const OnboardingTour = dynamic(
  () => import('@/components/editor/OnboardingTour').then((m) => m.OnboardingTour),
  { ssr: false }
);

export default function EditorClient() {
  const { 
    activePanel, isPanelOpen, setPanelOpen, setActivePanel, 
    undo, redo, onboarding, startOnboarding 
  } = usePresentationStore();
  const suppressAutoTourOnceRef = useRef(false);
  const [welcomeGate, setWelcomeGate] = useState<'checking' | 'ready'>('checking');
  const [needsSurveyModal, setNeedsSurveyModal] = useState(false);
  const presentation = usePresentationStore((s) => s.presentation);
  const searchParams = useSearchParams();

  usePresentationCloudSync();

  const [deckLoadStatus, setDeckLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [deckLoadMessage, setDeckLoadMessage] = useState<string | null>(null);

  const validatePresentationPayload = (data: any): data is PresentationData => {
    return !!data && typeof data === 'object' && typeof data.id === 'string' && Array.isArray((data as any).slides);
  };

  // Handle auto-generation or loading from URL (abort in-flight fetch if params change)
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const mode = searchParams.get('mode');
    const id = searchParams.get('id');
    const ac = new AbortController();

    if (id) {
      setDeckLoadStatus('loading');
      setDeckLoadMessage(null);
      fetch(`/api/presentations?id=${encodeURIComponent(id)}`, { signal: ac.signal, cache: 'no-store' })
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (ac.signal.aborted) return;

          if (res.status === 401) {
            setDeckLoadStatus('error');
            setDeckLoadMessage('You’re signed out. Please sign in again to open this deck.');
            return;
          }
          if (!res.ok) {
            setDeckLoadStatus('error');
            setDeckLoadMessage(typeof data?.error === 'string' ? data.error : `Failed to load deck (${res.status}).`);
            return;
          }
          if (!data || !data.id) {
            setDeckLoadStatus('error');
            setDeckLoadMessage('Deck not found (or you no longer have access).');
            return;
          }
          if (!validatePresentationPayload(data) || data.slides.length === 0) {
            setDeckLoadStatus('error');
            setDeckLoadMessage('This deck data is invalid (missing slides).');
            return;
          }

          usePresentationStore.getState().setPresentation(data);
          setDeckLoadStatus('idle');
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          if ((err as Error).name === 'AbortError') return;
          console.error('Failed to load presentation:', err);
          setDeckLoadStatus('error');
          setDeckLoadMessage('Failed to load deck. Please refresh and try again.');
        });
    } else if (prompt || mode) {
      setActivePanel('generate');
      setPanelOpen(true);
      setDeckLoadStatus('idle');
      setDeckLoadMessage(null);
    }

    return () => ac.abort();
  }, [searchParams, setActivePanel, setPanelOpen]);

  // First editor visit: optional quick survey (new accounts), then spotlight tour once
  useEffect(() => {
    let cancelled = false;
    const skipWelcome = Boolean(
      searchParams.get('prompt') || searchParams.get('id') || searchParams.get('mode'),
    );
    if (skipWelcome) {
      setWelcomeGate('ready');
      setNeedsSurveyModal(false);
      return;
    }

    (async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setNeedsSurveyModal(false);
        setWelcomeGate('ready');
        return;
      }
      let sessionDone = false;
      try {
        sessionDone = localStorage.getItem(`survey_done_${user.id}`) === 'true';
      } catch {
        /* ignore */
      }
      const metaDone = Boolean(user.user_metadata?.survey_completed);
      setNeedsSurveyModal(!(sessionDone || metaDone));
      setWelcomeGate('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (welcomeGate !== 'ready') return;
    if (onboarding.hasSeenTour || onboarding.isActive) return;
    if (needsSurveyModal) return;
    if (suppressAutoTourOnceRef.current) return;

    const timer = setTimeout(() => {
      startOnboarding();
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    welcomeGate,
    needsSurveyModal,
    onboarding.hasSeenTour,
    onboarding.isActive,
    startOnboarding,
  ]);

  const [isMdUp, setIsMdUp] = useState(true);
  const [mobileGalleryOpen, setMobileGalleryOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => {
      setIsMdUp(mq.matches);
      if (mq.matches) setMobileGalleryOpen(false);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const closeMobileGallery = useCallback(() => {
    if (!isMdUp) setMobileGalleryOpen(false);
  }, [isMdUp]);

  // Global keyboard shortcuts
  useHotkeys('ctrl+z, meta+z', (e) => { e.preventDefault(); undo(); }, [undo]);
  useHotkeys('ctrl+y, meta+y, ctrl+shift+z', (e) => { e.preventDefault(); redo(); }, [redo]);
  useHotkeys('ctrl+g, meta+g', (e) => {
    e.preventDefault();
    setActivePanel('generate');
    setPanelOpen(true);
  }, [setActivePanel, setPanelOpen]);

  const requestedId = searchParams.get('id');
  if (requestedId && !presentation) {
    return (
      <div className="min-h-dvh max-h-dvh w-full max-w-[100vw] overflow-hidden bg-background flex items-center justify-center px-4 safe-pad-y">
        <div className="w-full max-w-md border border-borderSubtle bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textMuted">
            Editor
          </p>
          <h1 className="mt-2 text-lg font-semibold text-textMain">
            {deckLoadStatus === 'error' ? 'Couldn’t open this deck' : 'Opening your deck…'}
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            {deckLoadStatus === 'error'
              ? (deckLoadMessage ?? 'Something went wrong while loading this presentation.')
              : 'Loading slides and preparing the canvas.'}
          </p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/my-presentations"
              className="flex-1 border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-800 transition hover:border-primary/25 hover:bg-accentBlue text-center"
            >
              Back to library
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 border border-primary bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primaryHover"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-shell h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-background text-textMain flex flex-col select-none">
      {welcomeGate === 'ready' && needsSurveyModal && (
        <SurveyModal
          onComplete={() => {
            suppressAutoTourOnceRef.current = true;
            setNeedsSurveyModal(false);
            window.setTimeout(() => {
              startOnboarding();
              window.setTimeout(() => {
                suppressAutoTourOnceRef.current = false;
              }, 900);
            }, 450);
          }}
        />
      )}
      <OnboardingTour />
      <PresentMode />
      <TopBar
        showMobileGalleryTrigger={!isMdUp}
        onOpenMobileGallery={() => setMobileGalleryOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 relative">
        {!isMdUp && mobileGalleryOpen && (
          <button
            type="button"
            aria-label="Close slide gallery"
            className="fixed inset-0 z-[125] bg-black/35 backdrop-blur-[2px] md:hidden"
            onClick={closeMobileGallery}
          />
        )}

        {!isMdUp && isPanelOpen && (
          <button
            type="button"
            aria-label="Close panel"
            className="fixed inset-0 z-[127] bg-black/25 backdrop-blur-[1px] md:hidden"
            onClick={() => setPanelOpen(false)}
          />
        )}

        {/* Left: slide thumbnails */}
        <Sidebar
          drawerOpen={isMdUp || mobileGalleryOpen}
          onAfterSlideSelect={closeMobileGallery}
        />

        {/* Center: canvas + toolbar */}
        <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
          <Toolbar />
          <CanvasArea />
          <GenerativeFillToolbar />
          <MagicEditToolbar />
        </main>

        {/* Right: context panels */}
        <AnimatePresence mode="wait">
          {isPanelOpen && (
            <motion.aside
              key={activePanel}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="border-l border-white/40 bg-white/60 backdrop-blur-3xl shrink-0 flex flex-col overflow-hidden min-h-0 w-full max-w-[100vw] xs:max-w-[min(100vw,360px)] md:w-[min(92vw,320px)] lg:w-[320px] shadow-[-15px_0_40px_rgba(0,0,0,0.06)] max-md:fixed max-md:z-[128] max-md:right-0 max-md:top-[var(--editor-topbar-h,104px)] max-md:bottom-0 max-md:h-[calc(100dvh-var(--editor-topbar-h,104px)-env(safe-area-inset-bottom,0px))] md:relative md:top-auto md:bottom-auto md:h-full md:max-h-full"
            >
              {activePanel === 'generate' && (
                <GeneratePanel onClose={() => setPanelOpen(false)} />
              )}
              {activePanel === 'layers' && <LayersPanel />}
              {activePanel === 'design' && <DesignPanel />}
              {activePanel === 'notes'  && <NotesPanel />}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Notes Panel ──────────────────────────────────────────────────────────────
function NotesPanel() {
  const { presentation, currentSlideIndex } = usePresentationStore();
  const slide = presentation?.slides[currentSlideIndex];
  const { updateSlide } = usePresentationStore();
  const [coachTips, setCoachTips] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    setCoachTips(null);
  }, [currentSlideIndex, slide?.id]);

  const runCoach = async () => {
    if (!slide || !presentation) return;
    setCoachLoading(true);
    setCoachTips(null);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideTitle: slide.title || slide.elements?.find((e) => e.type === 'text')?.content,
          speakerNotes: slide.speakerNotes,
          presentationTitle: presentation.title,
        }),
      });
      const data = await res.json();
      setCoachTips(typeof data.tips === 'string' ? data.tips : null);
    } catch {
      setCoachTips('Coach unavailable. Try again.');
    } finally {
      setCoachLoading(false);
    }
  };

  if (!slide) {
    return (
      <div className="flex items-center justify-center h-full text-textMuted text-[13px]">
        No slide selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-[14px] font-semibold text-textMain">Speaker Notes</h3>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={runCoach}
            disabled={coachLoading}
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-50"
          >
            {coachLoading ? '…' : 'AI coach'}
          </button>
          <span className="text-[10px] uppercase tracking-wide text-textMuted">Slide {currentSlideIndex + 1}</span>
        </div>
      </div>
      <p className="text-[13px] text-primary font-medium mb-3 truncate">{slide.title}</p>
      <textarea
        value={slide.speakerNotes || ''}
        onChange={(e) => updateSlide(slide.id, { speakerNotes: e.target.value })}
        placeholder="Add speaker notes for this slide... These are only visible to the presenter."
        className="flex-1 bg-background border border-borderSubtle rounded-lg px-3 py-3 text-[13px] text-textMain placeholder:text-textMuted/60 resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
      />
      {coachTips && (
        <div className="mt-4 p-3 rounded-xl bg-primary/[0.06] border border-primary/15">
          <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-primary mb-2">Coach</p>
          <p className="text-[12px] text-textSecondary leading-relaxed whitespace-pre-wrap">{coachTips}</p>
        </div>
      )}
      <div className="mt-4 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-textMuted">AI-generated notes</p>
        {slide.speakerNotes ? (
          <p className="text-[13px] text-textSecondary leading-relaxed">{slide.speakerNotes}</p>
        ) : (
          <p className="text-[13px] text-textMuted italic">No notes for this slide</p>
        )}
      </div>
    </div>
  );
}
