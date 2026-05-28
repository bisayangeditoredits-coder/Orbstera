import type { LucideIcon } from 'lucide-react';
import {
  MousePointer2,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Triangle,
  BarChart2,
  Star,
  Minus,
  ArrowRight,
  Sparkles,
  Heart,
  Grid3X3,
} from 'lucide-react';
import type { EditorToolId } from '@/types';

export type ToolGroup = 'navigate' | 'ai' | 'type' | 'media' | 'shape' | 'draw' | 'data' | 'frame' | 'view';

export interface EditorToolDef {
  id: EditorToolId;
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  group: ToolGroup;
}

/** Canonical tool list — single source for the editor tool rail */
export const EDITOR_TOOLS: EditorToolDef[] = [
  { id: 'select', icon: MousePointer2, label: 'Move', shortcut: 'V', group: 'navigate' },
  { id: 'gen-fill', icon: Sparkles, label: 'Generative fill', shortcut: '⇧G', group: 'ai' },
  { id: 'recraft', icon: Sparkles, label: 'Recraft AI', shortcut: '⇧R', group: 'ai' },
  { id: 'text', icon: Type, label: 'Type', shortcut: 'T', group: 'type' },
  { id: 'image', icon: ImageIcon, label: 'Image', shortcut: 'I', group: 'media' },
  { id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R', group: 'shape' },
  { id: 'circle', icon: Circle, label: 'Ellipse', shortcut: 'O', group: 'shape' },
  { id: 'triangle', icon: Triangle, label: 'Triangle', group: 'shape' },
  { id: 'star', icon: Star, label: 'Star', group: 'shape' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L', group: 'draw' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow', group: 'draw' },
  { id: 'chart', icon: BarChart2, label: 'Chart', group: 'data' },
  { id: 'frame-circle', icon: Circle, label: 'Circle frame', group: 'frame' },
  { id: 'frame-heart', icon: Heart, label: 'Heart frame', group: 'frame' },
  { id: 'frame-box', icon: Square, label: 'Box frame', group: 'frame' },
];

export const TOOL_GROUP_ORDER: ToolGroup[] = [
  'navigate',
  'ai',
  'type',
  'media',
  'shape',
  'draw',
  'data',
  'frame',
];

export const VIEW_TOOL_GRID = {
  id: 'grid' as const,
  icon: Grid3X3,
  label: 'Grid',
  shortcut: 'G',
};

export function snapCoord(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return Math.round(value);
  return Math.round(value / gridSize) * gridSize;
}

export function snapRect(
  x: number,
  y: number,
  w: number,
  h: number,
  gridSize: number,
  enabled: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!enabled || gridSize <= 0) {
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }
  return {
    x: snapCoord(x, gridSize, true),
    y: snapCoord(y, gridSize, true),
    w: Math.max(gridSize, snapCoord(w, gridSize, true)),
    h: Math.max(gridSize, snapCoord(h, gridSize, true)),
  };
}
