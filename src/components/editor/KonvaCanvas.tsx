'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Group,
  Transformer,
  Arrow as KonvaArrow,
  Ellipse,
  Line,
  Star,
} from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { ChartData, EditorToolId, SlideElement } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

const SLIDE_BG_NAME = 'slide-bg';
const MIN_PLACE = 20;
const CLICK_CANCEL_MOVE = 8;

const DRAG_PLACEMENT_TOOLS: readonly EditorToolId[] = [
  'rect',
  'circle',
  'triangle',
  'star',
  'line',
  'arrow',
] as const;

const CLICK_PLACEMENT_TOOLS: readonly EditorToolId[] = [
  'text',
  'chart',
  'frame-circle',
  'frame-heart',
  'frame-box',
] as const;

function isSlideBackgroundTarget(target: Konva.Node): boolean {
  const stage = target.getStage();
  return target === stage || target.name() === SLIDE_BG_NAME;
}

function defaultShapeStyle(accent: string) {
  return { fill: accent, stroke: 'transparent' as const, strokeWidth: 0 };
}

function defaultLineStyle(accent: string) {
  return { fill: accent, stroke: accent, strokeWidth: 4 };
}

function defaultChartData(accent: string): ChartData {
  return {
    type: 'bar',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Series A',
        data: [12, 19, 14, 22],
        backgroundColor: [accent, `${accent}cc`, `${accent}99`, `${accent}77`],
      },
    ],
  };
}

