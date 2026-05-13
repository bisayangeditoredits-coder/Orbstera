'use client';

import { Stage, Layer, Rect, Text, Transformer, Group, Circle, RegularPolygon, Image as KonvaImage, Star as KonvaStar, Line as KonvaLine, Arrow as KonvaArrow } from 'react-konva';
import useImage from 'use-image';
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import Konva from 'konva';
import { usePresentationStore } from '@/store/usePresentationStore';
import { SlideElement } from '@/types';

// Canvas dimensions — 16:9 at 1280×720 logical units
export const CANVAS_WIDTH  = 1280;
export const CANVAS_HEIGHT = 720;

interface KonvaCanvasProps {
  /**
   * CSS scale factor (computed from container size / CANVAS dims).
   * The Stage stays at CANVAS_WIDTH × CANVAS_HEIGHT logical units always.
   * The outer wrapper is CSS-scaled so it fits the viewport.
   */
  scale: number;
}

function ElementNode({
  el,
  isSelected,
  onSelect,
  onChange,
  activeTool,
  isEditingText,
  onDblClickText,
}: {
  el: SlideElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<SlideElement>) => void;
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
  const isCentered = el.shapeType === 'circle' || el.shapeType === 'triangle' || el.shapeType === 'star';

  const commonProps = {
    x: el.x,
    y: el.y,
    width:    el.width,
    height:   el.height,
    rotation: el.rotation || 0,
    opacity:  el.opacity ?? 1,
    draggable: isDrawingTool ? false : !el.locked,
    listening: !isDrawingTool,
    onClick: onSelect,
    onTap:   onSelect,
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
      onChange({ x: newX, y: newY });
    },
    onTransformEnd: () => {
      const node   = shapeRef.current!;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      const newWidth = Math.max(20, node.width()  * scaleX);
      const newHeight = Math.max(20, node.height() * scaleY);
      let newX = node.x();
      let newY = node.y();

      if (isCentered) {
        newX -= newWidth / 2;
        newY -= newHeight / 2;
      }

      onChange({
        x:        newX,
        y:        newY,
        width:    newWidth,
        height:   newHeight,
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
            hitStrokeWidth={20}
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
            hitStrokeWidth={24}
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
export function KonvaCanvas({ scale }: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [drawingRect, setDrawingRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const {
    presentation,
    currentSlideIndex,
    editor,
    selectElement,
    updateElement,
    removeElement,
  } = usePresentationStore();

  const slide = presentation?.slides[currentSlideIndex];

  const drawingRectRef = useRef(drawingRect);
  const activeToolRef = useRef(editor.activeTool);
  const slideRef = useRef(slide);
  drawingRectRef.current = drawingRect;
  activeToolRef.current = editor.activeTool;
  slideRef.current = slide;

  const finalizeGenFillDraw = useCallback(() => {
    if (activeToolRef.current !== 'gen-fill') return;
    const dr = drawingRectRef.current;
    if (!dr) return;
    drawingRectRef.current = null;
    setDrawingRect(null);

    const rw = dr.w;
    const rh = dr.h;
    const bigEnough = Math.abs(rw) > 20 && Math.abs(rh) > 20;
    const s = slideRef.current;
    if (bigEnough && s) {
      const x = rw < 0 ? dr.x + rw : dr.x;
      const y = rh < 0 ? dr.y + rh : dr.y;
      const w = Math.abs(rw);
      const h = Math.abs(rh);
      const newId = `el-genfill-${Date.now()}`;
      const newEl: SlideElement = {
        id: newId,
        type: 'image',
        src: '',
        x, y, width: w, height: h,
        opacity: 1, visible: true, locked: false,
        zIndex: (s.elements?.length || 0) + 1,
      };
      const store = usePresentationStore.getState();
      store.addElement(s.id, newEl);
      store.selectElement(newId);
      store.setEditorState({
        activeTool: 'select',
        generativeFillTarget: { slideId: s.id, elementId: newId },
      });
    } else {
      usePresentationStore.getState().setEditorState({ activeTool: 'select' });
    }
  }, []);

  useEffect(() => {
    const onWindowPointerEnd = () => {
      finalizeGenFillDraw();
    };
    window.addEventListener('mouseup', onWindowPointerEnd);
    window.addEventListener('touchend', onWindowPointerEnd, { passive: true } as AddEventListenerOptions);
    return () => {
      window.removeEventListener('mouseup', onWindowPointerEnd);
      window.removeEventListener('touchend', onWindowPointerEnd);
    };
  }, [finalizeGenFillDraw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editor.activeTool === 'gen-fill' && drawingRectRef.current) {
          drawingRectRef.current = null;
          setDrawingRect(null);
          usePresentationStore.getState().setEditorState({ activeTool: 'select' });
        }
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
  }, [mounted, editor.activeTool, editor.selectedElementId, slide, selectElement, removeElement, editingTextId]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editor.activeTool !== 'select') return;
    if (e.target === e.target.getStage()) selectElement(null);
  }, [selectElement, editor.activeTool]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editor.activeTool !== 'gen-fill') return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos || !stage) return;
    setDrawingRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    try {
      const pid = (e.evt as PointerEvent).pointerId;
      if (typeof pid === 'number' && stage.container().setPointerCapture) {
        stage.container().setPointerCapture(pid);
      }
    } catch {
      /* ignore: duplicate capture or unsupported */
    }
  }, [editor.activeTool]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeToolRef.current !== 'gen-fill') return;
    const start = drawingRectRef.current;
    if (!start) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    setDrawingRect({ ...start, w: pos.x - start.x, h: pos.y - start.y });
  }, []);

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      try {
        const pid = (e.evt as PointerEvent).pointerId;
        if (stage && typeof pid === 'number') stage.container().releasePointerCapture(pid);
      } catch {
        /* not capturing */
      }
      finalizeGenFillDraw();
    },
    [finalizeGenFillDraw],
  );

  if (!mounted) {
    return null;
  }

  if (!slide || !presentation) {
    return (
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col items-center justify-center text-textMuted"
      >
        <div className="text-6xl mb-4 opacity-20">✦</div>
        <p className="text-sm">No slide selected</p>
      </div>
    );
  }

  // Find the background image element (zIndex 0, full-slide size) if any
  const bgEl = (slide.elements || []).find(
    (el) => el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0 && el.src
  );
  // Render all elements EXCEPT the bg image (it's handled by SlideBackground).
  // Paint order follows slide.elements array order (see reorderElements).
  const elements = (slide.elements || []).filter((el) => !(el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0));

  return (
    <div
      style={{
        // The wrapper shrinks/grows via CSS scale — the Stage always stays at native resolution.
        // transformOrigin: top-left so CanvasArea can center it correctly.
        width:           CANVAS_WIDTH,
        height:          CANVAS_HEIGHT,
        transform:       `scale(${scale})`,
        transformOrigin: 'top left',
        flexShrink:      0,
        pointerEvents:   'none',
      }}
    >
      <div
        className="shadow-[0_50px_120px_-35px_rgba(15,23,42,0.35)] border border-white/[0.12]"
        style={{
          width:           CANVAS_WIDTH,
          height:          CANVAS_HEIGHT,
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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleStageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleStageMouseUp}
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
                isSelected={editor.activeTool === 'gen-fill' ? false : editor.selectedElementId === el.id}
                onSelect={() => selectElement(el.id)}
                onChange={(updates) => updateElement(slide.id, el.id, updates)}
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

        {/* Text overlay: positioned in canvas logical pixels; no extra scale needed since the parent wrapper already scales */}
        {editingTextId && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
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
                    textAlign: (el.textStyle?.textAlign || 'left') as CSSProperties['textAlign'],
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
                    pointerEvents: 'auto',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
