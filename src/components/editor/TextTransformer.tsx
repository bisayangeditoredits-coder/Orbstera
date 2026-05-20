'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Group, Rect, Line, Circle } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '@/types';

interface TextTransformerProps {
  el: SlideElement;
  textNodeRef: React.RefObject<Konva.Text | null>;
  isSelected: boolean;
  isEditing: boolean;
  onChange: (updates: Partial<SlideElement>, saveHistory?: boolean) => void;
}

const ACCENT = '#0EA5E9';
const HANDLE_FILL = '#FFFFFF';
const MIN_W = 20;
const MIN_H = 20;

// Rotate a point around (cx, cy) by angle (radians)
function rotatePoint(px: number, py: number, cx: number, cy: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function TextTransformer({
  el,
  textNodeRef,
  isSelected,
  isEditing,
  onChange,
}: TextTransformerProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const dragStartRef = useRef<{
    stagePointer: { x: number; y: number };
    elX: number; elY: number; elW: number; elH: number;
    angle: number;
  } | null>(null);

  // Get the actual measured width/height from Konva text node (for autoWidth/autoHeight modes)
  const getMeasuredDims = useCallback(() => {
    const node = textNodeRef.current;
    if (node) {
      return { w: node.width(), h: node.height() };
    }
    return { w: el.width, h: el.height };
  }, [textNodeRef, el.width, el.height]);

  if (!isSelected && !isEditing) return null;

  const { w: displayW, h: displayH } = getMeasuredDims();
  const angle = ((el.rotation || 0) * Math.PI) / 180;

  const setCursor = (cursor: string) => {
    const stage = textNodeRef.current?.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  // ─── Handle Drag Logic ──────────────────────────────────────────────────────
  function makeDragHandlers(
    anchorName: string,
    cursor: string,
  ) {
    return {
      draggable: true as const,
      name: anchorName,
      onMouseEnter: () => { setHovered(anchorName); setCursor(cursor); },
      onMouseLeave: () => { setHovered(null); setCursor('default'); },
      onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        const ptr = stage?.getPointerPosition();
        if (!ptr) return;
        dragStartRef.current = {
          stagePointer: { x: ptr.x, y: ptr.y },
          elX: el.x, elY: el.y,
          elW: displayW, elH: displayH,
          angle,
        };
        // Pin anchor to (0,0) — we handle movement ourselves
        e.target.x(0);
        e.target.y(0);
      },
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;
        // Pin Konva's internal drag position — we calculate everything ourselves
        e.target.x(0);
        e.target.y(0);

        const stage = e.target.getStage();
        const ptr = stage?.getPointerPosition();
        if (!ptr || !dragStartRef.current) return;

        const { stagePointer: sp, elX, elY, elW, elH, angle: a } = dragStartRef.current;
        // Delta in stage space
        const dsx = ptr.x - sp.x;
        const dsy = ptr.y - sp.y;
        // Rotate delta into local element space
        const cos = Math.cos(-a);
        const sin = Math.sin(-a);
        const dlx = dsx * cos - dsy * sin;
        const dly = dsx * sin + dsy * cos;

        let newX = elX, newY = elY, newW = elW, newH = elH;

        if (anchorName === 'br') {
          newW = Math.max(MIN_W, elW + dlx);
          newH = Math.max(MIN_H, elH + dly);
        } else if (anchorName === 'bl') {
          const wDelta = Math.min(elW - MIN_W, dlx);
          newW = elW - wDelta;
          const move = rotatePoint(elX + wDelta, elY, elX + elW / 2, elY + elH / 2, a);
          const orig = rotatePoint(elX, elY, elX + elW / 2, elY + elH / 2, a);
          newX = elX + (move.x - orig.x);
          newY = elY + (move.y - orig.y);
          newH = Math.max(MIN_H, elH + dly);
        } else if (anchorName === 'tr') {
          newW = Math.max(MIN_W, elW + dlx);
          const hDelta = Math.min(elH - MIN_H, dly);
          newH = elH - hDelta;
          const cx = elX + elW / 2;
          const cy = elY + elH / 2;
          const move = rotatePoint(elX, elY + hDelta, cx, cy, a);
          const orig = rotatePoint(elX, elY, cx, cy, a);
          newX = elX + (move.x - orig.x);
          newY = elY + (move.y - orig.y);
        } else if (anchorName === 'tl') {
          const wDelta = Math.min(elW - MIN_W, dlx);
          const hDelta = Math.min(elH - MIN_H, dly);
          newW = elW - wDelta;
          newH = elH - hDelta;
          const cx = elX + elW / 2;
          const cy = elY + elH / 2;
          const move = rotatePoint(elX + wDelta, elY + hDelta, cx, cy, a);
          const orig = rotatePoint(elX, elY, cx, cy, a);
          newX = elX + (move.x - orig.x);
          newY = elY + (move.y - orig.y);
        } else if (anchorName === 'mr') {
          newW = Math.max(MIN_W, elW + dlx);
        } else if (anchorName === 'ml') {
          const wDelta = Math.min(elW - MIN_W, dlx);
          newW = elW - wDelta;
          const cx = elX + elW / 2;
          const cy = elY + elH / 2;
          const move = rotatePoint(elX + wDelta, elY, cx, cy, a);
          const orig = rotatePoint(elX, elY, cx, cy, a);
          newX = elX + (move.x - orig.x);
          newY = elY + (move.y - orig.y);
        } else if (anchorName === 'bc') {
          newH = Math.max(MIN_H, elH + dly);
        } else if (anchorName === 'tc') {
          const hDelta = Math.min(elH - MIN_H, dly);
          newH = elH - hDelta;
          const cx = elX + elW / 2;
          const cy = elY + elH / 2;
          const move = rotatePoint(elX, elY + hDelta, cx, cy, a);
          const orig = rotatePoint(elX, elY, cx, cy, a);
          newX = elX + (move.x - orig.x);
          newY = elY + (move.y - orig.y);
        } else if (anchorName === 'rot') {
          // Rotation: compute angle from center to pointer
          const cx = elX + elW / 2;
          const cy = elY + elH / 2;
          // We need the center in stage coords — use the node's transform
          const node = textNodeRef.current;
          const stageCenter = node ? node.getAbsoluteTransform().point({ x: elW / 2, y: elH / 2 }) : { x: cx, y: cy };
          const dx2 = ptr.x - stageCenter.x;
          const dy2 = ptr.y - stageCenter.y;
          let deg = (Math.atan2(dy2, dx2) * 180) / Math.PI + 90;
          if (deg < 0) deg += 360;
          onChange({ rotation: Math.round(deg) });
          return;
        }

        // Live-update the node for instant feedback
        const node = textNodeRef.current;
        if (node) {
          node.x(newX); node.y(newY);
          if (el.textResizeMode !== 'autoWidth') node.width(newW);
          if (el.textResizeMode !== 'autoHeight') node.height(newH);
          node.getLayer()?.batchDraw();
        }
        onChange({ x: newX, y: newY, width: newW, height: newH });
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;
        e.target.x(0);
        e.target.y(0);
        const node = textNodeRef.current;
        if (node) {
          onChange({ x: node.x(), y: node.y(), width: node.width(), height: node.height(), rotation: node.rotation() }, true);
        }
        dragStartRef.current = null;
      },
    };
  }

  const hs = (name: string, base: number) => (hovered === name ? base + 2 : base);

  return (
    <Group
      x={el.x}
      y={el.y}
      rotation={el.rotation || 0}
      listening={isSelected}
    >
      {/* ── Bounding box border ─────────────────────────────────────── */}
      <Rect
        x={0}
        y={0}
        width={displayW}
        height={displayH}
        stroke={ACCENT}
        strokeWidth={1.5}
        dash={isEditing ? [5, 4] : undefined}
        fill="transparent"
        listening={false}
      />

      {/* Only show handles when selected AND not in edit mode */}
      {isSelected && !isEditing && (
        <>
          {/* ── Rotation line + handle ──────────────────────────────── */}
          <Line
            points={[displayW / 2, 0, displayW / 2, -24]}
            stroke={ACCENT}
            strokeWidth={1}
            listening={false}
          />
          <Group x={displayW / 2} y={-24} {...makeDragHandlers('rot', 'grab')}>
            <Circle
              radius={hs('rot', 6)}
              fill={HANDLE_FILL}
              stroke={ACCENT}
              strokeWidth={1.5}
              shadowColor="rgba(0,0,0,0.18)"
              shadowBlur={4}
              shadowOffsetY={1}
            />
            {/* Rotation arrow arc symbol */}
            <Rect x={-2} y={-2} width={4} height={4} fill="transparent" listening={false} />
          </Group>

          {/* ── Corner handles (rounded square) ─────────────────────── */}
          {/* Top-left */}
          <Rect
            x={-5} y={-5} width={hs('tl', 10)} height={hs('tl', 10)}
            cornerRadius={2.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.15)" shadowBlur={4} shadowOffsetY={1}
            {...makeDragHandlers('tl', 'nw-resize')}
          />
          {/* Top-right */}
          <Rect
            x={displayW - hs('tr', 10) + 5} y={-5} width={hs('tr', 10)} height={hs('tr', 10)}
            cornerRadius={2.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.15)" shadowBlur={4} shadowOffsetY={1}
            {...makeDragHandlers('tr', 'ne-resize')}
          />
          {/* Bottom-left */}
          <Rect
            x={-5} y={displayH - hs('bl', 10) + 5} width={hs('bl', 10)} height={hs('bl', 10)}
            cornerRadius={2.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.15)" shadowBlur={4} shadowOffsetY={1}
            {...makeDragHandlers('bl', 'sw-resize')}
          />
          {/* Bottom-right */}
          <Rect
            x={displayW - hs('br', 10) + 5} y={displayH - hs('br', 10) + 5} width={hs('br', 10)} height={hs('br', 10)}
            cornerRadius={2.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.15)" shadowBlur={4} shadowOffsetY={1}
            {...makeDragHandlers('br', 'se-resize')}
          />

          {/* ── Edge handles (pills) ─────────────────────────────────── */}
          {/* Left (ew-resize) */}
          <Rect
            x={-4} y={displayH / 2 - 9} width={7} height={18}
            cornerRadius={3.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.1)" shadowBlur={3}
            {...makeDragHandlers('ml', 'ew-resize')}
          />
          {/* Right (ew-resize) */}
          <Rect
            x={displayW - 3} y={displayH / 2 - 9} width={7} height={18}
            cornerRadius={3.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.1)" shadowBlur={3}
            {...makeDragHandlers('mr', 'ew-resize')}
          />
          {/* Top (ns-resize) */}
          <Rect
            x={displayW / 2 - 9} y={-4} width={18} height={7}
            cornerRadius={3.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.1)" shadowBlur={3}
            {...makeDragHandlers('tc', 'ns-resize')}
          />
          {/* Bottom (ns-resize) */}
          <Rect
            x={displayW / 2 - 9} y={displayH - 3} width={18} height={7}
            cornerRadius={3.5}
            fill={HANDLE_FILL} stroke={ACCENT} strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.1)" shadowBlur={3}
            {...makeDragHandlers('bc', 'ns-resize')}
          />
        </>
      )}
    </Group>
  );
}
