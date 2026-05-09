'use client';

import Link from 'next/link';
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
  const store       = usePresentationStore();
  const presentation = store.presentation;
  const { activePanel, setActivePanel, isPanelOpen, setPanelOpen, setEditorState } = store;

  const [exportStep,  setExportStep]  = useState(-1);   // -1 = not exporting
  const [exportDone,  setExportDone]  = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!presentation) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); }
      if (mod && e.key === 'p') { e.preventDefault(); setEditorState({ isPresenting: true }); }
      if (mod && e.key === 'e') { e.preventDefault(); handleExport(); }
      if (mod && e.key === 'd') { e.preventDefault(); handlePanelToggle('design'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentation]);

  const handleExport = useCallback(async () => {
    if (!presentation || exportStep >= 0) return;
    setExportStep(0);
    setExportDone(false);
    setExportError(null);

    try {
      // Step 0: analyzing
      await new Promise((r) => setTimeout(r, 600));
      setExportStep(1);

      // Step 1: building (actual API call)
      await exportToPptx(presentation);
      setExportStep(2);

      // Step 2: downloading
      await new Promise((r) => setTimeout(r, 500));
      setExportDone(true);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    }
  }, [presentation, exportStep]);

  const closeModal = () => {
    setExportStep(-1);
    setExportDone(false);
    setExportError(null);
  };

  const handlePanelToggle = (panel: typeof activePanel) => {
    if (activePanel === panel && isPanelOpen) setPanelOpen(false);
    else { setActivePanel(panel); setPanelOpen(true); }
  };

  const isExporting = exportStep >= 0 && !exportDone && !exportError;

  return (
    <>
      {/* ── Export Modal ── */}
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

          {/* Auto-save badge */}
          {presentation && (
            <div className="shrink-0 flex items-center gap-1 text-emerald-500 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100">
              <CheckCircle size={10} />
              <span className="hidden sm:inline">Saved</span>
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

          <button className="h-[36px] px-[14px] text-textMain bg-white border border-borderSubtle hover:bg-hoverSurface rounded-lg shadow-sm transition-all flex items-center gap-2 text-[13px] font-semibold active:scale-[0.97]">
            <Share2 size={16} className="text-textSecondary" />
            <span className="hidden md:inline">Share</span>
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
            onClick={handleExport}
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
