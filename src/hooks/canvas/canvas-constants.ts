import type { EditorToolId } from '@/types';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const STAGE_PADDING = 1500;

export const MIN_PLACE = 20;
export const CLICK_CANCEL_MOVE = 8;

export const SLIDE_BG_NAME = 'slide-bg';

export const DRAG_PLACEMENT_TOOLS: readonly EditorToolId[] = [
  'rect',
  'circle',
  'triangle',
  'star',
  'line',
  'arrow',
] as const;

export const CLICK_PLACEMENT_TOOLS: readonly EditorToolId[] = [
  'text',
  'image',
  'frame-circle',
  'frame-heart',
  'frame-box',
] as const;

export type PlacementRect = { x: number; y: number; w: number; h: number };

export type ClickPlacementStart = { x: number; y: number; tool: EditorToolId };
