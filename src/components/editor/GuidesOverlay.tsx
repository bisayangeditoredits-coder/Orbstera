'use client';

/**
 * GuidesOverlay
 * -------------
 * Renders smart alignment guide lines on top of the Konva canvas while an
 * element is being dragged. It consumes the `GuideLine[]` array produced by
 * the `useSmartGuides` hook and renders them as colour-coded Konva Lines.
 *
 * Vertical guides  → cyan  (#38BDF8)
 * Horizontal guides → magenta (#E879F9)
 * Canvas center    → special lighter tint
 *
 * The component renders nothing when there are no active guides, so there is
 * zero performance cost when no element is being dragged.
 *
 * Usage (inside a Konva <Layer>):
 *   <GuidesOverlay guides={smartGuides} canvasWidth={1280} canvasHeight={720} />
 */

import React from 'react';
import { Line, Group } from 'react-konva';
import type { GuideLine } from '@/hooks/canvas/useSmartGuides';

interface GuidesOverlayProps {
  guides: GuideLine[];
  canvasWidth: number;
  canvasHeight: number;
}

export function GuidesOverlay({ guides, canvasWidth, canvasHeight }: GuidesOverlayProps) {
  if (!guides.length) return null;

  const midX = canvasWidth / 2;
  const midY = canvasHeight / 2;

  return (
    <Group listening={false}>
      {guides.map((guide, i) => {
        // Detect vertical vs horizontal from coordinate span
        const isVertical = guide.x1 === guide.x2;

        // Special colour for the canvas centre axis
        const isCentreAxis = isVertical
          ? guide.x1 === midX
          : guide.y1 === midY;

        const stroke = isCentreAxis
          ? 'rgba(250,204,21,0.85)'      // yellow for centre
          : isVertical
            ? 'rgba(56,189,248,0.90)'    // cyan for vertical
            : 'rgba(232,121,249,0.90)';  // magenta for horizontal

        return (
          <Line
            key={`guide-${i}`}
            points={[guide.x1, guide.y1, guide.x2, guide.y2]}
            stroke={stroke}
            strokeWidth={1}
            dash={[5, 4]}
            shadowColor={stroke}
            shadowBlur={4}
            shadowOpacity={0.6}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </Group>
  );
}
