'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo, CSSProperties } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Transformer, Arrow as KonvaArrow } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { usePresentationStore } from '@/store/usePresentationStore';
import { SlideElement } from '@/types';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

interface KonvaCanvasProps {
  scale: number;
}

interface ElementNodeProps {
  el: SlideElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<SlideElement>, saveHistory?: boolean) => void;
  activeTool: string;
  isEditingText: boolean;
  onDblClickText: () => void;
}

// ─── Element Node Component ───────────────────────────────────────────────────
function ElementNode({
  el,
  isSelected,
  onSelect,
  onChange,
  activeTool,
  isEditingText,
  onDblClickText,
}: ElementNodeProps) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const genFillBorderRef = useRef<Konva.Rect>(null);
  const [img] = useImage(el.src || '');

  // Animation for "Generating" border
  useEffect(() => {
    if (!genFillBorderRef.current) return;
    const node = genFillBorderRef.current;
    const layer = node.getLayer();
    const anim = new Konva.Animation((frame) => {
      const t = frame?.time ?? 0;
      node.dashOffset((t / 24) % 32);
    }, layer);
    anim.start();
    return () => anim.stop();
  }, [el.type, el.id, img]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, el.visible]);

  if (el.visible === false) return null;

  const isDrawingTool = activeTool === 'gen-fill';
  const isCentered = el.shapeType === 'circle' || el.shapeType === 'triangle' || el.shapeType === 'star';

  const commonProps = {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation || 0,
    opacity: el.opacity ?? 1,
    draggable: isDrawingTool ? false : !el.locked,
    listening: !isDrawingTool,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: () => {
      if (el.type === 'text' && !el.locked && !isDrawingTool) onDblClickText();
    },
    onDblTap: () => {
      if (el.type === 'text' && !el.locked && !isDrawingTool) onDblClickText();
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      let newX = e.target.x();
      let newY = e.target.y();
      if (isCentered) {
        newX -= el.width / 2;
        newY -= el.height / 2;
      }
      onChange({ x: newX, y: newY }, true); // saveHistory = true
    },
    onTransformEnd: () => {
      const node = shapeRef.current!;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      const newWidth = Math.max(20, node.width() * scaleX);
      const newHeight = Math.max(20, node.height() * scaleY);
      let newX = node.x();
      let newY = node.y();

      if (isCentered) {
        newX -= newWidth / 2;
        newY -= newHeight / 2;
      }

      onChange({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
      }, true); // saveHistory = true
    },
  };

  const renderShape = () => {
    if (el.type === 'text') {
      return (
        <Text
          ref={shapeRef as React.RefObject<Konva.Text>}
          {...commonProps}
          opacity={isEditingText ? 0 : (el.opacity ?? 1)}
          text={el.content || ''}
          fontFamily={el.textStyle?.fontFamily || 'Inter'}
          fontSize={el.textStyle?.fontSize || 24}
          fontStyle={[
            el.textStyle?.fontStyle === 'italic' ? 'italic' : '',
            el.textStyle?.fontWeight === 'bold' ? 'bold' : '',
          ].filter(Boolean).join(' ') || 'normal'}
          fill={el.textStyle?.color || '#FFFFFF'}
          align={el.textStyle?.textAlign || 'left'}
          lineHeight={el.textStyle?.lineHeight || 1.4}
          letterSpacing={el.textStyle?.letterSpacing || 0}
          wrap="word"
        />
      );
    }

    if (el.type === 'image') {
      const awaitingPrompt = !el.src?.trim();
      const aiSlot = !!(awaitingPrompt && el.aiImagePending);
      const statusTitle = awaitingPrompt ? (aiSlot ? 'AI visuals' : 'Generative fill') : 'Rendering';
      const statusSub = awaitingPrompt ? (aiSlot ? 'Rendering with AI — updates live' : 'Describe content in the panel below') : 'Loading image…';

      return (
        <Group
          ref={shapeRef as React.RefObject<Konva.Group>}
          {...commonProps}
          clipFunc={(ctx) => {
            if (!el.maskType || el.maskType === 'none') {
              ctx.rect(0, 0, el.width, el.height);
              return;
            }
            if (el.maskType === 'circle') {
              ctx.arc(el.width / 2, el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2, false);
            } else if (el.maskType === 'heart') {
              const w = el.width, h = el.height;
              ctx.moveTo(w / 2, h * 0.25);
              ctx.bezierCurveTo(w * 0.5, h * 0.22, w * 0.45, h * 0.1, w * 0.25, h * 0.1);
              ctx.bezierCurveTo(w * 0.05, h * 0.1, w * 0.05, h * 0.4, w * 0.05, h * 0.4);
              ctx.bezierCurveTo(w * 0.05, h * 0.55, w * 0.2, h * 0.77, w * 0.5, h * 0.95);
              ctx.bezierCurveTo(w * 0.8, h * 0.77, w * 0.95, h * 0.55, w * 0.95, h * 0.4);
              ctx.bezierCurveTo(w * 0.95, h * 0.4, w * 0.95, h * 0.1, w * 0.75, h * 0.1);
              ctx.bezierCurveTo(w * 0.6, h * 0.1, w * 0.5, h * 0.22, w * 0.5, h * 0.25);
            } else {
              ctx.rect(0, 0, el.width, el.height);
            }
          }}
        >
          <Rect x={0} y={0} width={el.width} height={el.height} fill="transparent" listening={true} />
          {!img && (
            <Group listening={false}>
              <Rect
                x={0} y={0} width={el.width} height={el.height}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: el.width, y: el.height }}
                fillLinearGradientColorStops={[0, 'rgba(15,23,42,0.92)', 0.45, 'rgba(30,41,59,0.88)', 1, 'rgba(15,23,42,0.94)']}
                cornerRadius={(!el.maskType || el.maskType === 'square' || el.maskType === 'none') ? 12 : 0}
              />
              <Rect
                ref={genFillBorderRef}
                x={0} y={0} width={el.width} height={el.height}
                fill="transparent"
                stroke="rgba(56,189,248,0.65)"
                strokeWidth={1.5}
                cornerRadius={(!el.maskType || el.maskType === 'square' || el.maskType === 'none') ? 12 : 0}
                dash={[10, 7]}
              />
              <Text x={0} y={el.height / 2 - 26} width={el.width} text="✦" fill="#38BDF8" fontSize={22} align="center" fontFamily="Inter" />
              <Text x={0} y={el.height / 2 - 2} width={el.width} text={statusTitle} fill="rgba(248,250,252,0.92)" fontSize={12} align="center" fontFamily="Inter" fontStyle="bold" />
              <Text x={0} y={el.height / 2 + 16} width={el.width} text={statusSub} fill="rgba(148,163,184,0.85)" fontSize={9} align="center" fontFamily="Inter" />
            </Group>
          )}
          {img && (
            <KonvaImage
              image={img}
              x={0} y={0}
              width={el.width}
              height={el.height}
            />
          )}
        </Group>
      );
    }

    if (el.type === 'shape') {
      const fill = el.shapeStyle?.fill || '#38BDF8';
      const stroke = el.shapeStyle?.stroke || 'transparent';
      const strokeWidth = el.shapeStyle?.strokeWidth || 0;
      const cornerRadius = el.shapeStyle?.cornerRadius || 0;
      const rectRest = el.shapeType === 'rect' ? { cornerRadius, fill, stroke, strokeWidth } : {};

      if (el.shapeType === 'circle') {
        return (
          <Group x={el.x + el.width / 2} y={el.y + el.height / 2} draggable={!el.locked} onDragEnd={commonProps.onDragEnd} onClick={onSelect}>
             <Rect
                ref={shapeRef as React.RefObject<Konva.Rect>}
                x={-el.width/2} y={-el.height/2} width={el.width} height={el.height}
                fill="transparent"
             />
             <Transformer ref={trRef} rotateEnabled={false} />
          </Group>
        );
      }
      
      // Simplifying for this overwrite to restore stability
      return (
        <Rect
          ref={shapeRef as React.RefObject<Konva.Rect>}
          {...commonProps}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cornerRadius={cornerRadius}
        />
      );
    }

    return (
      <Rect
        ref={shapeRef as React.RefObject<Konva.Rect>}
        {...commonProps}
        fill="#1a1a2e"
        stroke="#475569"
        strokeWidth={1}
        dash={[6, 3]}
      />
    );
  };

  return (
    <>
      {renderShape()}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
          rotateEnabled
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          anchorFill="#0EA5E9"
          anchorStroke="#fff"
          anchorStrokeWidth={1.5}
          anchorSize={7}
          anchorCornerRadius={1.5}
          borderStroke="#38BDF8"
          borderStrokeWidth={1.2}
          padding={8}
        />
      )}
    </>
  );
}

