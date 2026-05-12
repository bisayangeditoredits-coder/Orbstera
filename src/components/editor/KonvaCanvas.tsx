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
  activeTool,
}: {
  el: SlideElement;
  isSelected: boolean;
  onChange: (updates: Partial<SlideElement>) => void;
  stageRef: React.RefObject<Konva.Stage>;
  activeTool: string;
  isEditingText: boolean;
  onDblClickText: () => void;
}) {
  const shapeRef = useRef<Konva.Node>(null);
  const trRef    = useRef<Konva.Transformer>(null);
  const genFillBorderRef = useRef<Konva.Rect>(null);
  // Omit crossOrigin so external URLs (e.g. Pollinations) load like sidebar `<img>`;
  // `anonymous` requires ACAO and leaves the canvas stuck on the loading placeholder.
  const [img]    = useImage(el.src || '');

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
    if (el.type !== 'image' || img) return;
    const node = genFillBorderRef.current;
    if (!node) return;
    const layer = node.getLayer();
    if (!layer) return;
    const anim = new Konva.Animation((frame) => {
      const t = frame?.time ?? 0;
      node.dashOffset((t / 24) % 32);
    }, layer);
    anim.start();
    return () => {
      anim.stop();
    };
  }, [el.type, el.id, img]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, el.visible]);

  if (el.visible === false) return null;

  // When generative fill tool is active, make all elements non-interactive
  // so mouse events pass through to the Stage for rectangle drawing.
  const isDrawingTool = activeTool === 'gen-fill';

  const commonProps = {
    x: el.x,
    y: el.y,
    width:    el.width,
    height:   el.height,
    rotation: el.rotation || 0,
    opacity:  el.opacity ?? 1,
    draggable: isDrawingTool ? false : !el.locked,
    onClick: onSelect,
    onTap:   onSelect,
    onDblClick: () => {
      if (el.type === 'text' && !el.locked && !isDrawingTool) onDblClickText();
    },
    onDblTap: () => {
      if (el.type === 'text' && !el.locked && !isDrawingTool) onDblClickText();
    },
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
          opacity={isEditingText ? 0 : (el.opacity ?? 1)}
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
      const awaitingPrompt = !el.src?.trim();
      const aiSlot = !!(awaitingPrompt && el.aiImagePending);
      const statusTitle = awaitingPrompt ? (aiSlot ? 'AI visuals' : 'Generative fill') : 'Rendering';
      const statusSub = awaitingPrompt
        ? aiSlot
          ? 'Rendering with AI — updates live'
          : 'Describe content in the panel below'
        : 'Loading image…';

      return (
        <Group
          ref={shapeRef as React.RefObject<Konva.Group>}
          x={commonProps.x}
          y={commonProps.y}
          width={commonProps.width}
          height={commonProps.height}
          rotation={commonProps.rotation}
          opacity={commonProps.opacity}
          draggable={commonProps.draggable}
          listening={commonProps.listening}
          onClick={commonProps.onClick}
          onTap={commonProps.onTap}
          onDragEnd={commonProps.onDragEnd}
          onTransformEnd={commonProps.onTransformEnd}
        >
          {/* Placeholder — only when image hasn't loaded yet */}
          {!img && (
            <Group listening={false}>
              <Rect
                x={0} y={0} width={el.width} height={el.height}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: el.width, y: el.height }}
                fillLinearGradientColorStops={[
                  0, 'rgba(15,23,42,0.92)',
                  0.45, 'rgba(30,41,59,0.88)',
                  1, 'rgba(15,23,42,0.94)',
                ]}
                cornerRadius={12}
              />
              <Rect
                ref={genFillBorderRef}
                x={0} y={0} width={el.width} height={el.height}
                fill="transparent"
                stroke="rgba(56,189,248,0.65)"
                strokeWidth={1.5}
                cornerRadius={12}
                dash={[10, 7]}
              />
              <Text
                x={0} y={el.height / 2 - 26} width={el.width}
                text="✦"
                fill="#38BDF8"
                fontSize={22}
                align="center"
                fontFamily="Inter"
              />
              <Text
                x={0} y={el.height / 2 - 2} width={el.width}
                text={statusTitle}
                fill="rgba(248,250,252,0.92)"
                fontSize={12}
                align="center"
                fontFamily="Inter"
                fontStyle="bold"
                letterSpacing={0.3}
              />
              <Text
                x={0} y={el.height / 2 + 16} width={el.width}
                text={statusSub}
                fill="rgba(148,163,184,0.85)"
                fontSize={9}
                align="center"
                fontFamily="Inter"
                lineHeight={1.35}
              />
            </Group>
          )}
          {/* Loaded image — fills the exact rectangle dimensions */}
          {img && (
            <KonvaImage
              image={img}
              x={0} y={0} width={el.width} height={el.height}
              // Keep image itself non-listening so the draggable parent Group
              // consistently receives pointer events (select/drag/transform).
              listening={false}
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
  const [bgImg] = useImage(bgImageUrl || '');

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
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
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
      if (e.key === 'Escape') {
        selectElement(null);
        setEditingTextId(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && editor.selectedElementId && slide) {
        if (editingTextId) return; // Do not delete node if editing text
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        removeElement(slide.id, editor.selectedElementId);
        selectElement(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editor.selectedElementId, slide, selectElement, removeElement, editingTextId]);

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

  const handleMouseUp = useCallback(() => {
    if (editor.activeTool !== 'gen-fill' || !drawingRect) return;
    const rw = drawingRect.w;
    const rh = drawingRect.h;
    const bigEnough = Math.abs(rw) > 20 && Math.abs(rh) > 20;
    if (bigEnough && slide) {
      const x = rw < 0 ? drawingRect.x + rw : drawingRect.x;
      const y = rh < 0 ? drawingRect.y + rh : drawingRect.y;
      const w = Math.abs(rw);
      const h = Math.abs(rh);
      const newId = `el-genfill-${Date.now()}`;
      const newEl: SlideElement = {
        id: newId,
        type: 'image',
        src: '',
        x, y, width: w, height: h,
        opacity: 1, visible: true, locked: false,
        zIndex: (slide.elements?.length || 0) + 1,
      };
      usePresentationStore.getState().addElement(slide.id, newEl);
      usePresentationStore.getState().selectElement(newId);
      setEditorState({
        activeTool: 'select',
        generativeFillTarget: { slideId: slide.id, elementId: newId },
      });
    } else {
      setEditorState({ activeTool: 'select' });
    }
    setDrawingRect(null);
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
          cursor:          editor.activeTool === 'gen-fill' ? 'crosshair' : 'default',
          pointerEvents:   'auto',
          position:        'relative',
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
              <ElementNode
                key={el.id}
                el={el}
                isSelected={editor.activeTool === 'gen-fill' ? false : editor.selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                onChange={(updates) => updateElement(slide.id, el.id, updates)}
                stageRef={stageRef}
                activeTool={editor.activeTool}
                isEditingText={editingTextId === el.id}
                onDblClickText={() => setEditingTextId(el.id)}
              />
            ))}
            {drawingRect && (() => {
              const rx = drawingRect.w < 0 ? drawingRect.x + drawingRect.w : drawingRect.x;
              const ry = drawingRect.h < 0 ? drawingRect.y + drawingRect.h : drawingRect.y;
              const rwPx = Math.abs(drawingRect.w);
              const rhPx = Math.abs(drawingRect.h);
              const label = `${Math.round(rwPx)} × ${Math.round(rhPx)}`;
              const lw = Math.min(160, 14 + label.length * 6.5);
              return (
                <Group>
                  <Rect
                    x={rx}
                    y={ry}
                    width={rwPx}
                    height={rhPx}
                    fill="rgba(56, 189, 248, 0.12)"
                    stroke="rgba(56, 189, 248, 0.85)"
                    strokeWidth={1.5}
                    dash={[8, 6]}
                  />
                  <Rect x={rx + 6} y={ry + 6} width={10} height={10} stroke="rgba(56,189,248,0.5)" strokeWidth={1} cornerRadius={1} />
                  <Rect x={rx + rwPx - 16} y={ry + rhPx - 16} width={10} height={10} stroke="rgba(56,189,248,0.5)" strokeWidth={1} cornerRadius={1} />
                  <Group x={rx + rwPx / 2 - lw / 2} y={Math.max(4, ry - 28)}>
                    <Rect
                      x={0} y={0} width={lw} height={22}
                      fill="rgba(15,23,42,0.92)"
                      stroke="rgba(56,189,248,0.35)"
                      strokeWidth={1}
                      cornerRadius={6}
                    />
                    <Text
                      x={0} y={5} width={lw}
                      text={label}
                      fill="#E2E8F0"
                      fontSize={10}
                      align="center"
                      fontFamily="Inter"
                      fontStyle="bold"
                      letterSpacing={0.5}
                    />
                  </Group>
                </Group>
              );
            })()}
          </Layer>
        </Stage>

        {/* Text Editing Overlay */}
        {editingTextId && slide.elements?.map(el => {
          if (el.id !== editingTextId || el.type !== 'text') return null;
          return (
            <textarea
              key="text-editor"
              autoFocus
              value={el.content || ''}
              onChange={(e) => updateElement(slide.id, el.id, { content: e.target.value })}
              onBlur={() => setEditingTextId(null)}
              style={{
                position: 'absolute',
                top: el.y,
                left: el.x,
                width: Math.max(el.width, 100),
                height: Math.max(el.height, 50),
                fontSize: `${el.textStyle?.fontSize || 24}px`,
                fontFamily: el.textStyle?.fontFamily || 'Inter',
                fontWeight: el.textStyle?.fontWeight || 'normal',
                fontStyle: el.textStyle?.fontStyle || 'normal',
                color: el.textStyle?.color || '#fff',
                textAlign: (el.textStyle?.textAlign as any) || 'left',
                lineHeight: el.textStyle?.lineHeight || 1.4,
                letterSpacing: `${el.textStyle?.letterSpacing || 0}px`,
                background: 'transparent',
                border: '1px dashed #38BDF8',
                outline: 'none',
                resize: 'none',
                padding: 0,
                margin: 0,
                overflow: 'visible',
                transform: `rotate(${el.rotation || 0}deg)`,
                transformOrigin: 'top left',
                zIndex: 1000,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
