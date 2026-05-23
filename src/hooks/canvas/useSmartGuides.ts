'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SlideElement } from '@/types';

export type GuideLine = { x1: number; y1: number; x2: number; y2: number };

const SNAP_TOLERANCE = 5;

type SnapTarget = { pos: number };

function buildSnapTargets(
  elements: SlideElement[] | undefined,
  excludeId: string,
  canvasW: number,
  canvasH: number,
): { targetsX: SnapTarget[]; targetsY: SnapTarget[] } {
  const targetsX: SnapTarget[] = [{ pos: canvasW / 2 }];
  const targetsY: SnapTarget[] = [{ pos: canvasH / 2 }];

  elements?.forEach((el) => {
    if (el.id === excludeId || el.id.startsWith('bg-')) return;
    targetsX.push({ pos: el.x });
    targetsX.push({ pos: el.x + el.width / 2 });
    targetsX.push({ pos: el.x + el.width });
    targetsY.push({ pos: el.y });
    targetsY.push({ pos: el.y + el.height / 2 });
    targetsY.push({ pos: el.y + el.height });
  });

  return { targetsX, targetsY };
}

function guidesEqual(a: GuideLine[], b: GuideLine[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const g = a[i];
    const h = b[i];
    if (g.x1 !== h.x1 || g.y1 !== h.y1 || g.x2 !== h.x2 || g.y2 !== h.y2) return false;
  }
  return true;
}

export function useSmartGuides(args: {
  slideElements: SlideElement[] | undefined;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const { slideElements, canvasWidth, canvasHeight } = args;
  const [smartGuides, setSmartGuides] = useState<GuideLine[]>([]);
  const guidesRef = useRef<GuideLine[]>([]);
  const rafRef = useRef<number | null>(null);
  const snapCacheRef = useRef<{ targetsX: SnapTarget[]; targetsY: SnapTarget[] } | null>(null);

  useEffect(() => {
    snapCacheRef.current = null;
  }, [slideElements]);

  const scheduleGuideRender = useCallback((guides: GuideLine[]) => {
    guidesRef.current = guides;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setSmartGuides((prev) =>
        guidesEqual(prev, guidesRef.current) ? prev : [...guidesRef.current],
      );
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleDragMoveSnapping = useCallback(
    (id: string, nodeX: number, nodeY: number, nodeW: number, nodeH: number) => {
      if (!snapCacheRef.current) {
        snapCacheRef.current = buildSnapTargets(
          slideElements,
          id,
          canvasWidth,
          canvasHeight,
        );
      }
      const { targetsX, targetsY } = snapCacheRef.current;
      const guides: GuideLine[] = [];
      let newX = nodeX;
      let newY = nodeY;
      const dragCenterX = nodeX + nodeW / 2;
      const dragCenterY = nodeY + nodeH / 2;

      let snappedX = false;
      for (const t of targetsX) {
        if (!snappedX && Math.abs(nodeX - t.pos) < SNAP_TOLERANCE) {
          newX = t.pos;
          snappedX = true;
          guides.push({ x1: t.pos, y1: 0, x2: t.pos, y2: canvasHeight });
        } else if (!snappedX && Math.abs(dragCenterX - t.pos) < SNAP_TOLERANCE) {
          newX = t.pos - nodeW / 2;
          snappedX = true;
          guides.push({ x1: t.pos, y1: 0, x2: t.pos, y2: canvasHeight });
        } else if (!snappedX && Math.abs(nodeX + nodeW - t.pos) < SNAP_TOLERANCE) {
          newX = t.pos - nodeW;
          snappedX = true;
          guides.push({ x1: t.pos, y1: 0, x2: t.pos, y2: canvasHeight });
        }
      }

      let snappedY = false;
      for (const t of targetsY) {
        if (!snappedY && Math.abs(nodeY - t.pos) < SNAP_TOLERANCE) {
          newY = t.pos;
          snappedY = true;
          guides.push({ x1: 0, y1: t.pos, x2: canvasWidth, y2: t.pos });
        } else if (!snappedY && Math.abs(dragCenterY - t.pos) < SNAP_TOLERANCE) {
          newY = t.pos - nodeH / 2;
          snappedY = true;
          guides.push({ x1: 0, y1: t.pos, x2: canvasWidth, y2: t.pos });
        } else if (!snappedY && Math.abs(nodeY + nodeH - t.pos) < SNAP_TOLERANCE) {
          newY = t.pos - nodeH;
          snappedY = true;
          guides.push({ x1: 0, y1: t.pos, x2: canvasWidth, y2: t.pos });
        }
      }

      scheduleGuideRender(guides);
      if (snappedX || snappedY) return { x: newX, y: newY };
    },
    [slideElements, canvasWidth, canvasHeight, scheduleGuideRender],
  );

  const handleDragEndSnapping = useCallback(() => {
    guidesRef.current = [];
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setSmartGuides([]);
    snapCacheRef.current = null;
  }, []);

  return {
    smartGuides,
    handleDragMoveSnapping,
    handleDragEndSnapping,
  };
}
