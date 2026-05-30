/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import { exportToPptx } from '@/lib/export';
import { useState, useEffect, useRef, useCallback , memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Download, Share2,
  Loader2, Layers, Wand2, FileText,
  CheckCircle, Pencil, X, Undo2, Redo2,
  Sparkles,
  Clock, AlignLeft, LayoutTemplate, Palette,
  Upload, AlertCircle, RefreshCw,
  PanelLeft,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { postPresentationCloudSave } from '@/lib/presentation-cloud-save';
import { buildPresentationUpdatesAfterCloudSave } from '@/lib/merge-cloud-prepared';
import { enqueueCloudSave } from '@/lib/cloud-save-lock';
import { suppressCloudDirtyDuring } from '@/lib/cloud-dirty-suppress';
import { humanizeFetchError, isAbortLikeError } from '@/lib/network-error-message';
import { CreditsHUD } from './CreditsHUD';
import { ShareModal } from './ShareModal';
import { ExportModal, type ExportFormat } from './ExportModal';

// ── Slide Stats ───────────────────────────────────────────────────────────────
function SlideStats() {
  const presentation = usePresentationStore((s) => s.presentation);
  if (!presentation) return null;

  const slides    = presentation.slides || [];
  const wordCount = slides.reduce((acc, s) => {
    const words = (s.elements || [])
      .filter((el) => el.type === 'text' && el.content)
      .map((el) => el.content!.split(/\s+/).length)
      .reduce((a, b) => a + b, 0);
    return acc + words;
  }, 0);
  const readMin = Math.max(1, Math.round(wordCount / 130));

  return (
    <div className="hidden shrink-0 items-center gap-2.5 rounded-full border border-black/[0.05] bg-neutral-100/80 px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] xl:flex">
      <Stat icon={LayoutTemplate} value={slides.length} label="slides" />
      <div className="w-px h-3.5 bg-black/[0.08]" />
      <Stat icon={AlignLeft}      value={wordCount}     label="words"  />
      <div className="w-px h-3.5 bg-black/[0.08]" />
      <Stat icon={Clock}          value={`${readMin}m`} label="read"   />
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className="text-neutral-400" strokeWidth={1.75} />
      <span className="text-[11px] font-semibold tabular-nums text-neutral-700">{value}</span>
      <span className="text-[9px] text-neutral-400 uppercase tracking-[0.12em] font-medium">{label}</span>
    </div>
  );
}

// ── Editable Title ────────────────────────────────────────────────────────────
function EditableTitle() {
  const presentation = usePresentationStore(s => s.presentation);
  const updatePresentation = usePresentationStore(s => s.updatePresentation);
  const setEditorState = usePresentationStore(s => s.setEditorState);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(presentation?.title || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === presentation?.title) return;

    // 1. Update local store immediately
    updatePresentation({ title: trimmed });

    // 2. Fast PATCH rename to R2 (no need to wait for debounced full sync)
    const id = presentation?.id;
    if (!id) return;
    setEditorState({ cloudSyncStatus: 'saving', cloudSyncMessage: undefined });
    try {
      const res = await fetch(`/api/presentations?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
        cache: 'no-store',
      });
      if (res.ok) {
        setEditorState({ cloudSyncStatus: 'saved', cloudSyncMessage: undefined });
        window.setTimeout(() => {
          const st = usePresentationStore.getState().editor.cloudSyncStatus;
          if (st === 'saved') setEditorState({ cloudSyncStatus: 'idle' });
        }, 1800);
      } else {
        const data = await res.json().catch(() => ({}));
        setEditorState({ cloudSyncStatus: 'error', cloudSyncMessage: data.error || 'Rename failed' });
      }
    } catch {
      setEditorState({ cloudSyncStatus: 'error', cloudSyncMessage: 'Rename failed' });
    }
  };

  if (!presentation) return null;

  return (
    <div className="flex flex-col min-w-0 ml-0.5 group/title justify-center">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEditing(false); }}
          className="font-semibold text-[13px] leading-tight w-full max-w-[min(220px,calc(100vw-8rem))] sm:max-w-[220px] bg-white border border-black/[0.1] rounded-lg px-2 py-1 text-neutral-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="flex items-center gap-1.5 group/btn text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-white/80 border border-transparent hover:border-black/[0.06] transition-colors"
          title="Click to rename"
        >
          <span className="font-semibold text-[13px] leading-tight truncate max-w-[min(200px,calc(100vw-10rem))] sm:max-w-[200px] text-neutral-800">
            {presentation.title || 'Untitled Presentation'}
          </span>
          <Pencil size={12} strokeWidth={1.75} className="text-neutral-300 opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0" />
        </button>
      )}
    </div>
  );
}

// ── Undo/Redo Buttons ─────────────────────────────────────────────────────────
function UndoRedo() {
  const { undo, redo, history, historyIndex } = usePresentationStore();
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="hidden sm:flex items-center gap-0.5 rounded-full p-0.5 bg-neutral-100/80 border border-black/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Undo2 size={14} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Redo2 size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

// ── Panel buttons config ──────────────────────────────────────────────────────
const PANEL_BUTTONS = [
  { id: 'generate', icon: Wand2,    label: 'Generate' },
  { id: 'layers',   icon: Layers,   label: 'Layers'   },
  { id: 'design',   icon: Palette,  label: 'Design'   },
  { id: 'notes',    icon: FileText, label: 'Notes'    },
] as const;

// ── Main TopBar ───────────────────────────────────────────────────────────────
interface TopBarProps {
  onOpenGenerate?: () => void;
  showMobileGalleryTrigger?: boolean;
  onOpenMobileGallery?: () => void;
}

function TopBarInner({ onOpenGenerate, showMobileGalleryTrigger, onOpenMobileGallery }: TopBarProps) {
  const router = useRouter();
  const presentation = usePresentationStore(s => s.presentation);
  const { activePanel, setActivePanel, isPanelOpen, setPanelOpen, setEditorState, setPresentation, updatePresentation, cloudSync, cloudMsg } = usePresentationStore(
    useShallow((s) => ({
      activePanel: s.activePanel,
      setActivePanel: s.setActivePanel,
      isPanelOpen: s.isPanelOpen,
      setPanelOpen: s.setPanelOpen,
      setEditorState: s.setEditorState,
      setPresentation: s.setPresentation,
      updatePresentation: s.updatePresentation,
      cloudSync: s.editor.cloudSyncStatus,
      cloudMsg: s.editor.cloudSyncMessage,
    }))
  );

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pptx');
  const [exportStep, setExportStep] = useState(-1);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (presentation?.userId) {
      setOwnerUserId(presentation.userId);
      return;
    }
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user?.id) setOwnerUserId(user.id);
      })
      .catch(() => {});
  }, [presentation?.userId, presentation?.id]);

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImportError(null);
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/import/presentation', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === 'UNSUPPORTED_PPT') {
          const hint =
            typeof data.conversionHint === 'string'
              ? ` ${data.conversionHint}`
              : '';
          throw new Error(`${data.error || 'Legacy .ppt is not supported.'}${hint}`);
        }
        throw new Error(data.error || `Import failed (${res.status})`);
      }
      if (!data.presentation?.slides?.length) throw new Error('Import returned no slides.');
      setPresentation(data.presentation);
      const pid = data.presentation.id;
      if (pid) router.replace(`/editor?id=${encodeURIComponent(pid)}`);
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const reloadFromCloud = async () => {
    const id = presentation?.id;
    if (!id) return;
    try {
      const res = await fetch(`/api/presentations?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : `Reload failed (${res.status})`);
      }
      const data = await res.json();
      if (data?.id && Array.isArray(data.slides)) {
        setPresentation(data);
        setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
      } else {
        throw new Error('Invalid deck data from server');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Reload failed';
      setEditorState({ cloudSyncStatus: 'error', cloudSyncMessage: msg });
    }
  };

  const retrySaveNow = async () => {
    const body = usePresentationStore.getState().presentation;
    if (!body?.id) return;
    setEditorState({ cloudSyncStatus: 'retrying', cloudSyncMessage: undefined });
    try {
      await enqueueCloudSave(async () => {
        const { response: res, prepared } = await postPresentationCloudSave(body);
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setEditorState({
            cloudSyncStatus: 'error',
            cloudSyncMessage: 'Sign in to sync to the cloud.',
          });
          return;
        }
        if (res.status === 409) {
          setEditorState({
            cloudSyncStatus: 'conflict',
            cloudSyncMessage: 'This deck was saved elsewhere. Reload to get the latest version.',
          });
          return;
        }
        if (!res.ok) {
          if (res.status === 413) {
            throw new Error(
              'Deck too large to upload in one request. Set NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL for image offload, or reduce embedded images.',
            );
          }
          throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');
        }
        if (data.message === 'Placeholder skipped') {
          setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
          return;
        }
        if (data.success && typeof data.saveVersion === 'number') {
          const current = usePresentationStore.getState().presentation;
          if (current) {
            suppressCloudDirtyDuring(() => {
              usePresentationStore.getState().updatePresentation(
                buildPresentationUpdatesAfterCloudSave(
                  current,
                  body,
                  prepared,
                  data.saveVersion,
                  data.updatedAt || new Date().toISOString(),
                ),
              );
            });
          }
          setEditorState({ cloudSyncStatus: 'saved' });
          window.setTimeout(() => {
            const st = usePresentationStore.getState().editor.cloudSyncStatus;
            if (st === 'saved') setEditorState({ cloudSyncStatus: 'idle' });
          }, 1800);
          return;
        }
        setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
      });
    } catch (e: unknown) {
      if (isAbortLikeError(e)) {
        setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
        return;
      }
      const msg = humanizeFetchError(e);
      setEditorState({
        cloudSyncStatus: 'error',
        cloudSyncMessage: msg || 'Sync failed',
      });
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!presentation) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'p') { e.preventDefault(); setEditorState({ isPresenting: true }); }
      if (mod && e.key === 'e') { e.preventDefault(); openExportModal('pptx'); }
      if (mod && e.key === 'd') { e.preventDefault(); handlePanelToggle('design'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentation]);

  const openExportModal = (format: ExportFormat = 'pptx') => {
    if (!presentation) return;
    setExportFormat(format);
    setExportModalOpen(true);
    setExportStep(-1);
    setExportDone(false);
    setExportError(null);
  };

  const handleExportCheck = async () => {
    if (!presentation) return;

    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      let isPaidUser = false;
      let credits = 0;
      
      if (user) {
        credits = user.user_metadata?.watermark_free_exports || 0;
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        const plan = profile?.plan?.toLowerCase() || 'free';
        isPaidUser = plan === 'pro' || plan === 'creator_pro' || plan === 'student_pro';
      }

      if (!isPaidUser && credits <= 0) {
        setExportModalOpen(false);
        setShowWatermarkModal(true);
        return;
      }
      
      // If paid or has credits, export immediately
      startExport();
    } catch (err) {
      startExport(); // fallback to export (watermarked by server)
    }
  };

  const startExport = async () => {
    setShowWatermarkModal(false);
    setExportModalOpen(true);
    setExportFormat('pptx');
    setExportStep(0);
    setExportDone(false);
    setExportError(null);

    try {
      // Step 0: analyzing
      await new Promise((r) => setTimeout(r, 600));
      setExportStep(1);

      // Step 1: building (actual API call)
      await exportToPptx(presentation!);
      setExportStep(2);

      // Step 2: downloading
      await new Promise((r) => setTimeout(r, 500));
      setExportDone(true);
    } catch (err) {
      setExportError(
        err instanceof Error && err.message?.trim()
          ? err.message.trim()
          : 'Export failed. Please try again.',
      );
    }
  };

  const startPdfExport = async () => {
    if (!presentation) return;
    setExportModalOpen(true);
    setExportFormat('pdf');
    setExportStep(0);
    setExportDone(false);
    setExportError(null);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setExportStep(1);

      const { default: jsPDF } = await import('jspdf');
      const slides = presentation.slides;
      const store = usePresentationStore.getState();
      const origIndex = store.currentSlideIndex;

      const W = 1280;
      const H = 720;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], compress: true });

      for (let i = 0; i < slides.length; i++) {
        store.setCurrentSlideIndex(i);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 120));

        const stage = (window as unknown as { __konvaStage?: { toDataURL: (o: object) => string } })
          .__konvaStage;
        if (stage) {
          const dataUrl = stage.toDataURL({
            mimeType: 'image/jpeg',
            quality: 0.92,
            pixelRatio: 1.5,
          });
          if (i > 0) doc.addPage([W, H], 'landscape');
          doc.addImage(dataUrl, 'JPEG', 0, 0, W, H, '', 'FAST');
        }
      }

      store.setCurrentSlideIndex(origIndex);
      setExportStep(2);
      await new Promise((r) => setTimeout(r, 400));

      const safeName =
        (presentation.title ?? 'Presentation').replace(/[^a-zA-Z0-9\s-_]/g, '').trim() ||
        'Presentation';
      doc.save(`${safeName}.pdf`);
      setExportDone(true);
    } catch (err) {
      console.error('PDF export error:', err);
      setExportError(
        err instanceof Error && err.message?.trim()
          ? err.message.trim()
          : 'PDF export failed. Please try again.',
      );
    }
  };

  const handleStartExportFromModal = async () => {
    if (!presentation) return;
    if (exportFormat === 'pdf') {
      await startPdfExport();
      return;
    }
    await handleExportCheck();
  };

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'one_time_export' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch (err) {
      alert('Failed to initiate checkout. Please try again later.');
    }
  };

  const closeExportModal = () => {
    setExportModalOpen(false);
    setShowWatermarkModal(false);
    setExportStep(-1);
    setExportDone(false);
    setExportError(null);
  };

  const exportPhase =
    exportError != null
      ? 'error'
      : exportDone
        ? 'success'
        : exportStep >= 0
          ? 'progress'
          : 'options';

  const handlePanelToggle = (panel: typeof activePanel) => {
    if (activePanel === panel && isPanelOpen) setPanelOpen(false);
    else { setActivePanel(panel); setPanelOpen(true); }
  };

  const isExporting = exportStep >= 0 && !exportDone && !exportError;

  return (
    <>
      {/* ── Watermark Upsell Modal ── */}
      <AnimatePresence>
        {showWatermarkModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[650] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 safe-pad-y"
            role="presentation"
            onClick={() => setShowWatermarkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 p-6 sm:p-8 w-full max-w-sm max-h-[min(90dvh,640px)] overflow-y-auto flex flex-col items-center gap-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <Sparkles size={28} className="text-amber-500" />
              </div>
              <div className="text-center min-w-0">
                <h3 className="text-xl font-bold text-black text-balance">Remove Watermark</h3>
                <p className="text-sm text-gray-500 mt-2 text-pretty">
                  Export your presentation without the Orbstera watermark.
                </p>
              </div>
              
              <p className="w-full text-[11px] leading-relaxed text-indigo-700/90 bg-indigo-50/90 border border-indigo-100 rounded-xl px-3 py-2.5 text-center text-pretty">
                Note: Slide animations and transitions will not be applied to the exported Microsoft PowerPoint file. Animations are exclusively experienced beautifully here in Orbstera.
              </p>
              <div className="w-full space-y-3 shrink-0">
                <button
                  onClick={handleCheckout}
                  className="w-full min-h-12 py-3 rounded-xl bg-primary text-white font-bold text-[15px] hover:bg-primary/90 transition-all active:scale-[0.97] flex items-center justify-center gap-2 touch-manipulation"
                >
                  Pay ₱30 once
                </button>
                <button
                  onClick={startExport}
                  className="w-full min-h-12 py-3 rounded-xl bg-black/[0.03] text-gray-600 font-semibold text-[14px] hover:bg-black/[0.06] transition-all active:scale-[0.97] touch-manipulation text-balance px-2"
                >
                  Export with watermark (Free)
                </button>
              </div>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWatermarkModal(false);
                }}
                className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] p-2 text-slate-400 hover:text-slate-900 touch-manipulation"
                aria-label="Close"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Export Modal ── */}
      <AnimatePresence>
        {importBusy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] flex items-center justify-center bg-black/35 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl border border-black/[0.08] px-8 py-6 flex flex-col items-center gap-4 shadow-xl max-w-sm mx-4">
              <Loader2 className="animate-spin text-primary" size={28} />
              <p className="text-sm font-bold text-black text-center">Importing presentation…</p>
              <p className="text-[11px] text-black/45 text-center">Parsing slides, text, and images. Large files may take a moment.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {importError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl border border-red-100 px-6 py-5 shadow-xl max-w-sm mx-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-bold text-black">Import failed</p>
                  <p className="text-xs text-red-600/90 mt-1">{importError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="mt-4 w-full h-10 rounded-xl bg-black/[0.06] text-sm font-bold text-black/70 hover:bg-black/[0.1]"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExportModal
        open={exportModalOpen}
        onClose={closeExportModal}
        phase={exportPhase}
        format={exportFormat}
        onFormatChange={setExportFormat}
        onStartExport={handleStartExportFromModal}
        step={Math.max(0, exportStep)}
        error={exportError}
      />

      {presentation?.id && ownerUserId && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          deckId={presentation.id}
          ownerUserId={ownerUserId}
          initialShareAccess={presentation.shareAccess ?? 'private'}
          onShareAccessChange={(access) => updatePresentation({ shareAccess: access })}
          onExportPptx={() => openExportModal('pptx')}
          onExportPdf={() => openExportModal('pdf')}
        />
      )}

      <header className="border-b border-black/[0.06] bg-[#FAFAFA]/95 backdrop-blur-md z-50 shrink-0 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] pt-[env(safe-area-inset-top,0px)]">
        <div className="flex flex-wrap items-center justify-between gap-y-2 py-2 px-2 sm:px-3 xl:grid xl:grid-cols-[minmax(180px,1fr)_auto_minmax(180px,1fr)] xl:gap-x-3 xl:gap-y-0 xl:py-0 xl:h-[52px] xl:px-4 2xl:gap-x-4 2xl:px-5">
        {/* Left */}
        <div className="order-1 flex min-h-[44px] min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible overscroll-x-contain scrollbar-none sm:gap-2.5 xl:min-h-0">
          {showMobileGalleryTrigger && onOpenMobileGallery && (
            <button
              type="button"
              onClick={onOpenMobileGallery}
              className="md:hidden shrink-0 text-neutral-500 hover:text-neutral-900 hover:bg-white border border-transparent hover:border-black/[0.06] transition-all p-2 rounded-xl touch-manipulation"
              aria-label="Open slide gallery"
            >
              <PanelLeft size={18} strokeWidth={1.75} />
            </button>
          )}
          <Link
            href="/my-presentations"
            className="shrink-0 w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-white border border-black/[0.06] bg-white/60 rounded-xl transition-all touch-manipulation shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            aria-label="Back to my presentations"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </Link>
          <Link href="/" className="hidden sm:flex shrink-0 items-center min-w-0 rounded-lg hover:opacity-90 transition-opacity">
            <img src="/logo.png.png" alt="Orbstera" className="h-[1.35rem] w-auto max-h-7 object-contain" />
          </Link>

          <div className="min-w-[6rem] max-w-[min(100%,14rem)] shrink-0 flex-initial sm:max-w-[min(100%,18rem)]">
            <EditableTitle />
          </div>

          {/* Cloud sync status */}
          {presentation && (
            <div className="flex min-w-0 max-w-[min(100%,280px)] shrink-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none sm:max-w-[min(100%,320px)]">
              <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
              <input
                ref={importInputRef}
                type="file"
                accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={(e) => handleImportFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                disabled={importBusy}
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 min-h-9 sm:min-h-0 rounded-full border border-black/[0.08] bg-white text-neutral-600 hover:text-neutral-900 hover:border-black/12 hover:bg-neutral-50 transition-all disabled:opacity-40 touch-manipulation shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                title="Import .pptx (legacy .ppt: save as .pptx in PowerPoint, or wait for server conversion)"
              >
                <Upload size={12} strokeWidth={1.75} className="text-neutral-500" />
                <span className="hidden sm:inline">Import</span>
              </button>
              {cloudSync === 'saving' && (
                <div className="flex items-center gap-1 text-amber-700 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50/90 border border-amber-200/60">
                  <Loader2 size={11} className="animate-spin shrink-0" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Saving…</span>
                </div>
              )}
              {cloudSync === 'saved' && (
                <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/60">
                  <CheckCircle size={11} strokeWidth={1.75} />
                  <span className="hidden sm:inline">Saved</span>
                </div>
              )}
              {cloudSync === 'idle' && !importBusy && (
                <div className="hidden md:flex items-center text-neutral-400 text-[10px] font-medium px-1.5">
                  <span className="sr-only">Cloud idle</span>
                </div>
              )}
              {cloudSync === 'error' && (
                <div className="flex items-center gap-1 text-red-700 text-[10px] font-semibold px-2 py-1 rounded-full bg-red-50 border border-red-100 max-w-[min(100%,260px)]">
                  <AlertCircle size={11} className="shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0 line-clamp-2 whitespace-normal leading-snug" title={cloudMsg}>{cloudMsg || 'Sync error'}</span>
                  <button type="button" onClick={retrySaveNow} className="shrink-0 p-1 rounded-full hover:bg-red-100/80" title="Retry save">
                    <RefreshCw size={11} strokeWidth={1.75} />
                  </button>
                </div>
              )}
              {cloudSync === 'conflict' && (
                <div className="flex min-w-[12rem] max-w-[14rem] shrink-0 flex-col gap-1.5 rounded-xl border border-black/[0.08] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start gap-1.5 min-w-0 text-neutral-700 text-[10px] font-medium leading-snug">
                    <AlertCircle size={11} className="shrink-0 text-amber-600 mt-0.5" strokeWidth={1.75} />
                    <span title={cloudMsg || 'This deck was updated in the cloud (e.g. another tab). Reload to load that version.'}>
                      Newer version in cloud — reload to avoid overwriting it.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={reloadFromCloud}
                    className="w-full shrink-0 py-1.5 rounded-lg bg-neutral-900 text-white text-[9px] font-semibold uppercase tracking-wide hover:bg-neutral-800"
                  >
                    Reload
                  </button>
                </div>
              )}
              {cloudSync === 'retrying' && (
                <div className="flex items-center gap-1 text-amber-800 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 border border-amber-100">
                  <Loader2 size={11} className="animate-spin" strokeWidth={1.75} />
                  <span>Retry…</span>
                </div>
              )}
              </div>
            </div>
          )}

          <div className="w-px h-[18px] bg-black/[0.06] shrink-0 mx-0.5 hidden sm:block" />
          <div className="shrink-0 relative z-[1]">
            <UndoRedo />
          </div>
          <SlideStats />
        </div>

        {/* Center — panel toggles */}
        <div className="order-3 flex w-full min-w-0 justify-center overflow-hidden xl:order-2 xl:w-auto xl:max-w-[min(520px,38vw)]">
          <div
            id="tour-panel-tabs"
            className="inline-flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto overscroll-x-contain rounded-2xl border border-black/[0.06] bg-neutral-100/85 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] scrollbar-none touch-pan-x"
          >
          {PANEL_BUTTONS.map((btn) => {
            const isActive = activePanel === btn.id && isPanelOpen;
            const isGenerate = btn.id === 'generate';
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => handlePanelToggle(btn.id)}
                className={`flex shrink-0 items-center gap-2 px-3 sm:px-3.5 min-h-9 sm:h-[34px] rounded-[10px] text-[11px] sm:text-[12px] font-semibold transition-all duration-200 touch-manipulation group ${
                  isActive
                    ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-white/70'
                }`}
              >
                <btn.icon
                  size={15}
                  strokeWidth={isGenerate ? 2 : 1.75}
                  className={
                    isGenerate
                      ? isActive
                        ? 'text-[#5B7CFF]'
                        : 'text-neutral-400 group-hover:text-[#5B7CFF] transition-colors'
                      : isActive
                        ? 'text-primary'
                        : 'text-neutral-400'
                  }
                />
                <span className={`hidden sm:inline ${isGenerate ? "bg-clip-text text-transparent bg-gradient-to-r from-[#5B7CFF] via-indigo-400 to-[#5B7CFF] animate-gradient-pan font-bold" : ""}`}>
                  {btn.label}
                </span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Right */}
        <div id="tour-actions" className="order-2 flex min-h-[44px] min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto overflow-y-visible overscroll-x-contain scrollbar-none sm:gap-2 xl:order-3 xl:min-h-0">
          <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium mr-0.5">
            <span className="px-1.5 py-0.5 rounded-md bg-white border border-black/[0.06] text-neutral-500 tabular-nums">⌘P</span>
            <span className="text-neutral-400">Present</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white border border-black/[0.06] text-neutral-500 tabular-nums ml-1">⌘E</span>
            <span className="text-neutral-400">Export</span>
          </div>

          <CreditsHUD />

          <button
            type="button"
            disabled={!presentation?.id}
            onClick={async () => {
              if (!presentation?.id) return;
              let uid = ownerUserId || presentation.userId;
              if (!uid) {
                const { data: { user } } = await createClient().auth.getUser();
                uid = user?.id ?? '';
                if (uid) setOwnerUserId(uid);
              }
              if (uid) setShareModalOpen(true);
            }}
            className="min-h-9 h-9 sm:h-[36px] px-3 sm:px-3.5 text-neutral-800 bg-white border border-black/[0.08] hover:bg-neutral-50 hover:border-black/12 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold active:scale-[0.98] touch-manipulation disabled:opacity-40"
          >
            <Share2 size={15} className="text-neutral-500" strokeWidth={1.75} />
            <span className="hidden md:inline">Share</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorState({ isPresenting: true })}
            className="min-h-9 h-9 sm:h-[36px] px-3 sm:px-3.5 text-neutral-800 bg-white border border-black/[0.08] hover:bg-neutral-50 hover:border-black/12 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold active:scale-[0.98] touch-manipulation"
          >
            <Play size={15} className="text-primary fill-primary/15" strokeWidth={1.75} />
            <span className="hidden md:inline">Present</span>
          </button>

          <div className="w-px h-[22px] bg-black/[0.06] mx-0.5 hidden sm:block" />

          <button
            id="tour-export"
            type="button"
            onClick={() => openExportModal('pptx')}
            disabled={!presentation || isExporting}
            className="min-h-9 h-9 sm:h-[36px] px-3.5 sm:px-4 flex items-center shrink-0 whitespace-nowrap gap-2 text-[12px] sm:text-[13px] font-semibold text-white bg-gradient-to-b from-[#5B7CFF] to-primary hover:from-primary hover:to-[#3d5ef0] rounded-full shadow-[0_4px_14px_-4px_rgba(59,130,246,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none relative overflow-hidden group touch-manipulation"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep" />
            <Download size={15} className="shrink-0 relative" strokeWidth={1.75} />
            <span className="hidden xs:inline relative whitespace-nowrap">Export .pptx</span>
            <span className="xs:hidden relative whitespace-nowrap">PPTX</span>
          </button>
          <button
            type="button"
            onClick={() => openExportModal('pdf')}
            disabled={!presentation || isExporting}
            title="Export as PDF"
            className="min-h-9 h-9 sm:h-[36px] px-3 sm:px-3.5 flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-neutral-700 bg-white border border-black/[0.08] hover:bg-neutral-50 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
          >
            <FileText size={14} strokeWidth={1.75} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
        </div>
      </header>
    </>
  );
}

export const TopBar = memo(TopBarInner);
