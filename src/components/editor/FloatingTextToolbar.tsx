'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Minus, Plus,
  Image as ImageIcon,
  Lock, Unlock,
} from '@/components/icons/lucide';
import type { TextStyle, SlideElement } from '@/types';
import { ColorPicker } from '@/components/editor/ColorPicker';

// ── Helpers ──────────────────────────────────────────────────────────────────
function ToolbarDivider() {
  return <div className="w-px h-5 bg-neutral-200 shrink-0 mx-1" />;
}

interface ToolbarBtnProps {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}
function ToolbarBtn({ active, title, onClick, children, danger }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        // Prevent the textarea from losing focus when clicking toolbar buttons
        e.preventDefault();
        onClick();
      }}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-100 shrink-0 select-none
        ${active
          ? 'bg-indigo-600 text-white shadow-sm'
          : danger
            ? 'text-red-500 hover:bg-red-50'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }
      `}
    >
      {children}
    </button>
  );
}

// ── Object Fit Toolbar (image elements) ───────────────────────────────────────
function ObjectFitBar({ el }: { el: SlideElement }) {
  const updateElement = usePresentationStore((s) => s.updateElement);
  const slide = usePresentationStore((s) =>
    s.presentation?.slides[s.currentSlideIndex]
  );
  if (!slide) return null;

  const current = el.objectFit ?? 'cover';
  const options: { value: SlideElement['objectFit']; label: string }[] = [
    { value: 'cover', label: 'Cover' },
    { value: 'contain', label: 'Contain' },
    { value: 'fill', label: 'Fill' },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={`Object fit: ${opt.label}`}
          onMouseDown={(e) => {
            e.preventDefault();
            updateElement(slide.id, el.id, { objectFit: opt.value }, true);
          }}
          className={`
            px-2.5 h-7 text-[11px] font-semibold rounded-md transition-all duration-100 shrink-0
            ${current === opt.value
              ? 'bg-indigo-600 text-white'
              : 'text-neutral-600 hover:bg-neutral-100'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface FloatingTextToolbarProps {
  /** The current canvas scale factor (e.g. 0.7) used to compute absolute position */
  scale: number;
  /** Left offset of the canvas container within the viewport (from CanvasArea) */
  canvasLeft: number;
  /** Top offset of the canvas container within the viewport (from CanvasArea) */
  canvasTop: number;
}

export function FloatingTextToolbar({ scale, canvasLeft, canvasTop }: FloatingTextToolbarProps) {
  const { selectedElementId, previewElementId } = usePresentationStore(
    useShallow((s) => ({
      selectedElementId: s.editor.selectedElementId,
      previewElementId: s.editor.previewElementId,
    }))
  );

  const slide = usePresentationStore((s) =>
    s.presentation?.slides[s.currentSlideIndex]
  );
  const colorPalette = usePresentationStore((s) => s.presentation?.colorPalette ?? []);
  const updateElement = usePresentationStore((s) => s.updateElement);

  const el = slide?.elements?.find((e) => e.id === selectedElementId);

  // Only show for text or image elements
  const isText = el?.type === 'text';
  const isImage = el?.type === 'image' && !!el.src;
  const show = !!(el && (isText || isImage) && slide);

  if (!show || !el || !slide) return null;

  const ts: TextStyle = el.textStyle ?? {};

  const updateText = (updates: Partial<TextStyle>) => {
    updateElement(slide.id, el.id, { textStyle: { ...ts, ...updates } }, true);
  };

  const isBold = ts.fontWeight === 'bold';
  const isItalic = ts.fontStyle === 'italic';
  const isUnderline = ts.textDecoration === 'underline';
  const align = ts.textAlign ?? 'left';
  const fontSize = ts.fontSize ?? 24;
  const color = ts.color ?? '#FFFFFF';

  // Position: just above the element on the canvas
  const toolbarY = canvasTop + el.y * scale - 52;
  const toolbarX = canvasLeft + el.x * scale;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={`ftb-${el.id}`}
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: Math.max(8, toolbarY),
            left: Math.max(8, toolbarX),
            zIndex: 200,
          }}
          className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-xl shadow-lg px-2 py-1.5 pointer-events-auto"
        >
          {isText && (
            <>
              {/* Bold */}
              <ToolbarBtn active={isBold} title="Bold (Ctrl+B)" onClick={() => updateText({ fontWeight: isBold ? 'normal' : 'bold' })}>
                <Bold size={14} strokeWidth={2.2} />
              </ToolbarBtn>
              {/* Italic */}
              <ToolbarBtn active={isItalic} title="Italic (Ctrl+I)" onClick={() => updateText({ fontStyle: isItalic ? 'normal' : 'italic' })}>
                <Italic size={14} strokeWidth={2.2} />
              </ToolbarBtn>
              {/* Underline */}
              <ToolbarBtn active={isUnderline} title="Underline (Ctrl+U)" onClick={() => updateText({ textDecoration: isUnderline ? 'none' : 'underline' })}>
                <Underline size={14} strokeWidth={2.2} />
              </ToolbarBtn>

              <ToolbarDivider />

              {/* Alignment */}
              <ToolbarBtn active={align === 'left'} title="Align Left" onClick={() => updateText({ textAlign: 'left' })}>
                <AlignLeft size={14} />
              </ToolbarBtn>
              <ToolbarBtn active={align === 'center'} title="Align Center" onClick={() => updateText({ textAlign: 'center' })}>
                <AlignCenter size={14} />
              </ToolbarBtn>
              <ToolbarBtn active={align === 'right'} title="Align Right" onClick={() => updateText({ textAlign: 'right' })}>
                <AlignRight size={14} />
              </ToolbarBtn>

              <ToolbarDivider />

              {/* Font size */}
              <ToolbarBtn title="Decrease font size" onClick={() => updateText({ fontSize: Math.max(8, fontSize - 2) })}>
                <Minus size={13} strokeWidth={2.5} />
              </ToolbarBtn>
              <span className="text-[12px] font-bold text-neutral-800 min-w-[28px] text-center tabular-nums select-none">
                {fontSize}
              </span>
              <ToolbarBtn title="Increase font size" onClick={() => updateText({ fontSize: Math.min(200, fontSize + 2) })}>
                <Plus size={13} strokeWidth={2.5} />
              </ToolbarBtn>

              <ToolbarDivider />

              {/* Color */}
              <ColorPicker
                variant="icon"
                label="Text color"
                color={color}
                palettePresets={colorPalette}
                onChange={(c) => updateText({ color: c })}
              />
            </>
          )}

          {isImage && (
            <>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide ml-1 mr-1">Fit</span>
              <ObjectFitBar el={el} />
            </>
          )}

          <ToolbarDivider />

          {/* Lock */}
          <ToolbarBtn
            title={el.locked ? 'Unlock element' : 'Lock element'}
            active={el.locked}
            onClick={() => updateElement(slide.id, el.id, { locked: !el.locked }, true)}
          >
            {el.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </ToolbarBtn>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
