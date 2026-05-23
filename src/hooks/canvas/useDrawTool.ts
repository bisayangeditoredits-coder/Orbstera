'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import type { EditorToolId } from '@/types';
import { isSlideBackgroundTarget } from '@/hooks/canvas/canvas-coords';
import type { SlidePoint } from '@/hooks/canvas/canvas-coords';
import {
  appendStrokePoint,
  smoothStrokePoints,
  strokeBounds,
  toRelativeStrokePoints,
} from '@/hooks/canvas/stroke-smoothing';

export function useDrawTool(args: {
  activeTool: EditorToolId;
  getPointer: (e: Konva.KonvaEventObject<MouseEvent>) => SlidePoint | null;
}) {
  const { activeTool, getPointer } = args;
  const [previewPoints, setPreviewPoints] = useState<number[] | null>(null);
  const strokeRef = useRef<number[] | null>(null);
  const rafRef = useRef<number | null>(null);

  const schedulePreview = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const raw = strokeRef.current;
      setPreviewPoints(raw && raw.length >= 2 ? smoothStrokePoints(raw) : raw);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const resetStroke = useCallback(() => {
    strokeRef.current = null;
    setPreviewPoints(null);
  }, []);

  const onMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, pos: SlidePoint): boolean => {
      if (activeTool !== 'draw' || !isSlideBackgroundTarget(e.target)) return false;
      strokeRef.current = [pos.x, pos.y];
      setPreviewPoints([pos.x, pos.y]);
      return true;
    },
    [activeTool],
  );

  const onMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, pos: SlidePoint): boolean => {
      if (activeTool !== 'draw' || !strokeRef.current) return false;
      strokeRef.current = appendStrokePoint(strokeRef.current, pos.x, pos.y);
      schedulePreview();
      return true;
    },
    [activeTool, schedulePreview],
  );

  const onMouseUp = useCallback(
    (
      accent: string,
      addStrokeElement: (payload: {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        points: number[];
        zIndex: number;
        stroke: string;
        strokeWidth: number;
      }) => void,
      zIndex: number,
    ): boolean => {
      const raw = strokeRef.current;
      if (!raw) return false;
      resetStroke();
      if (raw.length <= 4) return true;

      const smoothed = smoothStrokePoints(raw);
      const { minX, minY, maxX, maxY } = strokeBounds(smoothed);
      const relativePoints = toRelativeStrokePoints(smoothed, minX, minY);

      addStrokeElement({
        id: `el-draw-${Date.now()}`,
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        points: relativePoints,
        zIndex,
        stroke: accent,
        strokeWidth: 4,
      });
      return true;
    },
    [resetStroke],
  );

  const isDrawing = activeTool === 'draw' && previewPoints !== null;

  return {
    previewPoints,
    isDrawing,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    resetStroke,
  };
}
