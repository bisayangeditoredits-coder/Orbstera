import type Konva from 'konva';
import { SLIDE_BG_NAME } from '@/hooks/canvas/canvas-constants';

export type SlidePoint = { x: number; y: number };

/** Pointer position in slide space (0,0) — always subtract stage padding first. */
export function getSlidePointerPosition(
  stage: Konva.Stage | null | undefined,
  stagePadding: number,
): SlidePoint | null {
  const raw = stage?.getPointerPosition();
  if (!raw) return null;
  return {
    x: raw.x - stagePadding,
    y: raw.y - stagePadding,
  };
}

export function getSlidePointerFromEvent(
  e: Konva.KonvaEventObject<MouseEvent>,
  stagePadding: number,
): SlidePoint | null {
  return getSlidePointerPosition(e.target.getStage(), stagePadding);
}

export function isSlideBackgroundTarget(target: Konva.Node): boolean {
  const stage = target.getStage();
  return target === stage || target.name() === SLIDE_BG_NAME;
}
