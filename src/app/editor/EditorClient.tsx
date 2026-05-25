'use client';

import React from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/editor/Sidebar';
import { Toolbar } from '@/components/editor/Toolbar';
import { TopBar } from '@/components/editor/TopBar';
import { MagicEditToolbar } from '@/components/editor/MagicEditToolbar';
import { GenerativeFillToolbar } from '@/components/editor/GenerativeFillToolbar';
import { LeftIconRail } from '@/components/editor/LeftIconRail';
import { TopPropertiesBar } from '@/components/editor/TopPropertiesBar';
import { TopInsertBar } from '@/components/editor/TopInsertBar';
import { SlideNotesBar } from '@/components/editor/SlideNotesBar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useSearchParams } from 'next/navigation';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useHotkeys } from 'react-hotkeys-hook';
import { usePresentationCloudSync } from '@/hooks/usePresentationCloudSync';
import type { PresentationData } from '@/types';
import { isSlideDeckBackgroundImage } from '@/lib/slide-background';
import { createStarterPresentation } from '@/lib/editor-starter-deck';
import { createEditorGeneratingShell } from '@/lib/editor-generating-shell';
import { ComponentErrorBoundary } from '@/components/editor/ComponentErrorBoundary';
import { Monitor } from '@/components/icons/lucide';

