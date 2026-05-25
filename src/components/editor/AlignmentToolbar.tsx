'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from '@/components/icons/lucide';

interface AlignBtnProps {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}
function AlignBtn({ title, onClick, children }: AlignBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-indigo-600 transition-all duration-100 shrink-0"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-neutral-200 shrink-0 mx-0.5" />;
}

export function AlignmentToolbar() {
  const { selectedElementIds } = usePresentationStore(
    useShallow((s) => ({
      selectedElementIds: s.editor.selectedElementIds,
    }))
  );

  const slide = usePresentationStore((s) =>
    s.presentation?.slides[s.currentSlideIndex]
  );
  const updateElement = usePresentationStore((s) => s.updateElement);
  const pushHistory = usePresentationStore((s) => s.pushHistory);

  const selectedElements = (slide?.elements ?? []).filter((el) =>
    selectedElementIds.includes(el.id)
  );

  const visible = selectedElements.length >= 2 && !!slide;

  const apply = useCallback(
    (fn: (els: typeof selectedElements) => Record<string, { x?: number; y?: number }>) => {
      if (!slide || selectedElements.length < 2) return;
      pushHistory();
      const updates = fn(selectedElements);
      for (const [id, upd] of Object.entries(updates)) {
        updateElement(slide.id, id, upd);
      }
    },
    [slide, selectedElements, pushHistory, updateElement]
  );

  // ── Alignment helpers ────────────────────────────────────────────────────
  const minX = Math.min(...selectedElements.map((el) => el.x));
  const maxRight = Math.max(...selectedElements.map((el) => el.x + el.width));
  const minY = Math.min(...selectedElements.map((el) => el.y));
  const maxBottom = Math.max(...selectedElements.map((el) => el.y + el.height));
  const centerH = (minX + maxRight) / 2;
  const centerV = (minY + maxBottom) / 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="alignment-toolbar"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-xl shadow-lg px-2 py-1.5 pointer-events-auto"
          style={{ position: 'relative', zIndex: 200 }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1 mr-1 shrink-0">
            Align
          </span>
          <ToolbarDivider />

          {/* Horizontal alignment */}
          <AlignBtn title="Align Left" onClick={() => apply((els) => Object.fromEntries(els.map((el) => [el.id, { x: minX }])))}>
            <AlignStartVertical size={14} />
          </AlignBtn>
          <AlignBtn title="Align Center Horizontally" onClick={() => apply((els) => Object.fromEntries(els.map((el) => [el.id, { x: centerH - el.width / 2 }])))}>
            <AlignCenterVertical size={14} />
          </AlignBtn>
          <AlignBtn title="Align Right" onClick={() => apply((els) => Object.fromEntries(els.map((el) => [el.id, { x: maxRight - el.width }])))}>
            <AlignEndVertical size={14} />
          </AlignBtn>

          <ToolbarDivider />

          {/* Vertical alignment */}
          <AlignBtn title="Align Top" onClick={() => apply((els) => Object.fromEntries(els.map((el) => [el.id, { y: minY }])))}>
            <AlignStartHorizontal size={14} />
          </AlignBtn>
          <AlignBtn title="Align Center Vertically" onClick={() => apply((els) => Object.fromEntries(els.map((el) => [el.id, { y: centerV - el.height / 2 }])))}>
            <AlignCenterHorizontal size={14} />
          </AlignBtn>
          <AlignBtn title="Align Bottom" onClick={() => apply((els) => Object.fromEntries(els.map((el) => [el.id, { y: maxBottom - el.height }])))}>
            <AlignEndHorizontal size={14} />
          </AlignBtn>

          <ToolbarDivider />

          {/* Distribute */}
          <AlignBtn
            title="Distribute Horizontally"
            onClick={() =>
              apply((els) => {
                const sorted = [...els].sort((a, b) => a.x - b.x);
                const totalWidth = sorted.reduce((s, e) => s + e.width, 0);
                const gap = (maxRight - minX - totalWidth) / (sorted.length - 1);
                let cursor = minX;
                return Object.fromEntries(
                  sorted.map((el) => {
                    const x = cursor;
                    cursor += el.width + gap;
                    return [el.id, { x }];
                  })
                );
              })
            }
          >
            <AlignHorizontalDistributeCenter size={14} />
          </AlignBtn>
          <AlignBtn
            title="Distribute Vertically"
            onClick={() =>
              apply((els) => {
                const sorted = [...els].sort((a, b) => a.y - b.y);
                const totalHeight = sorted.reduce((s, e) => s + e.height, 0);
                const gap = (maxBottom - minY - totalHeight) / (sorted.length - 1);
                let cursor = minY;
                return Object.fromEntries(
                  sorted.map((el) => {
                    const y = cursor;
                    cursor += el.height + gap;
                    return [el.id, { y }];
                  })
                );
              })
            }
          >
            <AlignVerticalDistributeCenter size={14} />
          </AlignBtn>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