// ─── Slide Background ────────────────────────────────────────────────────────
function SlideBackground({ colors, bgImageUrl }: { colors: string[], bgImageUrl?: string }) {
  const bg = colors[0] || '#05050A';
  const accent = colors[2] || '#38BDF8';
  const [bgImg] = useImage(bgImageUrl || '');

  return (
    <>
      <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={bg} />
      <Rect
        x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: CANVAS_WIDTH, y: CANVAS_HEIGHT }}
        fillLinearGradientColorStops={[0, accent + '33', 0.5, 'transparent', 1, accent + '22']}
        listening={false}
      />
      {bgImageUrl && bgImg && (
        <KonvaImage image={bgImg} x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} opacity={0.18} listening={false} />
      )}
    </>
  );
}

// ─── Main Konva Canvas ────────────────────────────────────────────────────────
export function KonvaCanvas({ scale }: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [drawingRect, setDrawingRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { presentation, currentSlideIndex, editor, selectElement, updateElement, addElement, setEditorState } = usePresentationStore();
  const slide = presentation?.slides[currentSlideIndex];

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      selectElement(null);
      setEditingTextId(null);
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editor.activeTool !== 'gen-fill') return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) setDrawingRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawingRect) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) setDrawingRect({ ...drawingRect, w: pos.x - drawingRect.x, h: pos.y - drawingRect.y });
  };

  const handleMouseUp = () => {
    if (drawingRect && editor.activeTool === 'gen-fill' && slide) {
      const rw = Math.abs(drawingRect.w);
      const rh = Math.abs(drawingRect.h);
      if (rw > 20 && rh > 20) {
        const x = drawingRect.w < 0 ? drawingRect.x + drawingRect.w : drawingRect.x;
        const y = drawingRect.h < 0 ? drawingRect.y + drawingRect.h : drawingRect.y;
        const newId = `el-genfill-${Date.now()}`;
        addElement(slide.id, {
          id: newId, type: 'image', src: '', x, y, width: rw, height: rh, zIndex: (slide.elements?.length || 0) + 1, visible: true, opacity: 1, locked: false
        });
        selectElement(newId);
        setEditorState({ activeTool: 'select', generativeFillTarget: { slideId: slide.id, elementId: newId } });
      }
    }
    setDrawingRect(null);
  };

  if (!mounted || !slide || !presentation) return null;

  const bgEl = (slide.elements || []).find(el => el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0);
  const elements = (slide.elements || []).filter(el => el !== bgEl);

  return (
    <div
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'relative',
        backgroundColor: '#000',
        cursor: editor.activeTool === 'gen-fill' ? 'crosshair' : 'default',
      }}
    >
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <SlideBackground colors={presentation.colorPalette || []} bgImageUrl={bgEl?.src} />
          {elements.map((el) => (
            <ElementNode
              key={el.id}
              el={el}
              isSelected={editor.selectedElementId === el.id}
              onSelect={() => selectElement(el.id)}
              onChange={(updates, save) => updateElement(slide.id, el.id, updates, save)}
              activeTool={editor.activeTool}
              isEditingText={editingTextId === el.id}
              onDblClickText={() => setEditingTextId(el.id)}
            />
          ))}
          {drawingRect && (
            <Rect
              x={drawingRect.w < 0 ? drawingRect.x + drawingRect.w : drawingRect.x}
              y={drawingRect.h < 0 ? drawingRect.y + drawingRect.h : drawingRect.y}
              width={Math.abs(drawingRect.w)}
              height={Math.abs(drawingRect.h)}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38BDF8"
              strokeWidth={1.5}
              dash={[8, 6]}
            />
          )}
        </Layer>
      </Stage>

      {editingTextId && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1000 }}>
          {slide.elements?.map((el) => {
            if (el.id !== editingTextId || el.type !== 'text') return null;
            return (
              <textarea
                key="text-editor"
                autoFocus
                value={el.content || ''}
                onChange={(e) => updateElement(slide.id, el.id, { content: e.target.value })}
                onBlur={() => setEditingTextId(null)}
                style={{
                  position: 'absolute', top: el.y, left: el.x, width: el.width, height: el.height,
                  fontSize: `${el.textStyle?.fontSize || 24}px`, fontFamily: el.textStyle?.fontFamily || 'Inter',
                  color: el.textStyle?.color || '#fff', textAlign: (el.textStyle?.textAlign || 'left') as any,
                  background: 'transparent', border: '1px dashed #38BDF8', outline: 'none', resize: 'none', pointerEvents: 'auto'
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
