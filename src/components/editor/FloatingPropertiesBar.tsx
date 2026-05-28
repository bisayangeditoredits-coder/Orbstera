'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Lock, Unlock,
  Copy, Trash2,
  ChevronUp, ChevronDown,
  Eye,
  FlipHorizontal2, FlipVertical2,
  Move,
  Wand2, Loader2,
} from 'lucide-react';
import type { SlideElement } from '@/types';
import { ColorPicker } from './ColorPicker';

// ── Helpers ──────────────────────────────────────────────────────────────────
interface BtnProps {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}
function Btn({ active, title, onClick, children, danger, disabled, className }: BtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      className={`
        flex items-center justify-center w-8 h-8 rounded-md transition-all duration-100 shrink-0 select-none
        ${active
          ? 'bg-indigo-600 text-white shadow-sm'
          : danger
            ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
            : 'text-neutral-600 hover:bg-black/[0.06] hover:text-neutral-900'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className ?? ''}
      `}
    >
      {children}
    </button>
  );
}

// ── Get element's current fill/text color ─────────────────────────────────────
function getElementColor(el: SlideElement): string | null {
  if (el.type === 'text') {
    // textStyle.color is the canonical field (same as DesignPanel uses)
    return (el as any).textStyle?.color ?? (el as any).style?.color ?? '#1a1a1a';
  }
  if (el.type === 'shape') {
    return (el as any).shapeStyle?.fill ?? '#7B61FF';
  }
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────
interface FloatingPropertiesBarProps {
  scale: number;
  canvasLeft: number;
  canvasTop: number;
}

export function FloatingPropertiesBar({ scale, canvasLeft, canvasTop }: FloatingPropertiesBarProps) {
  const { selectedElementId, isPanningImage } = usePresentationStore(
    useShallow((s) => ({ 
      selectedElementId: s.editor.selectedElementId,
      isPanningImage: s.editor.isPanningImage
    }))
  );
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const [isAnimating, setIsAnimating] = useState(false);

  const slide = usePresentationStore((s) => s.presentation?.slides[s.currentSlideIndex]);
  const updateElement = usePresentationStore((s) => s.updateElement);
  const removeElement = usePresentationStore((s) => s.removeElement);
  const duplicateElement = usePresentationStore((s) => s.duplicateElement);
  const reorderElements = usePresentationStore((s) => s.reorderElements);

  const el = slide?.elements?.find((e) => e.id === selectedElementId);
  const show = !!(el && slide && !el.id.startsWith('bg-'));

  const update = useCallback((updates: Partial<SlideElement>, saveHistory = false) => {
    if (!slide || !el) return;
    updateElement(slide.id, el.id, updates, saveHistory);
  }, [slide, el, updateElement]);

  const commitUpdate = useCallback((updates: Partial<SlideElement>) => {
    update(updates, true);
  }, [update]);

  if (!show || !el || !slide) return null;

  // Position the bar higher above the element to clear the rotation handle
  const rawTop = canvasTop + el.y * scale - 84;
  const rawLeft = canvasLeft + el.x * scale;
  const barTop = Math.max(120, Math.min(window.innerHeight - 80, rawTop));
  const barLeft = Math.max(8, Math.min(window.innerWidth - 200, rawLeft));

  const currentElementIds = (slide.elements || []).map(e => e.id);
  const myIndex = currentElementIds.indexOf(el.id);
  const canMoveUp = myIndex < currentElementIds.length - 1;
  const canMoveDown = myIndex > 0;

  const elColor = getElementColor(el);

  // Apply color change live (no history) — mirrors how DesignPanel does it
  const handleColorChange = (newColor: string) => {
    const elAny = el as any;
    if (el.type === 'text') {
      updateElement(slide.id, el.id, {
        textStyle: { ...elAny.textStyle, color: newColor },
        // also patch style.color for legacy renderers
        style: { ...elAny.style, color: newColor },
      } as any, false);
    } else if (el.type === 'shape') {
      updateElement(slide.id, el.id, {
        shapeStyle: { ...elAny.shapeStyle, fill: newColor },
      } as any, false);
    }
  };

  const handleAnimate = async () => {
    if (!el || !slide || !el.aiMetadata?.leonardoImageId) return;
    setIsAnimating(true);
    updateElement(slide.id, el.id, { aiImagePending: true }, false);
    try {
      const res = await fetch('/api/generate/animate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: el.aiMetadata.leonardoImageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to animate image');
      if (data.url) {
        updateElement(slide.id, el.id, {
          src: data.url,
          animation: el.animation ?? { entrance: 'fadeIn', duration: 600, delay: 0 },
          aiImagePending: false,
        }, true);
        window.dispatchEvent(new Event('credits-updated'));
      } else {
        updateElement(slide.id, el.id, { aiImagePending: false }, false);
      }
    } catch (err) {
      console.error(err);
      updateElement(slide.id, el.id, { aiImagePending: false }, false);
      alert(err instanceof Error ? err.message : 'An error occurred animating the image');
    } finally {
      setIsAnimating(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
          key={`fpb-${el.id}`}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: barTop,
            left: barLeft,
            zIndex: 9999,
          }}
          className="flex items-center gap-1 bg-white backdrop-blur-xl border border-black/10 rounded-xl shadow-lg px-2 py-1.5 pointer-events-auto select-none"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* ── Z-order ──────────────────────────────────────── */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="Bring forward (Ctrl+])"
              disabled={!canMoveUp}
              onMouseDown={(e) => { e.preventDefault(); if (canMoveUp) reorderElements(slide.id, el.id, 'up'); }}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${canMoveUp ? 'text-neutral-500 hover:text-indigo-600 hover:bg-black/[0.06]' : 'text-neutral-300 cursor-not-allowed'}`}
            >
              <ChevronUp size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              title="Send backward (Ctrl+[)"
              disabled={!canMoveDown}
              onMouseDown={(e) => { e.preventDefault(); if (canMoveDown) reorderElements(slide.id, el.id, 'down'); }}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${canMoveDown ? 'text-neutral-500 hover:text-indigo-600 hover:bg-black/[0.06]' : 'text-neutral-300 cursor-not-allowed'}`}
            >
              <ChevronDown size={14} strokeWidth={2.5} />
            </button>
          </div>

          <div className="w-px h-5 bg-black/[0.09] shrink-0 mx-1" />

          {/* ── Color Picker ─────────────────────────────────── */}
          {elColor && (
            <>
              <ColorPicker
                color={elColor}
                label={el.type === 'text' ? 'Text Color' : 'Fill'}
                variant="icon"
                onChange={handleColorChange}
              />
              <div className="w-px h-5 bg-black/[0.09] shrink-0 mx-1" />
            </>
          )}

          {/* ── Flip ─────────────────────────────────────────── */}
          {(el.type === 'shape' || el.type === 'image') && (
            <>
              <div className="flex items-center gap-0.5">
                <Btn
                  title="Flip horizontally"
                  onClick={() => commitUpdate({ flipX: !el.flipX })}
                >
                  <FlipHorizontal2 size={14} strokeWidth={2} />
                </Btn>
                <Btn
                  title="Flip vertically"
                  onClick={() => commitUpdate({ flipY: !el.flipY })}
                >
                  <FlipVertical2 size={14} strokeWidth={2} />
                </Btn>
              </div>
              <div className="w-px h-5 bg-black/[0.09] shrink-0 mx-1" />
            </>
          )}

          {/* ── AI ────────────────────────────────────────────── */}
          {el.type === 'image' && el.aiMetadata?.leonardoImageId && (
            <>
              <button
                type="button"
                title="Animate image with Leonardo SVD"
                disabled={isAnimating}
                onClick={handleAnimate}
                className={
                  isAnimating
                    ? 'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold bg-[#5B7CFF]/10 text-[#5B7CFF] cursor-not-allowed'
                    : 'flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[11px] font-bold bg-gradient-to-b from-[#5B7CFF] to-primary text-white hover:from-primary hover:to-[#3d5ef0] shadow-[0_4px_14px_-4px_rgba(59,130,246,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset] transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group'
                }
              >
                {!isAnimating && (
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep" />
                )}
                {isAnimating ? <Loader2 size={14} className="animate-spin relative z-10" /> : <Wand2 size={14} strokeWidth={2.5} className="relative z-10" />}
                <span className="relative z-10">Animate</span>
              </button>
              <div className="w-px h-5 bg-black/[0.09] shrink-0 mx-1" />
            </>
          )}

          {/* ── Actions ──────────────────────────────────────── */}
          <Btn
            title={el.locked ? 'Unlock element' : 'Lock element (prevents accidental moves)'}
            active={el.locked}
            onClick={() => commitUpdate({ locked: !el.locked })}
          >
            {el.locked ? <Lock size={14} strokeWidth={2.5} /> : <Unlock size={14} strokeWidth={2} />}
          </Btn>

          <Btn
            title={el.visible === false ? 'Show element' : 'Hide element'}
            active={el.visible === false}
            onClick={() => commitUpdate({ visible: el.visible === false ? true : false })}
          >
            <Eye size={14} strokeWidth={2} />
          </Btn>

          <Btn
            title="Duplicate (Ctrl+D)"
            onClick={() => duplicateElement(slide.id, el.id)}
          >
            <Copy size={14} strokeWidth={2} />
          </Btn>

          <Btn
            danger
            title="Delete element (Delete)"
            disabled={el.locked}
            onClick={() => {
              removeElement(slide.id, el.id);
              usePresentationStore.getState().selectElement(null);
            }}
          >
            <Trash2 size={14} strokeWidth={2} />
          </Btn>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
