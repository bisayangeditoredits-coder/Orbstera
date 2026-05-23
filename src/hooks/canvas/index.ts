export {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  STAGE_PADDING,
  MIN_PLACE,
  SLIDE_BG_NAME,
  DRAG_PLACEMENT_TOOLS,
  CLICK_PLACEMENT_TOOLS,
} from '@/hooks/canvas/canvas-constants';
export {
  getSlidePointerPosition,
  getSlidePointerFromEvent,
  isSlideBackgroundTarget,
} from '@/hooks/canvas/canvas-coords';
export { useSmartGuides, type GuideLine } from '@/hooks/canvas/useSmartGuides';
export { useDrawTool } from '@/hooks/canvas/useDrawTool';
export { useShapePlacementTool } from '@/hooks/canvas/useShapePlacementTool';
export { useCanvasSelection } from '@/hooks/canvas/useCanvasSelection';
