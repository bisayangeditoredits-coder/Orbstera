import React, { useRef, useEffect, useState } from 'react';
import { Group, Rect, Circle, Line, Path } from 'react-konva';
import Konva from 'konva';
import type { SlideElement } from '@/types';

interface TextTransformerProps {
  node: Konva.Text | null;
  isSelected: boolean;
  isEditing: boolean;
  mode: 'autoWidth' | 'autoHeight' | 'fixed';
  onChange: (attrs: Partial<SlideElement>, saveHistory?: boolean) => void;
}

const HANDLE_COLOR = '#FFFFFF';
const HANDLE_BORDER = '#0EA5E9';
const HANDLE_SIZE = 10;
const HANDLE_HOVER_SIZE = 12;

export function TextTransformer({ node, isSelected, isEditing, mode, onChange }: TextTransformerProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!node || !groupRef.current) return;
    const group = groupRef.current;
    
    // Position the transformer group to match the node
    const updatePosition = () => {
      group.x(node.x());
      group.y(node.y());
      group.rotation(node.rotation());
      group.width(node.width());
      group.height(node.height());
      group.getLayer()?.batchDraw();
    };

    updatePosition();
    node.on('transform dragmove resize', updatePosition);
    return () => {
      node.off('transform dragmove resize', updatePosition);
    };
  }, [node]);

  if (!node || (!isSelected && !isEditing)) return null;

  const w = node.width();
  const h = node.height();
  // We offset handles by a tiny bit so they are centered on the border
  const hs = HANDLE_SIZE;
  const hsh = HANDLE_HOVER_SIZE;

  const getHandleSize = (name: string) => (hoveredHandle === name ? hsh : hs);

  // Drag handlers
  const handleDrag = (e: Konva.KonvaEventObject<DragEvent>, anchorName: string) => {
    const stage = node.getStage();
    if (!stage) return;
    const transform = node.getAbsoluteTransform().copy().invert();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const localPos = transform.point(pos);

    let newWidth = w;
    let newHeight = h;
    let newX = node.x();
    let newY = node.y();

    const MIN_W = 20;
    const MIN_H = 20;

    // Based on the anchor, calculate new width/height and x/y
    // This is simplified; proper implementation needs to account for rotation to update x/y correctly
    // For now, let's update width/height and adjust position
    const rot = (node.rotation() * Math.PI) / 180;
    
    const updateSizeAndPos = (dw: number, dh: number, shiftX: number, shiftY: number) => {
       if (w + dw < MIN_W) {
         shiftX -= (MIN_W - (w + dw)) * (shiftX < 0 ? 1 : -1);
         dw = MIN_W - w;
       }
       if (h + dh < MIN_H) {
         shiftY -= (MIN_H - (h + dh)) * (shiftY < 0 ? 1 : -1);
         dh = MIN_H - h;
       }
       
       newWidth = w + dw;
       newHeight = h + dh;
       // apply rotation to shiftX/shiftY
       const rotatedShiftX = shiftX * Math.cos(rot) - shiftY * Math.sin(rot);
       const rotatedShiftY = shiftX * Math.sin(rot) + shiftY * Math.cos(rot);
       
       newX += rotatedShiftX;
       newY += rotatedShiftY;
    };

    switch (anchorName) {
      case 'ml':
        updateSizeAndPos(-localPos.x, 0, localPos.x, 0);
        break;
      case 'mr':
        updateSizeAndPos(localPos.x - w, 0, 0, 0);
        break;
      case 'tc':
        updateSizeAndPos(0, -localPos.y, 0, localPos.y);
        break;
      case 'bc':
        updateSizeAndPos(0, localPos.y - h, 0, 0);
        break;
      case 'tl':
        updateSizeAndPos(-localPos.x, -localPos.y, localPos.x, localPos.y);
        break;
      case 'tr':
        updateSizeAndPos(localPos.x - w, -localPos.y, 0, localPos.y);
        break;
      case 'bl':
        updateSizeAndPos(-localPos.x, localPos.y - h, localPos.x, 0);
        break;
      case 'br':
        updateSizeAndPos(localPos.x - w, localPos.y - h, 0, 0);
        break;
    }

    if (mode === 'autoWidth' && (anchorName === 'ml' || anchorName === 'mr')) {
      // In autoWidth, user changing width turns it into autoHeight or fixed
      // We'll just let them change width and we might need to update the mode upstream
    }

    // Apply temporarily
    node.width(newWidth);
    if (mode !== 'autoHeight') {
      node.height(newHeight);
    }
    node.x(newX);
    node.y(newY);
    groupRef.current?.width(newWidth);
    groupRef.current?.height(mode !== 'autoHeight' ? newHeight : h);
    groupRef.current?.x(newX);
    groupRef.current?.y(newY);
    node.getLayer()?.batchDraw();
  };

  const handleDragEnd = () => {
    onChange({
      x: node.x(),
      y: node.y(),
      width: node.width(),
      height: node.height(),
      rotation: node.rotation(),
    }, true);
  };

  const handleRotate = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = node.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Center of the node
    const absPos = node.getAbsolutePosition();
    // In Konva, node.x() and y() are top-left if offset is 0. 
    // To find center we need to transform (w/2, h/2)
    const transform = node.getAbsoluteTransform();
    const center = transform.point({ x: w / 2, y: h / 2 });

    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 because rotation handle is at top
    if (angle < 0) angle += 360;

    node.rotation(angle);
    groupRef.current?.rotation(angle);
    node.getLayer()?.batchDraw();
  };

  const createCursorHandler = (cursor: string) => {
    return {
      onMouseEnter: (e: any) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = cursor;
        setHoveredHandle(e.target.name());
      },
      onMouseLeave: (e: any) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
        setHoveredHandle(null);
      },
    };
  };

  const createAnchorProps = (name: string, cursor: string) => ({
    name,
    draggable: true,
    onDragMove: (e: any) => {
      e.cancelBubble = true;
      if (name === 'rot') handleRotate(e);
      else handleDrag(e, name);
    },
    onDragEnd: (e: any) => {
      e.cancelBubble = true;
      handleDragEnd();
    },
    ...createCursorHandler(cursor),
  });

  return (
    <Group ref={groupRef} listening={isSelected && !isEditing}>
      {/* Bounding Box Border */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        stroke={HANDLE_BORDER}
        strokeWidth={1.5}
        dash={isEditing ? [5, 5] : undefined}
        listening={false}
      />

      {/* Handles (Only show when selected, not editing) */}
      {!isEditing && (
        <>
          {/* Rotation Handle */}
          <Line points={[w / 2, 0, w / 2, -24]} stroke={HANDLE_BORDER} strokeWidth={1} listening={false} />
          <Group x={w / 2} y={-24} {...createAnchorProps('rot', 'grab')}>
            <Circle radius={getHandleSize('rot') / 1.2} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.15)" shadowBlur={4} />
            {/* Simple circular arrow icon using Path */}
            <Path
              data="M -2 -2 A 3 3 0 1 1 -2 2 M -2 -2 L -4 -2 M -2 -2 L -2 -4"
              stroke={HANDLE_BORDER}
              strokeWidth={1}
              listening={false}
            />
          </Group>

          {/* Corners (Scale / Fixed mode resize) */}
          <Rect x={-getHandleSize('tl')/2} y={-getHandleSize('tl')/2} width={getHandleSize('tl')} height={getHandleSize('tl')} cornerRadius={2} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.15)" shadowBlur={3} {...createAnchorProps('tl', 'nw-resize')} />
          <Rect x={w - getHandleSize('tr')/2} y={-getHandleSize('tr')/2} width={getHandleSize('tr')} height={getHandleSize('tr')} cornerRadius={2} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.15)" shadowBlur={3} {...createAnchorProps('tr', 'ne-resize')} />
          <Rect x={-getHandleSize('bl')/2} y={h - getHandleSize('bl')/2} width={getHandleSize('bl')} height={getHandleSize('bl')} cornerRadius={2} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.15)" shadowBlur={3} {...createAnchorProps('bl', 'sw-resize')} />
          <Rect x={w - getHandleSize('br')/2} y={h - getHandleSize('br')/2} width={getHandleSize('br')} height={getHandleSize('br')} cornerRadius={2} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.15)" shadowBlur={3} {...createAnchorProps('br', 'se-resize')} />

          {/* Edges (Pills) */}
          {/* Left / Right (width resize) */}
          <Rect x={-3} y={h / 2 - 8} width={6} height={16} cornerRadius={3} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.1)" shadowBlur={2} {...createAnchorProps('ml', 'ew-resize')} />
          <Rect x={w - 3} y={h / 2 - 8} width={6} height={16} cornerRadius={3} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.1)" shadowBlur={2} {...createAnchorProps('mr', 'ew-resize')} />
          
          {/* Top / Bottom (height resize, maybe hide if mode is autoHeight, but keeping for fixed) */}
          {mode === 'fixed' && (
            <>
              <Rect x={w / 2 - 8} y={-3} width={16} height={6} cornerRadius={3} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.1)" shadowBlur={2} {...createAnchorProps('tc', 'ns-resize')} />
              <Rect x={w / 2 - 8} y={h - 3} width={16} height={6} cornerRadius={3} fill={HANDLE_COLOR} stroke={HANDLE_BORDER} strokeWidth={1.5} shadowColor="rgba(0,0,0,0.1)" shadowBlur={2} {...createAnchorProps('bc', 'ns-resize')} />
            </>
          )}
        </>
      )}
    </Group>
  );
}
