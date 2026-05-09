'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePresentationStore } from '@/store/usePresentationStore';
import { exportToPptx } from '@/lib/export';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, Download, Share2,
  Loader2, Layers, Wand2, FileText,
  CheckCircle, Pencil, X, Undo2, Redo2,
  FileDown, PackageCheck, Sparkles,
  Clock, AlignLeft, LayoutTemplate, Palette,
  Upload, AlertCircle, RefreshCw,
} from 'lucide-react';

// ── Export Progress Modal ─────────────────────────────────────────────────────
const EXPORT_STEPS = [
  { icon: Sparkles,     label: 'Analyzing layout',      detail: 'Mapping elements & coordinates'   },
  { icon: PackageCheck, label: 'Building PPTX',          detail: 'Embedding fonts, images & shapes' },
  { icon: FileDown,     label: 'Downloading',            detail: 'Transferring to your device'       },
];

function ExportModal({ step, done, error, onClose }: {
  step: number; done: boolean; error: string | null; onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl border border-black/[0.06] p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-6"
      >
        {done && !error ? (
          <>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center"
            >
              <CheckCircle size={40} className="text-emerald-500" />
            </motion.div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-black">Export Complete!</h3>
              <p className="text-sm text-gray-500 mt-1">Your PPTX is ready & fully editable</p>
            </div>
            <button
              onClick={onClose}
              className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.97]"
            >
              Done
            </button>
          </>
        ) : error ? (
          <>
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <X size={36} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-black">Export Failed</h3>
              <p className="text-xs text-red-400 mt-1 max-w-[240px] text-center">{error}</p>
            </div>
            <button onClick={onClose} className="w-full h-11 rounded-xl bg-red-500 text-white font-bold text-sm">
              Close
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={28} className="text-primary" />
              </motion.div>
            </div>
            <div className="w-full space-y-3">
              {EXPORT_STEPS.map((s, i) => {
                const Icon   = s.icon;
                const active = i === step;
                const done2  = i < step;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: active || done2 ? 1 : 0.3 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      active ? 'bg-primary/5 border border-primary/15' : 'bg-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      done2  ? 'bg-emerald-50'  :
                      active ? 'bg-primary/10' : 'bg-gray-50'
                    }`}>
                      {done2 ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : active ? (
                        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          <Icon size={16} className="text-primary" />
                        </motion.div>
                      ) : (
                        <Icon size={16} className="text-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-semibold leading-tight ${active ? 'text-primary' : done2 ? 'text-black' : 'text-gray-300'}`}>
                        {s.label}
                      </p>
                      {active && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-gray-400 mt-0.5">
                          {s.detail}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

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
    <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-lg bg-black/[0.03] border border-black/[0.04]">
      <Stat icon={LayoutTemplate} value={slides.length} label="slides" />
      <div className="w-px h-3 bg-black/10" />
      <Stat icon={AlignLeft}      value={wordCount}     label="words"  />
      <div className="w-px h-3 bg-black/10" />
      <Stat icon={Clock}          value={`${readMin}m`} label="read"   />
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={11} className="text-black/30" />
      <span className="text-[11px] font-bold text-black/50">{value}</span>
      <span className="text-[10px] text-black/30 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Editable Title ────────────────────────────────────────────────────────────
function EditableTitle() {
  const { presentation, updatePresentation } = usePresentationStore();
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(presentation?.title || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commit = () => {
    if (draft.trim()) updatePresentation({ title: draft.trim() });
    setEditing(false);
  };

  if (!presentation) return null;

  return (
    <div className="flex flex-col min-w-0 ml-2 group/title">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="font-semibold text-[13px] leading-tight max-w-[220px] bg-primary/5 border border-primary/20 rounded px-1.5 py-0.5 text-primary outline-none"
          autoFocus
        />
      ) : (
        <button
          onClick={startEdit}
          className="flex items-center gap-1.5 group/btn"
          title="Click to rename"
        >
          <span className="font-semibold text-[13px] leading-tight truncate max-w-[200px] text-textMain">
            {presentation.title || 'Untitled Presentation'}
          </span>
          <Pencil size={11} className="text-black/20 opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0" />
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
    <div className="hidden sm:flex items-center gap-0.5 bg-black/[0.03] rounded-lg p-0.5 border border-black/[0.05]">
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="w-7 h-7 flex items-center justify-center rounded-md text-textMuted hover:text-textMain hover:bg-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <Undo2 size={13} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="w-7 h-7 flex items-center justify-center rounded-md text-textMuted hover:text-textMain hover:bg-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <Redo2 size={13} />
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
interface TopBarProps { onOpenGenerate?: () => void; }

export function TopBar({ onOpenGenerate }: TopBarProps) {
  const router = useRouter();
  const store       = usePresentationStore();
  const presentation = store.presentation;
  const { activePanel, setActivePanel, isPanelOpen, setPanelOpen, setEditorState, setPresentation } = store;
  const cloudSync = store.editor.cloudSyncStatus;
  const cloudMsg  = store.editor.cloudSyncMessage;

  const [exportStep,  setExportStep]  = useState(-1);   // -1 = not exporting
  const [exportDone,  setExportDone]  = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImportError(null);
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/import/presentation', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Import failed (${res.status})`);
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
      const res = await fetch(`/api/presentations?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data?.id) {
        setPresentation(data);
        setEditorState({ cloudSyncStatus: 'idle', cloudSyncMessage: undefined });
      }
    } catch {
      setEditorState({ cloudSyncStatus: 'error', cloudSyncMessage: 'Reload failed' });
    }
  };

  const retrySaveNow = async () => {
    const body = usePresentationStore.getState().presentation;
    if (!body?.id) return;
    setEditorState({ cloudSyncStatus: 'saving', cloudSyncMessage: undefined });
    try {
      const res = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setEditorState({
          cloudSyncStatus: 'conflict',
          cloudSyncMessage: 'This deck was saved elsewhere. Reload to get the latest version.',
        });
        return;
      }
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');
      if (data.success && typeof data.saveVersion === 'number') {
        usePresentationStore.getState().updatePresentation({
          saveVersion: data.saveVersion,
          lastCloudSavedAt: data.updatedAt || new Date().toISOString(),
        });
      }
      setEditorState({ cloudSyncStatus: 'saved' });
      window.setTimeout(() => {
        const st = usePresentationStore.getState().editor.cloudSyncStatus;
        if (st === 'saved') setEditorState({ cloudSyncStatus: 'idle' });
      }, 1800);
    } catch (e: unknown) {
      setEditorState({
        cloudSyncStatus: 'error',
        cloudSyncMessage: e instanceof Error ? e.message : 'Save failed',
      });
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!presentation) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); }
      if (mod && e.key === 'p') { e.preventDefault(); setEditorState({ isPresenting: true }); }
      if (mod && e.key === 'e') { e.preventDefault(); handleExportCheck(); }
      if (mod && e.key === 'd') { e.preventDefault(); handlePanelToggle('design'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentation]);

  const handleExportCheck = async () => {
    if (!presentation || exportStep >= 0) return;
    
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
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    }
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

  const closeModal = () => {
    setExportStep(-1);
    setExportDone(false);
    setExportError(null);
  };

  const handlePanelToggle = (panel: typeof activePanel) => {
    if (activePanel === panel && isPanelOpen) setPanelOpen(false);
    else { setActivePanel(panel); setPanelOpen(true); }
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const isExporting = exportStep >= 0 && !exportDone && !exportError;

  return (
    <>
      {/* ── Watermark Upsell Modal ── */}
      <AnimatePresence>
        {showWatermarkModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-black/[0.06] p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Sparkles size={28} className="text-amber-500" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-black">Remove Watermark</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Export your presentation without the Orbstera watermark.
                </p>
              </div>
              
              <div className="w-full space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full h-12 rounded-xl bg-primary text-white font-bold text-[15px] hover:bg-primary/90 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                >
                  Pay $1.49 once
                </button>
                <button
                  onClick={startExport}
                  className="w-full h-12 rounded-xl bg-black/[0.03] text-gray-600 font-semibold text-[14px] hover:bg-black/[0.06] transition-all active:scale-[0.97]"
                >
                  Export with watermark (Free)
                </button>
              </div>
              
              <button onClick={() => setShowWatermarkModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black">
                <X size={20} />
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

      <AnimatePresence>
        {exportStep >= 0 && (
          <ExportModal
            step={exportStep}
            done={exportDone}
            error={exportError}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>

      <header className="h-[52px] border-b-2 border-black/[0.08] bg-background flex items-center justify-between px-4 z-50 shrink-0 shadow-sm">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/dashboard"
            className="shrink-0 text-textMuted hover:text-textMain hover:bg-hoverSurface transition-all p-1.5 rounded-md"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="w-px h-[16px] bg-borderSubtle shrink-0" />
          <Link href="/" className="shrink-0 flex items-center gap-2">
            <img src="/logo.png.png" alt="Orbstera" className="h-5 w-auto object-contain" />
          </Link>

          <EditableTitle />

          {/* Cloud sync status */}
          {presentation && (
            <div className="shrink-0 flex items-center gap-1 flex-wrap max-w-[200px]">
              <input
                ref={importInputRef}
                type="file"
                accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={(e) => handleImportFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                disabled={importBusy}
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border border-black/[0.08] bg-white text-black/60 hover:text-black hover:border-black/15 transition-all disabled:opacity-40"
                title="Import .pptx"
              >
                <Upload size={11} />
                <span className="hidden sm:inline">Import</span>
              </button>
              {cloudSync === 'saving' && (
                <div className="flex items-center gap-1 text-amber-600 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100">
                  <Loader2 size={10} className="animate-spin" />
                  <span className="hidden sm:inline">Saving…</span>
                </div>
              )}
              {cloudSync === 'saved' && (
                <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">
                  <CheckCircle size={10} />
                  <span className="hidden sm:inline">Saved</span>
                </div>
              )}
              {cloudSync === 'idle' && !importBusy && (
                <div className="hidden md:flex items-center gap-1 text-black/35 text-[10px] font-medium px-1.5 py-0.5">
                  <span>Cloud</span>
                </div>
              )}
              {cloudSync === 'error' && (
                <div className="flex items-center gap-1 text-red-600 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 border border-red-100 max-w-[140px]">
                  <AlertCircle size={10} className="shrink-0" />
                  <span className="truncate" title={cloudMsg}>{cloudMsg || 'Sync error'}</span>
                  <button type="button" onClick={retrySaveNow} className="shrink-0 p-0.5 rounded hover:bg-red-100" title="Retry save">
                    <RefreshCw size={10} />
                  </button>
                </div>
              )}
              {cloudSync === 'conflict' && (
                <div className="flex items-center gap-1 text-violet-700 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 border border-violet-100 max-w-[160px]">
                  <span className="truncate">Conflict</span>
                  <button type="button" onClick={reloadFromCloud} className="shrink-0 underline">Reload</button>
                </div>
              )}
              {cloudSync === 'retrying' && (
                <div className="flex items-center gap-1 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Retry…</span>
                </div>
              )}
            </div>
          )}

          <div className="w-px h-[16px] bg-borderSubtle shrink-0 mx-1" />
          <UndoRedo />
          <SlideStats />
        </div>

        {/* Center — panel toggles */}
        <div id="tour-panel-tabs" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/80 backdrop-blur-md border border-borderSubtle rounded-xl px-1 py-1 shadow-sm">
          {PANEL_BUTTONS.map((btn) => {
            const isActive = activePanel === btn.id && isPanelOpen;
            return (
              <button
                key={btn.id}
                onClick={() => handlePanelToggle(btn.id)}
                className={`flex items-center gap-2 px-4 h-[32px] rounded-lg text-[12px] font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-primary border border-primary/10 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.2)]'
                    : 'text-textSecondary hover:text-textMain hover:bg-hoverSurface'
                }`}
              >
                <btn.icon size={15} className={isActive ? 'text-primary' : 'text-textMuted'} />
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right */}
        <div id="tour-actions" className="flex items-center gap-2 shrink-0">
          {/* Keyboard shortcut hints */}
          <div className="hidden xl:flex items-center gap-1 text-[10px] text-black/25 font-mono mr-1">
            <span className="px-1.5 py-0.5 rounded bg-black/[0.04] border border-black/[0.06]">⌘P</span>
            <span>Present</span>
            <span className="px-1.5 py-0.5 rounded bg-black/[0.04] border border-black/[0.06] ml-2">⌘E</span>
            <span>Export</span>
            <span className="px-1.5 py-0.5 rounded bg-black/[0.04] border border-black/[0.06] ml-2">⌘D</span>
            <span>Design</span>
          </div>

          <button 
            onClick={handleShare}
            className="h-[36px] px-[14px] text-textMain bg-white border border-borderSubtle hover:bg-hoverSurface rounded-lg shadow-sm transition-all flex items-center gap-2 text-[13px] font-semibold active:scale-[0.97]"
          >
            {isCopied ? <CheckCircle size={16} className="text-emerald-500" /> : <Share2 size={16} className="text-textSecondary" />}
            <span className="hidden md:inline">{isCopied ? 'Copied Link!' : 'Share'}</span>
          </button>

          <button
            onClick={() => setEditorState({ isPresenting: true })}
            className="h-[36px] px-[14px] text-textMain bg-white border border-borderSubtle hover:bg-hoverSurface rounded-lg shadow-sm transition-all flex items-center gap-2 text-[13px] font-semibold active:scale-[0.97]"
          >
            <Play size={16} className="text-primary fill-primary/20" />
            <span className="hidden md:inline">Present</span>
          </button>

          <div className="w-px h-[20px] bg-borderSubtle mx-1" />

          <button
            id="tour-export"
            onClick={handleExportCheck}
            disabled={!presentation || isExporting}
            className="h-[36px] px-[16px] flex items-center gap-2 text-[13px] font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-md hover:shadow-primary/30 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group"
          >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Download size={16} />
            <span>Export .pptx</span>
          </button>
        </div>
      </header>
    </>
  );
}