interface ElementNodeProps {
  el: SlideElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<SlideElement>, saveHistory?: boolean) => void;
  activeTool: EditorToolId;
  isEditingText: boolean;
  onDblClickText: () => void;
  previewElementId: string | null;
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
  previewElementId,
}: ElementNodeProps) {
  const shapeRef = useRef<Konva.Group | Konva.Rect | Konva.Text | Konva.Ellipse | Konva.Line | Konva.Star | Konva.Arrow | null>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const genFillBorderRef = useRef<Konva.Rect>(null);
  const rawImgSrc = el.type === 'image' ? (el.src || '').trim() : '';
  const imageHookSrc =
    rawImgSrc &&
    (/^data:image\//i.test(rawImgSrc) || /^https?:\/\//i.test(rawImgSrc) || /^blob:/i.test(rawImgSrc))
      ? rawImgSrc
      : '';
  const [img, imgStatus] = useImage(imageHookSrc);

  useEffect(() => {
    if (!genFillBorderRef.current) return;
    const node = genFillBorderRef.current;
    const layer = node.getLayer();
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

  useEffect(() => {
    if (previewElementId !== el.id) return;
    const node = shapeRef.current;
    if (!node) return;
    const layer = node.getLayer();
    if (!layer) return;

    const durationSec = Math.max(0.12, (el.animation?.duration ?? 600) / 1000);
    const baseOpacity = el.opacity ?? 1;
    const entrance = el.animation?.entrance;
    const startY = node.y();
    const startX = node.x();
    const lift =
      entrance === 'fadeSlideUp' || entrance === 'verticalRise' || entrance === 'floatGentle' ? 36 : 0;
    const shift =
      entrance === 'fadeSlideLeft' || entrance === 'parallaxDrift' || entrance === 'horizontalReveal'
        ? 32
        : entrance === 'slideRight'
          ? -32
          : 0;

    node.opacity(0);
    if (lift) node.y(startY + lift);
    if (shift) node.x(startX + shift);
    layer.batchDraw();

    const tween = new Konva.Tween({
      node,
      duration: durationSec,
      opacity: baseOpacity,
      x: startX,
      y: startY,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        node.opacity(baseOpacity);
        node.x(startX);
        node.y(startY);
        layer.batchDraw();
      },
    });
    tween.play();
    return () => {
      tween.destroy();
      node.opacity(baseOpacity);
      node.x(startX);
      node.y(startY);
      layer.batchDraw();
    };
  }, [previewElementId, el.id, el.opacity, el.animation?.duration, el.animation?.entrance, el.x, el.y]);

  if (el.visible === false) return null;

  const isDrawingTool = activeTool === 'gen-fill';

  const groupTransformEnd = () => {
    const node = shapeRef.current!;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const newWidth = Math.max(MIN_PLACE, el.width * scaleX);
    const newHeight = Math.max(MIN_PLACE, el.height * scaleY);
    onChange(
      {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
      },
      true,
    );
  };

  const commonGroup = {
    x: el.x,
    y: el.y,
    rotation: el.rotation || 0,
    opacity: el.opacity ?? 1,
    draggable: isDrawingTool ? false : !el.locked,
    listening: !isDrawingTool,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ x: e.target.x(), y: e.target.y() }, true);
    },
    onTransformEnd: groupTransformEnd,
  };

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
      onChange({ x: e.target.x(), y: e.target.y() }, true);
    },
    onTransformEnd: () => {
      const node = shapeRef.current!;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const newWidth = Math.max(MIN_PLACE, node.width() * scaleX);
      const newHeight = Math.max(MIN_PLACE, node.height() * scaleY);
      onChange(
        {
          x: node.x(),
          y: node.y(),
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
        },
        true,
      );
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
          fontStyle={
            [
              el.textStyle?.fontStyle === 'italic' ? 'italic' : '',
              el.textStyle?.fontWeight === 'bold' ? 'bold' : '',
            ]
              .filter(Boolean)
              .join(' ') || 'normal'
          }
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
          {...commonProps}
          clipFunc={(ctx) => {
            if (!el.maskType || el.maskType === 'none') {
              ctx.rect(0, 0, el.width, el.height);
              return;
            }
            if (el.maskType === 'circle') {
              ctx.arc(el.width / 2, el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2, false);
            } else if (el.maskType === 'heart') {
              const w = el.width,
                h = el.height;
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
          <Rect x={0} y={0} width={el.width} height={el.height} fill="transparent" listening />
          {!img && imgStatus !== 'failed' && (
            <Group listening={false}>
              <Rect
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: el.width, y: el.height }}
                fillLinearGradientColorStops={[
                  0,
                  'rgba(15,23,42,0.92)',
                  0.45,
                  'rgba(30,41,59,0.88)',
                  1,
                  'rgba(15,23,42,0.94)',
                ]}
                cornerRadius={!el.maskType || el.maskType === 'square' || el.maskType === 'none' ? 12 : 0}
              />
              <Rect
                ref={genFillBorderRef}
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fill="transparent"
                stroke="rgba(56,189,248,0.65)"
                strokeWidth={1.5}
                cornerRadius={!el.maskType || el.maskType === 'square' || el.maskType === 'none' ? 12 : 0}
                dash={[10, 7]}
              />
              <Text
                x={0}
                y={el.height / 2 - 26}
                width={el.width}
                text="✦"
                fill="#38BDF8"
                fontSize={22}
                align="center"
                fontFamily="Inter"
              />
              <Text
                x={0}
                y={el.height / 2 - 2}
                width={el.width}
                text={statusTitle}
                fill="rgba(248,250,252,0.92)"
                fontSize={12}
                align="center"
                fontFamily="Inter"
                fontStyle="bold"
              />
              <Text
                x={0}
                y={el.height / 2 + 16}
                width={el.width}
                text={statusSub}
                fill="rgba(148,163,184,0.85)"
                fontSize={9}
                align="center"
                fontFamily="Inter"
              />
            </Group>
          )}
          {!img && imgStatus === 'failed' && imageHookSrc && (
            <Group listening={false}>
              <Rect x={0} y={0} width={el.width} height={el.height} fill="rgba(127,29,29,0.25)" cornerRadius={8} />
              <Text
                x={0}
                y={el.height / 2 - 8}
                width={el.width}
                text="Image failed to load"
                fill="rgba(254,226,226,0.95)"
                fontSize={11}
                align="center"
                fontFamily="Inter"
              />
            </Group>
          )}
          {img && <KonvaImage image={img} x={0} y={0} width={el.width} height={el.height} />}
        </Group>
      );
    }

    if (el.type === 'chart') {
      const cd = el.chartData ?? defaultChartData('#38BDF8');
      const pad = 12;
      const chartH = el.height - pad * 2 - 28;
      const chartW = el.width - pad * 2;
      const n = Math.max(1, cd.labels.length);
      const maxVal = Math.max(1, ...cd.datasets.flatMap((d) => d.data));
      const barW = chartW / n - 6;
      const accent = (cd.datasets[0]?.backgroundColor as string) || '#38BDF8';
      const fills = Array.isArray(cd.datasets[0]?.backgroundColor)
        ? (cd.datasets[0]?.backgroundColor as string[])
        : Array(n).fill(accent);

      return (
        <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
          <Rect width={el.width} height={el.height} fill="rgba(15,23,42,0.55)" cornerRadius={10} stroke="rgba(148,163,184,0.35)" strokeWidth={1} />
          <Text x={pad} y={pad} text="Chart" fill="rgba(248,250,252,0.9)" fontSize={13} fontFamily="Inter" fontStyle="bold" />
          {cd.labels.map((label, i) => {
            const v = cd.datasets[0]?.data[i] ?? 0;
            const h = (v / maxVal) * chartH;
            const x = pad + i * (chartW / n) + 3;
            const y = pad + 28 + chartH - h;
            return (
              <React.Fragment key={`${label}-${i}`}>
                <Rect x={x} y={y} width={barW} height={h} fill={fills[i % fills.length] || accent} cornerRadius={4} />
                <Text
                  x={x - 2}
                  y={pad + 28 + chartH + 4}
                  width={barW + 4}
                  text={label}
                  fill="rgba(148,163,184,0.95)"
                  fontSize={9}
                  align="center"
                  fontFamily="Inter"
                />
              </React.Fragment>
            );
          })}
        </Group>
      );
    }

    if (el.type === 'shape') {
      const fill = el.shapeStyle?.fill || '#38BDF8';
      const stroke = el.shapeStyle?.stroke || 'transparent';
      const strokeWidth = el.shapeStyle?.strokeWidth || 0;
      const cornerRadius = el.shapeStyle?.cornerRadius || 0;

      if (el.shapeType === 'circle') {
        return (
          <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
            <Ellipse
              x={el.width / 2}
              y={el.height / 2}
              radiusX={el.width / 2}
              radiusY={el.height / 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </Group>
        );
      }

      if (el.shapeType === 'triangle') {
        return (
          <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
            <Line
              points={[el.width / 2, 0, el.width, el.height, 0, el.height]}
              closed
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </Group>
        );
      }

      if (el.shapeType === 'star') {
        const r = Math.min(el.width, el.height) / 2;
        return (
          <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
            <Star
              x={el.width / 2}
              y={el.height / 2}
              numPoints={5}
              innerRadius={r * 0.38}
              outerRadius={r * 0.92}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
          </Group>
        );
      }

      if (el.shapeType === 'line') {
        const c = stroke !== 'transparent' ? stroke : fill;
        return (
          <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
            <Line
              points={[0, el.height / 2, el.width, el.height / 2]}
              stroke={c}
              strokeWidth={strokeWidth || 4}
              lineCap="round"
            />
          </Group>
        );
      }

      if (el.shapeType === 'arrow') {
        const sw = strokeWidth || 4;
        return (
          <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
            <KonvaArrow
              points={[0, el.height / 2, el.width, el.height / 2]}
              fill={fill}
              stroke={fill}
              strokeWidth={sw}
              pointerLength={Math.min(18, el.height * 0.45)}
              pointerWidth={Math.min(18, el.height * 0.7)}
            />
          </Group>
        );
      }

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
            if (newBox.width < MIN_PLACE || newBox.height < MIN_PLACE) return oldBox;
            return newBox;
          }}
          rotateEnabled
          enabledAnchors={[
            'top-left',
            'top-center',
            'top-right',
            'middle-left',
            'middle-right',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ]}
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
function SlideBackground({
  colors,
  bgImageUrl,
  bgImageOpacity,
}: {
  colors: string[];
  bgImageUrl?: string;
  /** Deck hero image opacity (element.opacity); falls back when unset */
  bgImageOpacity?: number;
}) {
  const bg = colors[0] || '#05050A';
  const accent = colors[2] || '#38BDF8';
  const [bgImg] = useImage(bgImageUrl?.trim() || '');
  const heroOpacity = typeof bgImageOpacity === 'number' ? bgImageOpacity : 0.18;

  return (
    <>
      <Rect name={SLIDE_BG_NAME} x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={bg} />
      <Rect
        x={0}
        y={0}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: CANVAS_WIDTH, y: CANVAS_HEIGHT }}
        fillLinearGradientColorStops={[0, accent + '33', 0.5, 'transparent', 1, accent + '22']}
        listening={false}
      />
      {bgImageUrl && bgImg && (
        <KonvaImage
          image={bgImg}
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          opacity={heroOpacity}
          listening={false}
        />
      )}
    </>
  );
}

