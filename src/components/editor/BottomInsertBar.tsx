'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import {
  Type, Square, ImageIcon,
  Minus, ChevronUp,
} from 'lucide-react';
import type { EditorToolId } from '@/types';

// ── Real insert items ─────────────────────────────────────────────────────────
const INSERT_ITEMS: { tool: EditorToolId; icon: React.ElementType; label: string }[] = [
  { tool: 'text',  icon: Type,      label: 'Text'  },
  { tool: 'rect',  icon: Square,    label: 'Shape' },
  { tool: 'image', icon: ImageIcon,  label: 'Image' },
];

// ── More-menu extra items ─────────────────────────────────────────────────────
const MORE_ITEMS: { tool: EditorToolId; icon: React.ElementType; label: string }[] = [
  { tool: 'divider', icon: Minus, label: 'Divider' },
];

// ── Main BottomInsertBar ──────────────────────────────────────────────────────
export function BottomInsertBar() {
  const setEditorState    = usePresentationStore((s) => s.setEditorState);
  const activeTool        = usePresentationStore((s) => s.editor.activeTool);
  const addElement        = usePresentationStore((s) => s.addElement);
  const selectElement     = usePresentationStore((s) => s.selectElement);
  const presentation      = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);

  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "more" popover on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  // Insert a divider (thin horizontal line shape)
  const handleDividerInsert = () => {
    setShowMore(false);
    const slide = presentation?.slides[currentSlideIndex];
    if (!slide) return;
    const newId = `el-divider-${Date.now()}`;
    addElement(slide.id, {
      id: newId,
      type: 'shape',
      shapeType: 'line',
      x: 140,
      y: 360,
      width: 1000,
      height: 4,
      zIndex: (slide.elements?.length || 0) + 1,
      visible: true,
      opacity: 1,
      locked: false,
      shapeStyle: {
        fill: 'rgba(0,0,0,0.2)',
        stroke: 'rgba(0,0,0,0.2)',
        strokeWidth: 2,
      },
    });
    selectElement(newId);
    setEditorState({ activeTool: 'select' });
  };

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      style={{ bottom: 24 }}
    >
      <div ref={moreRef} className="relative pointer-events-auto">
        {/* More popover */}
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 350 }}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden flex flex-col min-w-[140px]"
              style={{
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.1)',
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 px-4 pt-3 pb-1.5">
                More Elements
              </p>
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.tool}
                    type="button"
                    onClick={() => {
                      if (item.tool === 'divider') {
                        handleDividerInsert();
                      } else {
                        setEditorState({ activeTool: item.tool });
                        setShowMore(false);
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors text-left hover:bg-neutral-100"
                    style={{ color: 'rgba(0,0,0,0.65)' }}
                  >
                    <Icon size={15} strokeWidth={1.7} />
                    <span className="text-[12px] font-semibold">{item.label}</span>
                  </button>
                );
              })}
              <div className="h-3" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main bar */}
        <div
          className="flex items-center backdrop-blur-xl rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          {INSERT_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.tool;
            return (
              <button
                key={item.tool}
                type="button"
                onClick={() => setEditorState({ activeTool: item.tool })}
                title={item.label}
                className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 transition-all duration-150 group min-w-[68px] relative"
                style={{
                  color: isActive ? '#4f46e5' : '#6b7280',
                  background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="insert-active-bg"
                    className="absolute inset-0"
                    style={{ background: 'rgba(99,102,241,0.15)' }}
                    transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                  />
                )}
                <Icon size={17} strokeWidth={1.7} className="relative z-10" />
                <span className="text-[10px] font-semibold whitespace-nowrap leading-none relative z-10">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Separator */}
          <div className="w-px h-8 mx-0.5" style={{ background: 'rgba(0,0,0,0.1)' }} />

          {/* More */}
          <button
            type="button"
            title="More insert options"
            onClick={() => setShowMore((v) => !v)}
            className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 transition-all duration-150 min-w-[48px] hover:text-neutral-900"
            style={{ color: showMore ? '#111827' : '#6b7280' }}
          >
            <ChevronUp
              size={17}
              strokeWidth={1.7}
              className="transition-transform duration-200"
              style={{ transform: showMore ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
