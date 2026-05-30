'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { SlideElement } from '@/types';
import { usePresentationStore } from '@/store/usePresentationStore';
import {
  getGenerationRevealOrder,
  generationRevealDelayMs,
} from '@/lib/generation-element-reveal';
import { EMPTY_STRING_ARRAY } from '@/lib/stable-refs';

type UseGenerationElementRevealArgs = {
  slideId: string;
  elements: SlideElement[];
  enabled: boolean;
  slideAlreadyRevealed: boolean;
};

export function useGenerationElementReveal({
  slideId,
  elements,
  enabled,
  slideAlreadyRevealed,
}: UseGenerationElementRevealArgs) {
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const [visibleElementIds, setVisibleElementIds] = useState<Set<string>>(() => new Set());
  const [isRevealing, setIsRevealing] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runIdRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const markSlideRevealed = useCallback(() => {
    const revealed =
      usePresentationStore.getState().editor.generationRevealedSlides ?? EMPTY_STRING_ARRAY;
    if (revealed.includes(slideId)) return;
    setEditorState({ generationRevealedSlides: [...revealed, slideId] });
  }, [slideId, setEditorState]);

  const elementKey = useMemo(
    () =>
      JSON.stringify(
        elements.map((e) => ({
          id: e.id,
          visible: e.visible,
          type: e.type,
          zIndex: e.zIndex,
          y: e.y,
          width: e.width,
          height: e.height,
          shapeType: e.type === 'shape' ? e.shapeType : undefined,
          shapeFill: e.type === 'shape' ? e.shapeStyle?.fill ?? null : undefined,
          fontSize: e.type === 'text' ? e.textStyle?.fontSize ?? null : undefined,
        })),
      ),
    [elements],
  );

  useEffect(() => {
    clearTimers();
    const runId = ++runIdRef.current;

    if (!enabled || slideAlreadyRevealed) {
      setVisibleElementIds((prev) => {
        const nextIds = elements.map((el) => el.id);
        if (prev.size === nextIds.length && nextIds.every(id => prev.has(id))) {
          return prev;
        }
        return new Set(nextIds);
      });
      setIsRevealing(false);
      return;
    }

    const ordered = getGenerationRevealOrder(elements);
    if (ordered.length === 0) {
      setVisibleElementIds((prev) => prev.size === 0 ? prev : new Set());
      setIsRevealing(false);
      markSlideRevealed();
      return;
    }

    setVisibleElementIds((prev) => prev.size === 0 ? prev : new Set());
    setIsRevealing(true);

    let cumulative = 0;
    ordered.forEach((el, index) => {
      const delay = cumulative;
      const t = setTimeout(() => {
        if (runIdRef.current !== runId) return;
        setVisibleElementIds((prev) => {
          if (prev.has(el.id)) return prev;
          const next = new Set(prev);
          next.add(el.id);
          return next;
        });
      }, delay);
      timersRef.current.push(t);
      if (index < ordered.length - 1) {
        cumulative += generationRevealDelayMs(ordered[index + 1], index + 1);
      }
    });

    const totalMs = cumulative + 220;

    const doneTimer = setTimeout(() => {
      if (runIdRef.current !== runId) return;
      setIsRevealing(false);
      markSlideRevealed();
    }, totalMs);
    timersRef.current.push(doneTimer);

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slideId,
    enabled,
    slideAlreadyRevealed,
    elementKey,
    clearTimers,
    markSlideRevealed,
  ]);

  const isElementVisible = useCallback(
    (elementId: string) => {
      if (!enabled || slideAlreadyRevealed) return true;
      return visibleElementIds.has(elementId);
    },
    [enabled, slideAlreadyRevealed, visibleElementIds],
  );

  return { visibleElementIds, isRevealing, isElementVisible };
}
