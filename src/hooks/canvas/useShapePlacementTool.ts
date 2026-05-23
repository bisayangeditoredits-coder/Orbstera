'use client';

import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type Konva from 'konva';
import type { EditorToolId } from '@/types';
import { usePresentationStore } from '@/store/usePresentationStore';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLICK_CANCEL_MOVE,
  CLICK_PLACEMENT_TOOLS,
  DRAG_PLACEMENT_TOOLS,
  MIN_PLACE,
  type ClickPlacementStart,
  type PlacementRect,
} from '@/hooks/canvas/canvas-constants';
import { isSlideBackgroundTarget } from '@/hooks/canvas/canvas-coords';
import type { SlidePoint } from '@/hooks/canvas/canvas-coords';
import { defaultLineStyle, defaultShapeStyle } from '@/hooks/canvas/placement-styles';

export function useShapePlacementTool(args: {
  activeTool: EditorToolId;
  getPointer: (e: Konva.KonvaEventObject<MouseEvent>) => SlidePoint | null;
  ignoreNextBgClickRef: MutableRefObject<boolean>;
  onTextPlaced: (elementId: string) => void;
}) {
  const { activeTool, getPointer, ignoreNextBgClickRef, onTextPlaced } = args;
  const [drawingRect, setDrawingRect] = useState<PlacementRect | null>(null);
  const drawingRectRef = useRef<PlacementRect | null>(null);
  const clickStartRef = useRef<ClickPlacementStart | null>(null);

  const setPlacementRect = useCallback((rect: PlacementRect | null) => {
    drawingRectRef.current = rect;
    setDrawingRect(rect);
  }, []);

  const onMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, pos: SlidePoint): boolean => {
      if (!isSlideBackgroundTarget(e.target)) return false;
      const tool = activeTool;

      if (tool === 'gen-fill' || DRAG_PLACEMENT_TOOLS.includes(tool)) {
        setPlacementRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
        return true;
      }
      if (CLICK_PLACEMENT_TOOLS.includes(tool)) {
        clickStartRef.current = { x: pos.x, y: pos.y, tool };
        return true;
      }
      return false;
    },
    [activeTool, setPlacementRect],
  );

  const onMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, pos: SlidePoint): boolean => {
      if (drawingRectRef.current) {
        setPlacementRect((() => {
          const prev = drawingRectRef.current;
          if (!prev) return prev;
          let w = pos.x - prev.x;
          let h = pos.y - prev.y;
          if (
            e.evt.shiftKey &&
            DRAG_PLACEMENT_TOOLS.includes(activeTool) &&
            activeTool !== 'line' &&
            activeTool !== 'arrow'
          ) {
            const side = Math.max(Math.abs(w), Math.abs(h));
            w = w < 0 ? -side : side;
            h = h < 0 ? -side : side;
          }
          return { ...prev, w, h };
        })());
        return true;
      }

      if (clickStartRef.current) {
        const c = clickStartRef.current;
        const d = Math.hypot(pos.x - c.x, pos.y - c.y);
        if (d > CLICK_CANCEL_MOVE) clickStartRef.current = null;
        return true;
      }
      return false;
    },
    [activeTool, setPlacementRect],
  );

  const onMouseUp = useCallback((): boolean => {
    const store = usePresentationStore.getState();
    const s = store.presentation?.slides[store.currentSlideIndex];
    const rect = drawingRectRef.current;
    if (!s) {
      setPlacementRect(null);
      clickStartRef.current = null;
      return false;
    }

    const tool = store.editor.activeTool;
    const palette = store.presentation?.colorPalette || ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'];
    const accent = palette[2] || '#38BDF8';
    const textColor = palette[1] || '#FFFFFF';
    const bodyFont = store.presentation?.fontPairing?.body || 'Inter';
    const z = (s.elements?.length || 0) + 1;

    const finishPlacement = () => {
      store.setEditorState({ activeTool: 'select' });
    };

    if (rect) {
      const rw = Math.abs(rect.w);
      const rh = Math.abs(rect.h);
      const x = rect.w < 0 ? rect.x + rect.w : rect.x;
      const y = rect.h < 0 ? rect.y + rect.h : rect.y;

      const dragBigEnough =
        tool === 'line' || tool === 'arrow'
          ? rw >= MIN_PLACE && rh >= 4
          : rw >= MIN_PLACE && rh >= MIN_PLACE;

      if (tool === 'gen-fill' && rw > MIN_PLACE && rh > MIN_PLACE) {
        const newId = `el-genfill-${Date.now()}`;
        store.addElement(s.id, {
          id: newId,
          type: 'image',
          src: '',
          x,
          y,
          width: rw,
          height: rh,
          zIndex: z,
          visible: true,
          opacity: 1,
          locked: false,
        });
        store.selectElement(newId);
        ignoreNextBgClickRef.current = true;
        store.setEditorState({
          activeTool: 'select',
          generativeFillTarget: { slideId: s.id, elementId: newId },
        });
        setPlacementRect(null);
        return true;
      }

      if (DRAG_PLACEMENT_TOOLS.includes(tool) && dragBigEnough) {
        const id = `el-shape-${Date.now()}`;
        if (tool === 'rect') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'rect',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'circle') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'circle',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'triangle') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'triangle',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'star') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'star',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'line') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'line',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultLineStyle(accent),
          });
        } else if (tool === 'arrow') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'arrow',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        }
        store.selectElement(id);
        ignoreNextBgClickRef.current = true;
        finishPlacement();
      }

      setPlacementRect(null);
      return true;
    }

    const click = clickStartRef.current;
    clickStartRef.current = null;
    if (!click || click.tool !== tool) return false;

    if (tool === 'text') {
      const tw = 400;
      const th = 120;
      const newId = `el-text-${Date.now()}`;
      store.addElement(s.id, {
        id: newId,
        type: 'text',
        x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - tw, click.x - tw / 2))),
        y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - th, click.y - th / 2))),
        width: tw,
        height: th,
        content: 'Double-click to edit',
        zIndex: z,
        visible: true,
        opacity: 1,
        locked: false,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 28,
          fontWeight: 'normal',
          color: textColor,
          textAlign: 'left',
          lineHeight: 1.35,
        },
      });
      store.selectElement(newId);
      onTextPlaced(newId);
      ignoreNextBgClickRef.current = true;
      finishPlacement();
      return true;
    }

    if (tool === 'image') {
      ignoreNextBgClickRef.current = true;
      finishPlacement();
      const px = Math.round(Math.max(0, click.x - 180));
      const py = Math.round(Math.max(0, click.y - 135));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('orbstera:pick-image', { detail: { x: px, y: py } }),
        );
      }
      return true;
    }

    if (tool === 'frame-circle' || tool === 'frame-heart' || tool === 'frame-box') {
      const fw = 280;
      const fh = 280;
      const maskType = tool === 'frame-circle' ? 'circle' : tool === 'frame-heart' ? 'heart' : 'square';
      const newId = `el-frame-${Date.now()}`;
      store.addElement(s.id, {
        id: newId,
        type: 'image',
        src: '',
        maskType,
        x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - fw, click.x - fw / 2))),
        y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - fh, click.y - fh / 2))),
        width: fw,
        height: fh,
        zIndex: z,
        visible: true,
        opacity: 1,
        locked: false,
      });
      store.selectElement(newId);
      ignoreNextBgClickRef.current = true;
      finishPlacement();
      return true;
    }

    return false;
  }, [ignoreNextBgClickRef, onTextPlaced, setPlacementRect]);

  const clearPlacement = useCallback(() => {
    setPlacementRect(null);
    clickStartRef.current = null;
  }, [setPlacementRect]);

  return {
    drawingRect,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    clearPlacement,
  };
}
