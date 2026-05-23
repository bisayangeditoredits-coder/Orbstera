'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, CheckCircle2, GitBranch, Loader2, AlertCircle } from 'lucide-react';

// ─── Starter templates ────────────────────────────────────────────────────────
const TEMPLATES: { id: string; label: string; emoji: string; code: string }[] = [
  {
    id: 'flowchart', label: 'Flowchart', emoji: '🔀',
    code: `flowchart TD
    A([Start]) --> B{Decision?}
    B -- Yes --> C[Do This]
    B -- No --> D[Do That]
    C --> E([End])
    D --> E`,
  },
  {
    id: 'sequence', label: 'Sequence', emoji: '💬',
    code: `sequenceDiagram
    Alice->>Bob: Hello Bob!
    Bob-->>Alice: Hi Alice!
    Alice->>Bob: How are you?
    Bob-->>Alice: Great, thanks!`,
  },
  {
    id: 'pie', label: 'Pie Chart', emoji: '🥧',
    code: `pie title Sales by Region
    "North" : 40
    "South" : 25
    "East" : 20
    "West" : 15`,
  },
  {
    id: 'gantt', label: 'Gantt', emoji: '📅',
    code: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Planning   :a1, 2024-01-01, 14d
    Design     :a2, after a1, 21d
    section Phase 2
    Development :b1, after a2, 30d
    Testing    :b2, after b1, 14d`,
  },
  {
    id: 'mindmap', label: 'Mind Map', emoji: '🧠',
    code: `mindmap
  root((Main Topic))
    Topic A
      Subtopic 1
      Subtopic 2
    Topic B
      Subtopic 3
    Topic C`,
  },
  {
    id: 'er', label: 'ER Diagram', emoji: '🗃️',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int orderNumber
        date createdAt
    }`,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function MermaidPanel({ onClose }: { onClose?: () => void }) {
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const [code, setCode] = useState(TEMPLATES[0].code);
  const [svgOutput, setSvgOutput] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [mermaidReady, setMermaidReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderIdRef = useRef(0);

  // Dynamically import and initialize mermaid
  useEffect(() => {
    let cancelled = false;
    import('mermaid').then((m) => {
      if (cancelled) return;
      m.default.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        fontFamily: 'Inter, Arial, sans-serif',
      });
      setMermaidReady(true);
    }).catch(() => {
      // mermaid not available
    });
    return () => { cancelled = true; };
  }, []);

  // Debounced render
  useEffect(() => {
    if (!mermaidReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      renderDiagram(code);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, mermaidReady]);

  const renderDiagram = useCallback(async (src: string) => {
    if (!src.trim()) { setSvgOutput(null); setRenderError(null); return; }
    setRendering(true); setRenderError(null);
    const id = ++renderIdRef.current;
    try {
      const mermaid = (await import('mermaid')).default;
      const renderId = `mermaid-render-${Date.now()}`;
      const { svg } = await mermaid.render(renderId, src.trim());
      if (renderIdRef.current === id) {
        setSvgOutput(svg);
        setRenderError(null);
      }
    } catch (err: any) {
      if (renderIdRef.current === id) {
        setSvgOutput(null);
        setRenderError(err?.message?.split('\n')[0] ?? 'Syntax error in diagram');
      }
    } finally {
      if (renderIdRef.current === id) setRendering(false);
    }
  }, []);

  const handleInsert = useCallback(() => {
    if (!svgOutput || currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    if (!slide) return;

    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgOutput);
    addElement(slide.id, {
      id: `el-mermaid-${Date.now()}`,
      type: 'image',
      x: 160, y: 80,
      width: 960, height: 520,
      src, zIndex: 10,
    } as any);

    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  }, [svgOutput, currentSlideIndex, presentation, addElement]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <GitBranch size={15} className="text-neutral-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-neutral-900 leading-none">Diagram Builder</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">Mermaid.js · Free</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-all">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6 space-y-3">

          {/* Template selector */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Diagram Type</p>
            <div className="grid grid-cols-3 gap-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.id}
                  onClick={() => setCode(t.code)}
                  className="flex flex-col items-center py-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 hover:shadow-sm transition-all group"
                >
                  <span className="text-lg mb-1">{t.emoji}</span>
                  <span className="text-[10px] font-bold text-neutral-600 group-hover:text-neutral-900 transition-colors">
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Code editor */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Diagram Code</p>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-neutral-200 bg-white text-[11.5px] font-mono text-neutral-800 p-3 focus:outline-none focus:border-neutral-400 transition-all resize-none leading-relaxed"
              style={{ height: 180, scrollbarWidth: 'none' }}
            />
          </div>

          {/* Preview */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Preview</p>
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden min-h-[140px] flex items-center justify-center">
              {rendering && (
                <div className="flex flex-col items-center gap-2 py-8 text-neutral-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-[11px] font-medium">Rendering…</span>
                </div>
              )}
              {renderError && !rendering && (
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <AlertCircle size={20} className="text-red-400" />
                  <p className="text-[11px] font-semibold text-red-500">Syntax error</p>
                  <p className="text-[10px] text-neutral-400 leading-relaxed max-w-full break-words">{renderError}</p>
                </div>
              )}
              {svgOutput && !rendering && !renderError && (
                <div
                  className="w-full p-3 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: svgOutput }}
                />
              )}
              {!svgOutput && !rendering && !renderError && !mermaidReady && (
                <div className="flex flex-col items-center gap-2 py-8 text-neutral-300">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-[11px] font-medium">Loading Mermaid…</span>
                </div>
              )}
            </div>
          </div>

          {/* Insert */}
          <AnimatePresence mode="wait">
            {inserted ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="h-12 rounded-2xl bg-neutral-900 flex items-center justify-center gap-2 shadow-md">
                <CheckCircle2 size={15} className="text-white" />
                <span className="text-white font-bold text-[13px]">Added to Slide!</span>
              </motion.div>
            ) : (
              <motion.button key="insert"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                onClick={handleInsert}
                disabled={!svgOutput || rendering}
                whileHover={{ scale: svgOutput ? 1.015 : 1 }} whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-2xl bg-neutral-900 text-white font-bold text-[13px] hover:bg-neutral-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
                <ArrowRight size={15} strokeWidth={2.5} />
                Insert Diagram into Slide
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
