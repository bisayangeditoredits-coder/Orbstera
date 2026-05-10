'use client';

import { useEffect, useState, useCallback } from 'react';
import { CanvasArea } from '@/components/editor/CanvasArea';
import { Sidebar } from '@/components/editor/Sidebar';
import { Toolbar } from '@/components/editor/Toolbar';
import { LayersPanel } from '@/components/editor/LayersPanel';
import { TopBar } from '@/components/editor/TopBar';
import { GeneratePanel } from '@/components/editor/GeneratePanel';
import { MagicEditToolbar } from '@/components/editor/MagicEditToolbar';
import { PresentMode } from '@/components/editor/PresentMode';
import { DesignPanel } from '@/components/editor/DesignPanel';
import { OnboardingTour } from '@/components/editor/OnboardingTour';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePresentationCloudSync } from '@/hooks/usePresentationCloudSync';

export default function EditorClient() {
  const { 
    activePanel, isPanelOpen, setPanelOpen, setActivePanel, 
    undo, redo, onboarding, startOnboarding 
  } = usePresentationStore();
  const searchParams = useSearchParams();

  usePresentationCloudSync();

  // Handle auto-generation or loading from URL
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const mode = searchParams.get('mode');
    const id = searchParams.get('id');

    if (id) {
      // Load existing presentation from Cloudflare R2
      fetch(`/api/presentations?id=${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            usePresentationStore.getState().setPresentation(data);
          }
        })
        .catch(err => console.error('Failed to load presentation:', err));
    } else if (prompt || mode) {
      setActivePanel('generate');
      setPanelOpen(true);
    }
  }, [searchParams, setActivePanel, setPanelOpen]);

  // Auto-trigger onboarding tour
  useEffect(() => {
    if (!onboarding.hasSeenTour) {
      const timer = setTimeout(() => {
        startOnboarding();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [onboarding.hasSeenTour, startOnboarding]);

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

  return (
    <div className="editor-shell h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-background text-textMain flex flex-col select-none">
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
              className="border-l-2 border-black/[0.08] bg-panel shrink-0 flex flex-col overflow-hidden min-h-0 w-full max-w-[100vw] xs:max-w-[min(100vw,360px)] md:w-[min(92vw,320px)] lg:w-[320px] shadow-[-1px_0_10px_rgba(0,0,0,0.02)] max-md:fixed max-md:z-[128] max-md:right-0 max-md:top-[var(--editor-topbar-h,104px)] max-md:bottom-0 max-md:h-[calc(100dvh-var(--editor-topbar-h,104px)-env(safe-area-inset-bottom,0px))] md:relative md:top-auto md:bottom-auto md:h-full md:max-h-full"
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
