'use client';

import { useCallback, type MutableRefObject } from 'react';
import type Konva from 'konva';
import type { EditorToolId } from '@/types';
import { usePresentationStore } from '@/store/usePresentationStore';
import { isSlideBackgroundTarget } from '@/hooks/canvas/canvas-coords';

export function useCanvasSelection(args: {
  activeTool: EditorToolId;
  ignoreNextBgClickRef: MutableRefObject<boolean>;
  onClearTextEdit: () => void;
}) {
  const { activeTool, ignoreNextBgClickRef, onClearTextEdit } = args;
  const selectElement = usePresentationStore((s) => s.selectElement);
  const selectElements = usePresentationStore((s) => s.selectElements);
  const clearMultiSelection = usePresentationStore((s) => s.clearMultiSelection);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isSlideBackgroundTarget(e.target)) return;
      if (ignoreNextBgClickRef.current) {
        ignoreNextBgClickRef.current = false;
        return;
      }
      if (activeTool === 'select') {
        selectElement(null);
        onClearTextEdit();
      }
    },
    [activeTool, ignoreNextBgClickRef, onClearTextEdit, selectElement],
  );

  const createElementSelectHandler = useCallback(
    (elementId: string) => (e?: Konva.KonvaEventObject<MouseEvent>) => {
      if (e?.evt?.shiftKey) {
        const currentIds = usePresentationStore.getState().editor.selectedElementIds;
        const alreadyIn = currentIds.includes(elementId);
        const newIds = alreadyIn
          ? currentIds.filter((id) => id !== elementId)
          : [...currentIds, elementId];
        if (newIds.length === 0) clearMultiSelection();
        else selectElements(newIds);
      } else {
        selectElement(elementId);
      }
    },
    [clearMultiSelection, selectElement, selectElements],
  );

  return {
    handleStageClick,
    createElementSelectHandler,
  };
}