function placementCursor(tool: EditorToolId): string {
  if (tool === 'select') return 'default';
  if (tool === 'text') return 'text';
  return 'crosshair';
}

// ─── Main Konva Canvas ────────────────────────────────────────────────────────
export function KonvaCanvas({ scale }: { scale: number }) {
  const stageRef = useRef<Konva.Stage>(null);
  const [drawingRect, setDrawingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const clickStartRef = useRef<{ x: number; y: number; tool: EditorToolId } | null>(null);
  /** Suppress the synthetic click after mouseup so we do not immediately deselect a newly placed element */
  const ignoreNextBgClickRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { presentation, currentSlideIndex, editor, selectElement, updateElement } = usePresentationStore();
  const slide = presentation?.slides[currentSlideIndex];

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isSlideBackgroundTarget(e.target)) return;
    if (ignoreNextBgClickRef.current) {
      ignoreNextBgClickRef.current = false;
      return;
    }
    if (editor.activeTool === 'select') {
      selectElement(null);
      setEditingTextId(null);
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isSlideBackgroundTarget(e.target)) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const tool = editor.activeTool;
    if (tool === 'gen-fill') {
      setDrawingRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      return;
    }
    if (DRAG_PLACEMENT_TOOLS.includes(tool)) {
      setDrawingRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      return;
    }
    if (CLICK_PLACEMENT_TOOLS.includes(tool)) {
      clickStartRef.current = { x: pos.x, y: pos.y, tool };
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (drawingRect && pos) {
      setDrawingRect((prev) => {
        if (!prev) return prev;
        return { ...prev, w: pos!.x - prev.x, h: pos!.y - prev.y };
      });
      return;
    }
    if (clickStartRef.current && pos) {
      const c = clickStartRef.current;
      const d = Math.hypot(pos.x - c.x, pos.y - c.y);
      if (d > CLICK_CANCEL_MOVE) clickStartRef.current = null;
    }
  };

  const handleMouseUp = () => {
    const store = usePresentationStore.getState();
    const s = store.presentation?.slides[store.currentSlideIndex];
    if (!s) {
      setDrawingRect(null);
      clickStartRef.current = null;
      return;
    }

    const tool = store.editor.activeTool;
    const palette = store.presentation?.colorPalette || ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'];
    const accent = palette[2] || '#38BDF8';
    const textColor = palette[1] || '#FFFFFF';
    const bodyFont = store.presentation?.fontPairing?.body || 'Inter';
    const z = (s.elements?.length || 0) + 1;

    const finishPlacement = () => {
      store.setEditorState({ activeTool: 'select' });
    };

    if (drawingRect) {
      const rw = Math.abs(drawingRect.w);
      const rh = Math.abs(drawingRect.h);
      const x = drawingRect.w < 0 ? drawingRect.x + drawingRect.w : drawingRect.x;
      const y = drawingRect.h < 0 ? drawingRect.y + drawingRect.h : drawingRect.y;

      const dragBigEnough =
        tool === 'line' || tool === 'arrow'
          ? rw >= MIN_PLACE && rh >= 4
          : rw >= MIN_PLACE && rh >= MIN_PLACE;

      if (tool === 'gen-fill' && rw > MIN_PLACE && rh > MIN_PLACE) {
        const newId = `el-genfill-${Date.now()}`;
        store.addElement(s.id, {
          id: newId,
          type: 'image',
          src: '',
          x,
          y,
          width: rw,
          height: rh,
          zIndex: z,
          visible: true,
          opacity: 1,
          locked: false,
        });
        store.selectElement(newId);
        ignoreNextBgClickRef.current = true;
        store.setEditorState({
          activeTool: 'select',
          generativeFillTarget: { slideId: s.id, elementId: newId },
        });
        setDrawingRect(null);
        return;
      }

      if (DRAG_PLACEMENT_TOOLS.includes(tool) && dragBigEnough) {
        const id = `el-shape-${Date.now()}`;
        if (tool === 'rect') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'rect',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'circle') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'circle',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'triangle') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'triangle',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'star') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'star',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        } else if (tool === 'line') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'line',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultLineStyle(accent),
          });
        } else if (tool === 'arrow') {
          store.addElement(s.id, {
            id,
            type: 'shape',
            shapeType: 'arrow',
            x,
            y,
            width: rw,
            height: rh,
            zIndex: z,
            visible: true,
            opacity: 1,
            locked: false,
            shapeStyle: defaultShapeStyle(accent),
          });
        }
        store.selectElement(id);
        ignoreNextBgClickRef.current = true;
        finishPlacement();
      }

      setDrawingRect(null);
      return;
    }

    const click = clickStartRef.current;
    clickStartRef.current = null;
    if (!click || click.tool !== tool) return;

    if (tool === 'text') {
      const tw = 400;
      const th = 120;
      const newId = `el-text-${Date.now()}`;
      store.addElement(s.id, {
        id: newId,
        type: 'text',
        x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - tw, click.x - tw / 2))),
        y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - th, click.y - th / 2))),
        width: tw,
        height: th,
        content: 'Double-click to edit',
        zIndex: z,
        visible: true,
        opacity: 1,
        locked: false,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: 28,
          fontWeight: 'normal',
          color: textColor,
          textAlign: 'left',
          lineHeight: 1.35,
        },
      });
      store.selectElement(newId);
      setEditingTextId(newId);
      ignoreNextBgClickRef.current = true;
      finishPlacement();
      return;
    }

    if (tool === 'chart') {
      const cw = 420;
      const ch = 260;
      const newId = `el-chart-${Date.now()}`;
      store.addElement(s.id, {
        id: newId,
        type: 'chart',
        x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - cw, click.x - cw / 2))),
        y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - ch, click.y - ch / 2))),
        width: cw,
        height: ch,
        zIndex: z,
        visible: true,
        opacity: 1,
        locked: false,
        chartData: defaultChartData(accent),
      });
      store.selectElement(newId);
      ignoreNextBgClickRef.current = true;
      finishPlacement();
      return;
    }

    if (tool === 'frame-circle' || tool === 'frame-heart' || tool === 'frame-box') {
      const fw = 280;
      const fh = 280;
      const maskType = tool === 'frame-circle' ? 'circle' : tool === 'frame-heart' ? 'heart' : 'square';
      const newId = `el-frame-${Date.now()}`;
      store.addElement(s.id, {
        id: newId,
        type: 'image',
        src: '',
        maskType,
        x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - fw, click.x - fw / 2))),
        y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - fh, click.y - fh / 2))),
        width: fw,
        height: fh,
        zIndex: z,
        visible: true,
        opacity: 1,
        locked: false,
      });
      store.selectElement(newId);
      ignoreNextBgClickRef.current = true;
      finishPlacement();
    }
  };

  if (!mounted || !slide || !presentation) return null;

  const bgEl = findDeckBackgroundElement(slide.elements);
  const elements = (slide.elements || []).filter((el) => el !== bgEl);

  return (
    <div
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'relative',
        backgroundColor: '#000',
        cursor: placementCursor(editor.activeTool),
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
          <SlideBackground
            colors={presentation.colorPalette || []}
            bgImageUrl={bgEl?.src}
            bgImageOpacity={bgEl?.opacity}
          />
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
              previewElementId={editor.previewElementId}
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
              listening={false}
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
                  position: 'absolute',
                  top: el.y,
                  left: el.x,
                  width: el.width,
                  height: el.height,
                  fontSize: `${el.textStyle?.fontSize || 24}px`,
                  fontFamily: el.textStyle?.fontFamily || 'Inter',
                  color: el.textStyle?.color || '#fff',
                  textAlign: (el.textStyle?.textAlign || 'left') as React.CSSProperties['textAlign'],
                  background: 'transparent',
                  border: '1px dashed #38BDF8',
                  outline: 'none',
                  resize: 'none',
                  pointerEvents: 'auto',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
