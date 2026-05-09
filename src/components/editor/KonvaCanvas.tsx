'use client';

import { Stage, Layer, Rect, Text, Transformer, Group, Circle, RegularPolygon, Image as KonvaImage, Star as KonvaStar, Line as KonvaLine, Arrow as KonvaArrow } from 'react-konva';
import useImage from 'use-image';
import { useState, useEffect, useRef, useCallback } from 'react';
import Konva from 'konva';
import { usePresentationStore } from '@/store/usePresentationStore';
import { SlideElement } from '@/types';

// Canvas dimensions — 16:9 at 1280×720 logical units
export const CANVAS_WIDTH  = 1280;
export const CANVAS_HEIGHT = 720;

interface KonvaCanvasProps {
  width: number;
  height: number;
}

function ElementNode({
  el,
  isSelected,
  onSelect,
  onChange,
  stageRef,
}: {
  el: SlideElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<SlideElement>) => void;
  stageRef: React.RefObject<Konva.Stage>;
}) {
  const shapeRef = useRef<Konva.Node>(null);
  const trRef    = useRef<Konva.Transformer>(null);
  const [img]    = useImage(el.src || '', 'anonymous');

  const { editor, setEditorState } = usePresentationStore();
  const previewId = editor.previewElementId;

  useEffect(() => {
    if (previewId !== el.id) return;
    const node = shapeRef.current;
    if (!node) return;

    const entrance = el.animation?.entrance || 'fadeSlideUp';
    const duration = Math.max(0.1, (el.animation?.duration || 1000) / 1000);

    // Centred shapes store x/y at top-left but Konva renders from center
    const isCentered = el.shapeType === 'circle' || el.shapeType === 'triangle' || el.shapeType === 'star';
    const targetX = isCentered ? el.x + el.width  / 2 : el.x;
    const targetY = isCentered ? el.y + el.height / 2 : el.y;

    // Set "from" state
    if (entrance === 'fadeSlideUp')       node.setAttrs({ x: targetX, y: targetY + 60, opacity: 0 });
    else if (entrance === 'fadeSlideLeft')node.setAttrs({ x: targetX - 60, y: targetY, opacity: 0 });
    else if (entrance === 'slideRight')   node.setAttrs({ x: targetX + 60, y: targetY, opacity: 0 });
    else if (entrance === 'zoomIn')       node.setAttrs({ x: targetX, y: targetY, scaleX: 0.4, scaleY: 0.4, opacity: 0 });
    else if (entrance === 'elasticScale') node.setAttrs({ x: targetX, y: targetY, scaleX: 0,   scaleY: 0,   opacity: 0 });
    else if (entrance === 'reveal')       node.setAttrs({ x: targetX, y: targetY, scaleY: 0, opacity: 0 });
    else if (entrance === 'glitch')       node.setAttrs({ x: targetX - 20, y: targetY, opacity: 0.4 });
    else if (entrance === 'flipIn')       node.setAttrs({ x: targetX, y: targetY, scaleY: 0.2, opacity: 0 });
    else if (['blurIn', 'glassBlur', 'typewriterWords', 'staggerLines'].includes(entrance))
      node.setAttrs({ x: targetX, y: targetY, opacity: 0 });
    else if (['parallaxDrift', 'horizontalReveal', 'depthRise', 'floatGentle', 'verticalRise'].includes(entrance))
      node.setAttrs({ x: targetX - 40, y: targetY + 20, opacity: 0, scaleX: 0.92, scaleY: 0.92 });
    else if (['scaleSoft', 'morphBlend', 'cinematicImageZoom'].includes(entrance))
      node.setAttrs({ x: targetX, y: targetY, scaleX: 0.85, scaleY: 0.85, opacity: 0 });
    else                                  node.setAttrs({ x: targetX, y: targetY, opacity: 0 }); // fadeIn / bounceIn

    // Tween "to" final state
    node.to({
      x: targetX, y: targetY,
      scaleX: 1, scaleY: 1,
      opacity: 1,
      duration,
      easing: entrance === 'elasticScale' ? Konva.Easings.ElasticEaseOut
            : entrance === 'bounceIn'    ? Konva.Easings.BounceEaseOut
            : Konva.Easings.EaseInOut,
      onFinish: () => setEditorState({ previewElementId: null }),
    });
  }, [previewId, el.id, el.animation, el.x, el.y, el.width, el.height, el.shapeType, setEditorState]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, el.visible]);

  if (el.visible === false) return null;

  const commonProps = {
    x: el.x,
    y: el.y,
    width:    el.width,
    height:   el.height,
    rotation: el.rotation || 0,
    opacity:  el.opacity ?? 1,
    draggable: !el.locked,
    onClick: onSelect,
    onTap:   onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: () => {
      const node   = shapeRef.current!;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x:        node.x(),
        y:        node.y(),
        width:    Math.max(20, node.width()  * scaleX),
        height:   Math.max(20, node.height() * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  const renderShape = () => {
    if (el.type === 'text') {
      return (
        <Text
          ref={shapeRef as React.RefObject<Konva.Text>}
          {...commonProps}
          text={el.content || ''}
          fontFamily={el.textStyle?.fontFamily || 'Inter'}
          fontSize={el.textStyle?.fontSize || 24}
          fontStyle={[
            el.textStyle?.fontStyle  === 'italic' ? 'italic' : '',
            el.textStyle?.fontWeight === 'bold'   ? 'bold'   : '',
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
      // Calculate crop to achieve 'cover' effect without warping
      const crop = img ? (() => {
        const aspectRatio = img.width / img.height;
        const targetRatio = el.width / el.height;
        let x = 0, y = 0, width = img.width, height = img.height;
        if (aspectRatio > targetRatio) {
          width = img.height * targetRatio;
          x = (img.width - width) / 2;
        } else {
          height = img.width / targetRatio;
          y = (img.height - height) / 2;
        }
        return { x, y, width, height };
      })() : undefined;

      return (
        <Group {...commonProps}>
          {!img && (
            <Group>
              <Rect
                x={0} y={0} width={el.width} height={el.height}
                fill="rgba(255,255,255,0.02)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
                cornerRadius={12}
              />
              <Text
                x={0} y={el.height / 2 - 12} width={el.width}
                text="✦"
                fill="#3B82F6"
                fontSize={24}
                align="center"
                fontFamily="Inter"
              />
              <Text
                x={0} y={el.height / 2 + 15} width={el.width}
                text={el.src ? "DREAMING IMAGE..." : "ORCHESTRATING AI VISUAL..."}
                fill="rgba(255,255,255,0.3)"
                fontSize={10}
                align="center"
                fontFamily="Inter"
                fontStyle="bold"
                letterSpacing={2}
              />
            </Group>
          )}
          {img && (
            <KonvaImage
              ref={shapeRef as React.RefObject<Konva.Image>}
              image={img}
              x={0} y={0} width={el.width} height={el.height}
              crop={crop}
            />
          )}
        </Group>
      );
    }

    if (el.type === 'chart') {
      const bars     = [0.6, 0.8, 0.4, 0.9, 0.5];
      const barWidth = el.width / (bars.length * 1.5);
      return (
        <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonProps}>
          <Rect x={0} y={0} width={el.width} height={el.height} fill="rgba(255,255,255,0.05)" cornerRadius={8} />
          {bars.map((h, i) => (
            <Rect
              key={i}
              x={i * barWidth * 1.5 + barWidth / 2}
              y={el.height - el.height * 0.7 * h}
              width={barWidth}
              height={el.height * 0.7 * h}
              fill="#3B82F6"
              cornerRadius={4}
            />
          ))}
        </Group>
      );
    }

    if (el.type === 'shape') {
      const fill        = el.shapeStyle?.fill || '#3B82F6';
      const stroke      = el.shapeStyle?.stroke || 'transparent';
      const strokeWidth = el.shapeStyle?.strokeWidth || 0;
      const rectRest = {
        fill,
        stroke,
        strokeWidth,
        shadowColor:  el.shapeStyle?.shadowColor,
        shadowBlur:   el.shapeStyle?.shadowBlur,
        cornerRadius: el.shapeStyle?.cornerRadius || 0,
      };

      if (el.shapeType === 'circle') {
        return (
          <Circle
            ref={shapeRef as React.RefObject<Konva.Circle>}
            {...commonProps}
            radius={Math.min(el.width, el.height) / 2}
            x={el.x + el.width / 2}
            y={el.y + el.height / 2}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          />
        );
      }
      if (el.shapeType === 'triangle') {
        return (
          <RegularPolygon
            ref={shapeRef as React.RefObject<Konva.RegularPolygon>}
            {...commonProps}
            x={el.x + el.width / 2}
            y={el.y + el.height / 2}
            sides={3}
            radius={Math.min(el.width, el.height) / 2}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          />
        );
      }
      if (el.shapeType === 'star') {
        return (
          <KonvaStar
            ref={shapeRef as React.RefObject<Konva.Star>}
            {...commonProps}
            x={el.x + el.width / 2}
            y={el.y + el.height / 2}
            numPoints={5}
            innerRadius={Math.min(el.width, el.height) / 4}
            outerRadius={Math.min(el.width, el.height) / 2}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          />
        );
      }
      if (el.shapeType === 'line') {
        return (
          <KonvaLine
            ref={shapeRef as React.RefObject<Konva.Line>}
            {...commonProps}
            points={[0, el.height / 2, el.width, el.height / 2]}
            stroke={stroke || fill}
            strokeWidth={strokeWidth || 3}
            fill={undefined}
          />
        );
      }
      if (el.shapeType === 'arrow') {
        return (
          <KonvaArrow
            ref={shapeRef as React.RefObject<Konva.Arrow>}
            {...commonProps}
            points={[0, el.height / 2, el.width, el.height / 2]}
            fill={fill}
            stroke={fill}
            strokeWidth={3}
            pointerLength={16}
            pointerWidth={12}
          />
        );
      }
      return (
        <Rect
          ref={shapeRef as React.RefObject<Konva.Rect>}
          {...commonProps}
          {...rectRest}
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
          enabledAnchors={[
            'top-left', 'top-center', 'top-right',
            'middle-left', 'middle-right',
            'bottom-left', 'bottom-center', 'bottom-right',
          ]}
          anchorFill="#0EA5E9"
          anchorStroke="#fff"
          anchorStrokeWidth={1.5}
          anchorSize={7}
          anchorCornerRadius={1.5}
          borderStroke="#38BDF8"
          borderStrokeWidth={1.2}
          padding={8}
          keepRatio={true}
        />
      )}
    </>
  );
}

// ─── Slide Background ────────────────────────────────────────────────────────
function SlideBackground({ colors, bgImageUrl }: { colors: string[], bgImageUrl?: string }) {
  const { editor } = usePresentationStore();
  const bg     = colors[0] || '#05050A';
  const accent = colors[2] || '#38BDF8';
  const [bgImg] = useImage(bgImageUrl || '', 'anonymous');

  // Calculate crop for background image to prevent warping
  const bgCrop = bgImg ? (() => {
    const aspectRatio = bgImg.width / bgImg.height;
    const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
    let x = 0, y = 0, width = bgImg.width, height = bgImg.height;
    if (aspectRatio > targetRatio) {
      width = bgImg.height * targetRatio;
      x = (bgImg.width - width) / 2;
    } else {
      height = bgImg.width / targetRatio;
      y = (bgImg.height - height) / 2;
    }
    return { x, y, width, height };
  })() : undefined;

  return (
    <>
      {/* Base solid color */}
      <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={bg} />

      {/* Gradient overlay (always subtle) */}
      <Rect
        x={0} y={0}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: CANVAS_WIDTH, y: CANVAS_HEIGHT }}
        fillLinearGradientColorStops={[0, accent + '33', 0.5, 'transparent', 1, accent + '22']}
        listening={false}
      />

      {/* Hero background image — shown at low opacity when available */}
      {bgImageUrl && (
        <Group listening={false}>
          {!bgImg && (
            <Text
              x={0} y={CANVAS_HEIGHT / 2} width={CANVAS_WIDTH}
              text="Generating Cinematic Background..."
              fill="rgba(255,255,255,0.1)"
              fontSize={14}
              align="center"
              fontFamily="Inter"
            />
          )}
          {bgImg && (
            <KonvaImage
              image={bgImg}
              x={0} y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              opacity={0.18}
              crop={bgCrop}
            />
          )}
        </Group>
      )}
    </>
  );
}



// ─── Main Konva Canvas ────────────────────────────────────────────────────────
export function KonvaCanvas({ width, height }: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [drawingRect, setDrawingRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  
  const {
    presentation,
    currentSlideIndex,
    editor,
    selectElement,
    updateElement,
    removeElement,
    setEditorState,
  } = usePresentationStore();

  const slide = presentation?.slides[currentSlideIndex];
  const scale = 1; // Locked to 1. CanvasArea handles all zooming via CSS transforms.

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectElement(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedElementId && slide) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        removeElement(slide.id, editor.selectedElementId);
        selectElement(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editor.selectedElementId, slide, selectElement, removeElement]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editor.activeTool !== 'select') return;
    if (e.target === e.target.getStage()) selectElement(null);
  }, [selectElement, editor.activeTool]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editor.activeTool === 'gen-fill') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setDrawingRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      }
    }
  }, [editor.activeTool]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editor.activeTool === 'gen-fill' && drawingRect) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setDrawingRect(prev => prev ? { ...prev, w: pos.x - prev.x, h: pos.y - prev.y } : null);
      }
    }
  }, [editor.activeTool, drawingRect]);

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editor.activeTool === 'gen-fill' && drawingRect) {
      if (Math.abs(drawingRect.w) > 20 && Math.abs(drawingRect.h) > 20) {
        const x = drawingRect.w < 0 ? drawingRect.x + drawingRect.w : drawingRect.x;
        const y = drawingRect.h < 0 ? drawingRect.y + drawingRect.h : drawingRect.y;
        const w = Math.abs(drawingRect.w);
        const h = Math.abs(drawingRect.h);

        const newId = `el-genfill-${Date.now()}`;
        const newEl: SlideElement = {
          id: newId,
          type: 'image',
          src: '', // Empty src triggers the AI loading placeholder
          x, y, width: w, height: h,
          opacity: 1, visible: true, locked: false,
          zIndex: (slide?.elements?.length || 0) + 1,
        };

        if (slide) {
          usePresentationStore.getState().addElement(slide.id, newEl);
          usePresentationStore.getState().selectElement(newId);
        }
      }
      setDrawingRect(null);
      setEditorState({ activeTool: 'select' });
    }
  }, [editor.activeTool, drawingRect, slide, setEditorState]);

  if (!slide || !presentation) {
    return (
      <div className="flex flex-col items-center justify-center text-textMuted" style={{ width, height }}>
        <div className="text-6xl mb-4 opacity-20">✦</div>
        <p className="text-sm">No slide selected</p>
      </div>
    );
  }

  // Find the background image element (zIndex 0, full-slide size) if any
  const bgEl = (slide.elements || []).find(
    (el) => el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0 && el.src
  );
  // Render all elements EXCEPT the bg image (it's handled by SlideBackground)
  const elements = (slide.elements || []).filter((el) => !(el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0));

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div
        className="shadow-[0_50px_120px_-35px_rgba(15,23,42,0.35)] border border-white/[0.12]"
        style={{
          width:           CANVAS_WIDTH  * scale,
          height:          CANVAS_HEIGHT * scale,
          borderRadius:    4,
          overflow:        'hidden',
          backgroundColor: '#000',
          pointerEvents:   'auto',
        }}
      >
        <Stage
          ref={stageRef}
          width={CANVAS_WIDTH  * scale}
          height={CANVAS_HEIGHT * scale}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            <SlideBackground
              colors={presentation.colorPalette || ['#05050A', '#38BDF8']}
              bgImageUrl={bgEl?.src}
            />
            {elements.map((el) => (
              <ElementNode
                key={el.id}
                el={el}
                isSelected={editor.selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                onChange={(updates) => updateElement(slide.id, el.id, updates)}
                stageRef={stageRef}
              />
            ))}
            {drawingRect && (
              <Rect
                x={drawingRect.w < 0 ? drawingRect.x + drawingRect.w : drawingRect.x}
                y={drawingRect.h < 0 ? drawingRect.y + drawingRect.h : drawingRect.y}
                width={Math.abs(drawingRect.w)}
                height={Math.abs(drawingRect.h)}
                fill="rgba(59, 130, 246, 0.08)"
                stroke="#38BDF8"
                strokeWidth={2}
                dash={[5, 5]}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