const EditorCanvasLoading = () => (
  <div className="flex-1 min-h-0 flex items-center justify-center bg-neutral-50/50">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 animate-pulse opacity-10" />
        <div className="absolute inset-[3px] rounded-xl bg-white flex items-center justify-center shadow-sm border border-primary/10">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-indigo-500 animate-ping" style={{ animationDuration: '1.4s' }} />
        </div>
      </div>
      <span className="text-[13px] font-medium text-neutral-500 tracking-wide">Preparing canvas…</span>
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

const GeneratePanel = dynamic(
  () => import('@/components/editor/GeneratePanel').then((m) => m.GeneratePanel),
  { ssr: false },
);

const LayersPanel = dynamic(
  () => import('@/components/editor/LayersPanel').then((m) => m.LayersPanel),
  { ssr: false },
);

const DesignPanel = dynamic(
  () => import('@/components/editor/DesignPanel').then((m) => m.DesignPanel),
  { ssr: false },
);

const LayoutsPanel = dynamic(
  () => import('@/components/editor/LayoutsPanel').then((m) => m.LayoutsPanel),
  { ssr: false },
);

const PhotosPanel = dynamic(
  () => import('@/components/editor/PhotosPanel').then((m) => m.PhotosPanel),
  { ssr: false },
);

const IconsPanel = dynamic(
  () => import('@/components/editor/IconsPanel').then((m) => m.IconsPanel),
  { ssr: false },
);

const QRPanel = dynamic(
  () => import('@/components/editor/QRPanel').then((m) => m.QRPanel),
  { ssr: false },
);

const ChartsPanel = dynamic(
  () => import('@/components/editor/ChartsPanel').then((m) => m.ChartsPanel),
  { ssr: false },
);

const GiphyPanel = dynamic(
  () => import('@/components/editor/GiphyPanel').then((m) => m.GiphyPanel),
  { ssr: false },
);
const AIPanel = dynamic(
  () => import('@/components/editor/AIPanel').then((m) => m.AIPanel),
  { ssr: false },
);
const VideoPanel = dynamic(
  () => import('@/components/editor/VideoPanel').then((m) => m.VideoPanel),
  { ssr: false },
);
const AnimationsPanel = dynamic(
  () => import('@/components/editor/AnimationsPanel').then((m) => m.AnimationsPanel),
  { ssr: false },
);
const AvatarsPanel = dynamic(
  () => import('@/components/editor/AvatarsPanel').then((m) => m.AvatarsPanel),
  { ssr: false },
);
const FlagsPanel = dynamic(
  () => import('@/components/editor/FlagsPanel').then((m) => m.FlagsPanel),
  { ssr: false },
);
const ShapesPanel = dynamic(
  () => import('@/components/editor/ShapesPanel').then((m) => m.ShapesPanel),
  { ssr: false },
);
const MockupsPanel = dynamic(
  () => import('@/components/editor/MockupsPanel').then((m) => m.MockupsPanel),
  { ssr: false },
);
const VideosPanel = dynamic(
  () => import('@/components/editor/VideosPanel').then((m) => m.VideosPanel),
  { ssr: false },
);
const PollinationsPanel = dynamic(
  () => import('@/components/editor/PollinationsPanel').then((m) => m.PollinationsPanel),
  { ssr: false },
);
const WikipediaPanel = dynamic(
  () => import('@/components/editor/WikipediaPanel').then((m) => m.WikipediaPanel),
  { ssr: false },
);
const WordSuggesterPanel = dynamic(
  () => import('@/components/editor/WordSuggesterPanel').then((m) => m.WordSuggesterPanel),
  { ssr: false },
);

const AppsPanel = dynamic(
  () => import('@/components/editor/AppsPanel').then((m) => m.AppsPanel),
  { ssr: false }
);

const TimelinePanel = dynamic(
  () => import('@/components/editor/TimelinePanel').then((m) => m.TimelinePanel),
  { ssr: false },
);

const SVGPatternPanel = dynamic(
  () => import('@/components/editor/SVGPatternPanel').then((m) => m.SVGPatternPanel),
  { ssr: false },
);

const MapPanel = dynamic(
  () => import('@/components/editor/MapPanel').then((m) => m.MapPanel),
  { ssr: false },
);

const GrammarPanel = dynamic(
  () => import('@/components/editor/GrammarPanel').then((m) => m.GrammarPanel),
  { ssr: false },
);

const MermaidPanel = dynamic(
  () => import('@/components/editor/MermaidPanel').then((m) => m.MermaidPanel),
  { ssr: false },
);

import { GlobalFontLoader } from '@/components/editor/GlobalFontLoader';

export default function EditorClient() {
  const activePanel = usePresentationStore((s) => s.activePanel);
  const isPanelOpen = usePresentationStore((s) => s.isPanelOpen);
  const setPanelOpen = usePresentationStore((s) => s.setPanelOpen);
  const setActivePanel = usePresentationStore((s) => s.setActivePanel);
  const undo = usePresentationStore((s) => s.undo);
  const redo = usePresentationStore((s) => s.redo);
  const onboarding = usePresentationStore((s) => s.onboarding);
  const startOnboarding = usePresentationStore((s) => s.startOnboarding);
  const presentation = usePresentationStore((s) => s.presentation);
  const searchParams = useSearchParams();

  usePresentationCloudSync();

  const [deckLoadStatus, setDeckLoadStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [deckLoadMessage, setDeckLoadMessage] = useState<string | null>(null);

  // Track which panels have been visited so they stay mounted (preserving state)
  const [visitedPanels, setVisitedPanels] = useState<Set<string>>(() => new Set(['generate']));
  useEffect(() => {
    if (activePanel) {
      setVisitedPanels((prev) => {
        if (prev.has(activePanel)) return prev;
        const next = new Set(prev);
        next.add(activePanel);
        return next;
      });
    }
  }, [activePanel]);

  const validatePresentationPayload = (data: any): data is PresentationData => {
    return !!data && typeof data === 'object' && typeof data.id === 'string' && Array.isArray((data as any).slides);
  };

  // Handle auto-generation or loading from URL (abort in-flight fetch if params change)
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    const mode = searchParams.get('mode');
    const id = searchParams.get('id');
    const copilotApproved = searchParams.get('copilot_approved');
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
            setDeckLoadMessage('You\u2019re signed out. Please sign in again to open this deck.');
            return;
          }
          if (!res.ok) {
            setDeckLoadStatus('error');
            setDeckLoadMessage(typeof data?.error === 'string' ? data.error : `Failed to load deck (${res.status}).`);
            return;
          }
          if (!data || !data.id) {
            const local = usePresentationStore.getState().presentation;
            if (local?.id === id && Array.isArray(local.slides) && local.slides.length > 0) {
              setDeckLoadStatus('idle');
              setDeckLoadMessage(null);
              return;
            }
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

          // Auto-open generate panel for empty/new decks
          if (data.slides.length <= 1) {
            setActivePanel('generate');
            setPanelOpen(true);
          }
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          if ((err as Error).name === 'AbortError') return;
          console.error('Failed to load presentation:', err);
          setDeckLoadStatus('error');
          setDeckLoadMessage('Failed to load deck. Please refresh and try again.');
        });
    } else if (prompt || mode || copilotApproved) {
      setActivePanel('generate');
      setPanelOpen(true);
      setDeckLoadStatus('idle');
      setDeckLoadMessage(null);
    }

    return () => ac.abort();
  }, [searchParams, setActivePanel, setPanelOpen]);

  useEffect(() => {
    const id = searchParams.get('id');
    const prompt = searchParams.get('prompt');
    const mode = searchParams.get('mode');
    const fileName = searchParams.get('fileName');
    const copilotApproved = searchParams.get('copilot_approved');
    const st = usePresentationStore.getState();

    if (id) return;

    const hasDeepLinkIntent = !!(prompt || mode || fileName || copilotApproved);
    if (hasDeepLinkIntent) {
      if (!st.presentation && !st.editor.isGenerating) {
        st.setPresentation(createEditorGeneratingShell());
      }
      return;
    }

    if (st.presentation) return;
    if (st.editor.isGenerating) return;

    st.setPresentation(createStarterPresentation());
    
    // Auto-open generate panel for the default empty presentation
    const { setActivePanel, setPanelOpen } = usePresentationStore.getState();
    setActivePanel('generate');
    setPanelOpen(true);
  }, [searchParams]);

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

  const generationGalleryOpen = usePresentationStore((s) => s.editor.generationGalleryOpen);
  useEffect(() => {
    if (generationGalleryOpen && !isMdUp) {
      setMobileGalleryOpen(true);
    }
  }, [generationGalleryOpen, isMdUp]);

  // Global keyboard shortcuts
  useHotkeys('ctrl+z, meta+z', (e) => { e.preventDefault(); undo(); }, [undo]);
  useHotkeys('ctrl+y, meta+y, ctrl+shift+z', (e) => { e.preventDefault(); redo(); }, [redo]);

  useHotkeys(
    'arrowup, arrowdown, arrowleft, arrowright',
    (e) => {
      const ae = document.activeElement as HTMLElement | null;
      const tag = ae?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || ae?.isContentEditable) return;
      const st = usePresentationStore.getState();
      if (st.editor.activeTool !== 'select') return;
      const selectedId = st.editor.selectedElementId;
      if (!selectedId || !st.presentation?.slides?.length) return;
      const slide = st.presentation.slides[st.currentSlideIndex];
      const el = slide?.elements?.find((x) => x.id === selectedId);
      if (!el || el.locked) return;
      e.preventDefault();
      const snap = st.editor.snapToGrid;
      const grid = st.editor.gridSize;
      const step = e.shiftKey ? (snap ? grid : 10) : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      st.updateElement(slide.id, selectedId, {
        x: el.x + dx,
        y: el.y + dy,
      }, true);
    },
    { enableOnFormTags: false },
    [],
  );

  // Escape → deselect all
  useHotkeys('escape', () => {
    const st = usePresentationStore.getState();
    st.selectElement(null);
    st.clearMultiSelection?.();
  }, { enableOnFormTags: false }, []);

  // Ctrl+D → duplicate selected element
  useHotkeys('ctrl+d, meta+d', (e) => {
    e.preventDefault();
    const st = usePresentationStore.getState();
    const sel = st.editor.selectedElementId;
    const slide = st.presentation?.slides?.[st.currentSlideIndex];
    if (sel && slide) st.duplicateElement(slide.id, sel);
  }, { enableOnFormTags: false }, []);

  // Ctrl+] → bring forward  /  Ctrl+[ → send backward
  useHotkeys('ctrl+], meta+]', (e) => {
    e.preventDefault();
    const st = usePresentationStore.getState();
    const sel = st.editor.selectedElementId;
    const slide = st.presentation?.slides?.[st.currentSlideIndex];
    if (sel && slide) st.reorderElements(slide.id, sel, 'up', true);
  }, { enableOnFormTags: false }, []);

  useHotkeys('ctrl+[, meta+[', (e) => {
    e.preventDefault();
    const st = usePresentationStore.getState();
    const sel = st.editor.selectedElementId;
    const slide = st.presentation?.slides?.[st.currentSlideIndex];
    if (sel && slide) st.reorderElements(slide.id, sel, 'down', true);
  }, { enableOnFormTags: false }, []);

  useHotkeys('ctrl+g, meta+g', (e) => {
    e.preventDefault();
    setActivePanel('generate');
    setPanelOpen(true);
  }, [setActivePanel, setPanelOpen]);

  useHotkeys(
    'delete, backspace',
    (e) => {
      const ae = document.activeElement as HTMLElement | null;
      const tag = ae?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || ae?.isContentEditable) return;
      const st = usePresentationStore.getState();
      if (st.editor.activeTool !== 'select') return;
      const selectedId = st.editor.selectedElementId;
      if (!selectedId || !st.presentation?.slides?.length) return;
      const slide = st.presentation?.slides?.[st.currentSlideIndex];
      if (!slide) return;
      const el = slide.elements?.find((x) => x.id === selectedId);
      if (!el) return;
      if (isSlideDeckBackgroundImage(el)) return;
      e.preventDefault();
      st.removeElement(slide.id, selectedId);
      st.selectElement(null);
    },
    { enableOnFormTags: false },
    [],
  );

  // ── Premium loading / error screen ──────────────────────────────────────────
  const requestedId = searchParams.get('id');
  if (requestedId && !presentation) {
    const isError = deckLoadStatus === 'error';
    return (
      <div className="min-h-dvh max-h-dvh w-full max-w-[100vw] overflow-hidden flex items-center justify-center relative bg-slate-50">
        {/* Ambient premium background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-80" />
          
          {/* Large glowing orbs in background */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[20%] left-[30%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[100px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-[10%] right-[20%] translate-x-1/4 translate-y-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[100px]" 
          />
        </div>

        {/* Main glassmorphism card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[420px] mx-4 rounded-[32px] p-10 flex flex-col items-center text-center bg-white/70 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,9,250,0.07)] border border-white"
        >
          {/* Logo / Icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-8"
          >
            {isError ? (
              <div className="w-20 h-20 rounded-[28px] flex items-center justify-center bg-red-50 border border-red-100 shadow-[0_8px_32px_rgba(239,68,68,0.15)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            ) : (
              <div className="relative w-24 h-24 rounded-[32px] flex items-center justify-center bg-white shadow-[0_12px_40px_rgba(0,9,250,0.12)] border border-white">
                {/* Spinning outer ring */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-2px] rounded-[34px] bg-gradient-to-tr from-primary via-violet-500 to-transparent opacity-20"
                />
                <img src="/logo.png.png" alt="Orbstera" className="w-10 h-10 object-contain animate-pulse" style={{ animationDuration: '2s' }} />
              </div>
            )}
          </motion.div>

          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-3 px-3 py-1 rounded-full bg-white/60 border border-neutral-200/50 shadow-sm inline-flex items-center"
          >
            <span 
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: isError ? '#ef4444' : '#0009fa' }}
            >
              {isError ? 'Error Loading' : 'Orbstera Engine'}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[26px] leading-tight font-black mb-3 text-neutral-900 tracking-tight"
          >
            {isError ? "Connection Failed" : 'Opening Deck'}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-[14px] leading-relaxed mb-10 text-neutral-500 font-medium max-w-[280px]"
          >
            {isError
              ? (deckLoadMessage ?? 'Something went wrong while loading this presentation.')
              : 'Initializing workspace and synchronizing your slides...'}
          </motion.p>

          {/* Progress bar (loading only) */}
          {!isError && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0.8 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="relative w-full h-[6px] mb-8 rounded-full overflow-hidden bg-neutral-100 shadow-inner"
            >
              <div
                className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-indigo-400 shadow-[0_0_12px_rgba(0,9,250,0.5)]"
                style={{
                  animation: 'shimmerSlide 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                }}
              />
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex gap-3 w-full"
          >
            <Link
              href="/my-presentations"
              className="flex-1 rounded-xl py-3.5 text-[13px] font-bold text-center text-neutral-600 bg-white/50 border border-white hover:bg-white hover:shadow-sm hover:text-neutral-900 transition-all"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl py-3.5 text-[13px] font-bold text-white bg-primary hover:bg-primaryHover shadow-[0_8px_24px_rgba(0,9,250,0.25)] hover:shadow-[0_12px_32px_rgba(0,9,250,0.35)] transition-all active:scale-95"
            >
              {isError ? 'Try Again' : 'Refresh'}
            </button>
          </motion.div>
        </motion.div>

        <style>{`
          @keyframes shimmerSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  // Helper: render a panel keeping it mounted after first visit, hiding with CSS when not active
  const panel = (id: string, node: React.ReactNode) => {
    if (!visitedPanels.has(id)) return null;
    const isActive = isPanelOpen && (activePanel as string) === id;
    return (
      <div key={id} style={{ display: isActive ? 'contents' : 'none' }}>
        <ComponentErrorBoundary region={`${id} Panel`}>
          {node}
        </ComponentErrorBoundary>
      </div>
    );
  };

  return (
    <>
      {/* ── Mobile Graceful Block ── */}
      <div className="flex md:hidden h-[100dvh] w-full flex-col items-center justify-center bg-[#F7F8FA] p-6 text-center">
        <div className="h-16 w-16 mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center">
          <Monitor size={28} className="text-indigo-600" />
        </div>
        <h2 className="text-xl font-black text-neutral-900 mb-2">Desktop Only</h2>
        <p className="text-[13px] font-medium text-neutral-500 leading-relaxed max-w-[260px]">
          The presentation editor is designed for larger screens. Please open this on your desktop or laptop to edit.
        </p>
        <Link href="/my-presentations" className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-[13px] font-bold text-white shadow-lg hover:bg-indigo-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>

      <div className="editor-shell hidden md:flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-background text-textMain flex-col select-none">
        <GlobalFontLoader />
        <OnboardingTour />
      <ComponentErrorBoundary region="Presentation Mode">
        <PresentMode />
      </ComponentErrorBoundary>
      <TopBar
        showMobileGalleryTrigger={!isMdUp}
        onOpenMobileGallery={() => setMobileGalleryOpen(true)}
      />
      <TopPropertiesBar />

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

        {/* Left icon rail */}
        <LeftIconRail />

        {/* Left: slide thumbnails */}
        <Sidebar
          drawerOpen={isMdUp || mobileGalleryOpen}
          onAfterSlideSelect={closeMobileGallery}
        />

        {/* Center: canvas + bottom bars */}
        <main
          className="flex-1 relative flex flex-col min-w-0 overflow-hidden bg-[#1e2430]"
          data-canvas-workspace
          onClick={(e) => {
            // Deselect when clicking the workspace background (not the canvas or UI elements)
            const target = e.target as HTMLElement;
            const isWorkspaceBg =
              target.hasAttribute('data-canvas-workspace') ||
              target.closest('[data-canvas-workspace]') === e.currentTarget;
            const isInsideCanvas = target.closest('.konvajs-content') ||
              target.closest('[data-lenis-prevent]') ||
              target.closest('button') ||
              target.closest('input') ||
              target.closest('select') ||
              target.closest('textarea');
            if (!isInsideCanvas && target.closest('[data-canvas-workspace]')) {
              usePresentationStore.getState().selectElement(null);
            }
          }}
        >
          {/* Hidden Toolbar — keeps file input + keyboard shortcuts alive */}
          <div className="sr-only" style={{ position: 'absolute', pointerEvents: 'none' }}>
            <Toolbar />
          </div>

          {/* Canvas workspace — overflow:visible so transformer handles extend beyond slide edge */}
          <div className="flex-1 relative flex flex-col min-w-0 min-h-0" style={{ overflow: 'visible' }}>
            <TopInsertBar />
            <CanvasArea />
            <GenerativeFillToolbar />
            <MagicEditToolbar />
          </div>

          {/* Slide notes below canvas */}
        </main>

        {/* Right: context panels — kept mounted after first visit to preserve state */}
        <aside
          aria-hidden={!isPanelOpen}
          className={cn(
            'border-l-2 border-black/[0.08] bg-panel shrink-0 flex flex-col overflow-hidden min-h-0',
            'w-full max-w-[100vw] xs:max-w-[min(100vw,360px)] md:w-[min(92vw,320px)] lg:w-[320px]',
            'shadow-[-1px_0_10px_rgba(0,0,0,0.02)] perf-contain-paint',
            'max-md:fixed max-md:z-[128] max-md:right-0 max-md:top-[var(--editor-topbar-h,104px)] max-md:bottom-0',
            'max-md:h-[calc(100dvh-var(--editor-topbar-h,104px)-env(safe-area-inset-bottom,0px))]',
            'md:relative md:top-auto md:bottom-auto md:h-full md:max-h-full',
            'transition-[transform,opacity] duration-200 ease-out',
            isPanelOpen
              ? 'max-md:translate-x-0 max-md:opacity-100'
              : 'max-md:translate-x-full max-md:opacity-0 max-md:pointer-events-none',
            !isPanelOpen && 'md:w-0 md:opacity-0 md:border-l-0 md:overflow-hidden md:pointer-events-none',
          )}
        >
          {panel('generate', <GeneratePanel onClose={() => setPanelOpen(false)} />)}
          {panel('layers', <LayersPanel />)}
          {panel('design', <DesignPanel />)}
          {panel('notes', <NotesPanel />)}
          {panel('animations', <AnimationsPanel />)}
          {panel('layouts', <LayoutsPanel />)}
          {panel('photos', <PhotosPanel onClose={() => setPanelOpen(false)} />)}
          {panel('icons', <IconsPanel onClose={() => setPanelOpen(false)} />)}
          {panel('giphy', <GiphyPanel onClose={() => setPanelOpen(false)} />)}
          {panel('qr', <QRPanel onClose={() => setPanelOpen(false)} />)}
          {panel('charts', <ChartsPanel onClose={() => setPanelOpen(false)} />)}
          {panel('ai', <AIPanel onClose={() => setPanelOpen(false)} />)}
          {panel('video', <VideoPanel onClose={() => setPanelOpen(false)} />)}
          {panel('pollinations', <PollinationsPanel onClose={() => setPanelOpen(false)} />)}
          {panel('wikipedia', <WikipediaPanel onClose={() => setPanelOpen(false)} />)}
          {panel('wordsuggester', <WordSuggesterPanel onClose={() => setPanelOpen(false)} />)}
          {panel('apps', <AppsPanel onClose={() => setPanelOpen(false)} />)}
          {panel('avatars', <AvatarsPanel onClose={() => setPanelOpen(false)} />)}
          {panel('flags', <FlagsPanel onClose={() => setPanelOpen(false)} />)}
          {panel('mockups', <MockupsPanel onClose={() => setPanelOpen(false)} />)}
          {panel('videos', <VideosPanel onClose={() => setPanelOpen(false)} />)}
          {panel('shapes', <ShapesPanel onClose={() => setPanelOpen(false)} />)}
          {panel('timeline', <TimelinePanel onClose={() => setPanelOpen(false)} />)}
          {panel('svgpattern', <SVGPatternPanel onClose={() => setPanelOpen(false)} />)}
          {panel('map', <MapPanel onClose={() => setPanelOpen(false)} />)}
          {panel('grammar', <GrammarPanel onClose={() => setPanelOpen(false)} />)}
          {panel('mermaid', <MermaidPanel onClose={() => setPanelOpen(false)} />)}
        </aside>
      </div>
    </div>
    </>
  );
}

// ─── Notes Panel ──────────────────────────────────────────────────────────────
function NotesPanel() {
  const presentation = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const slide = presentation?.slides[currentSlideIndex];
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
    </div>
  );
}
