'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Path,
  Circle,
  Arc,
} from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import type { EditorToolId, SlideElement } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';
import { editorImageFetchUrl } from '@/lib/r2-public-url';
import {
  elementAnimationDurationMs,
  getKonvaEntrancePreviewTween,
} from '@/lib/presentationMotion';
import { snapCoord, snapRect } from '@/lib/editor-tools';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  STAGE_PADDING,
  MIN_PLACE,
  SLIDE_BG_NAME,
  getSlidePointerFromEvent,
  isSlideBackgroundTarget,
  useSmartGuides,
  useDrawTool,
  useShapePlacementTool,
  useCanvasSelection,
} from '@/hooks/canvas';
import { GuidesOverlay } from './GuidesOverlay';
import { useGenerationElementReveal } from '@/hooks/useGenerationElementReveal';

export { CANVAS_WIDTH, CANVAS_HEIGHT, STAGE_PADDING };

function getObjectFitCoverCrop(
  img: HTMLImageElement | undefined,
  boxWidth: number,
  boxHeight: number,
  cropPositionX: number = 0.5,
  cropPositionY: number = 0.5
): { crop: { x: number; y: number; width: number; height: number } } | Record<string, never> {
  if (!img || !img.width || !img.height) return {};
  const imageRatio = img.width / img.height;
  const boxRatio = boxWidth / boxHeight;

  let cropWidth = img.width;
  let cropHeight = img.height;
  let cropX = 0;
  let cropY = 0;

  if (imageRatio > boxRatio) {
    // Image is wider than box — crop sides
    cropWidth = img.height * boxRatio;
    cropX = (img.width - cropWidth) * cropPositionX;
  } else if (imageRatio < boxRatio) {
    // Image is taller than box — crop top/bottom
    cropHeight = img.width / boxRatio;
    cropY = (img.height - cropHeight) * cropPositionY;
  }

  return { crop: { x: cropX, y: cropY, width: cropWidth, height: cropHeight } };
}

interface ElementNodeProps {
  el: SlideElement;
  isSelected: boolean;
  onSelect: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onChange: (updates: Partial<SlideElement>, saveHistory?: boolean) => void;
  activeTool: EditorToolId;
  isEditingText: boolean;
  onDblClickText: () => void;
  previewElementId: string | null;
  snapToGrid: boolean;
  gridSize: number;
  onContextMenu: (id: string, x: number, y: number) => void;
  onDragMoveSnapping?: (id: string, x: number, y: number, w: number, h: number) => { x: number; y: number } | void;
  onDragEndSnapping?: () => void;
  onMultiDragEnd?: (dx: number, dy: number, sourceId: string) => void;
  generationRevealActive?: boolean;
  revealVisible?: boolean;
}

// Custom hook to load and play an HTML5 video for Konva
function useVideo(src: string): [HTMLVideoElement | undefined, string] {
  const [video, setVideo] = useState<HTMLVideoElement | undefined>(undefined);
  const [status, setStatus] = useState<string>('loading');
  const shapeRef = useRef<Konva.Shape | null>(null);

  useEffect(() => {
    if (!src) {
      setVideo(undefined);
      setStatus('loading');
      return;
    }
    
    // Fallback if not mp4, just let image loader handle it (though we won't call this for non-mp4s)
    if (!src.endsWith('.mp4')) {
      setVideo(undefined);
      setStatus('failed');
      return;
    }

    const vid = document.createElement('video');
    vid.src = src;
    vid.crossOrigin = 'Anonymous';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    
    vid.addEventListener('loadeddata', () => {
      setStatus('loaded');
      vid.play().catch(e => console.warn('Video play error:', e));
    });
    vid.addEventListener('error', () => {
      setStatus('failed');
    });

    setVideo(vid);

    return () => {
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    };
  }, [src]);

  return [video, status];
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
  snapToGrid,
  gridSize,
  onContextMenu,
  onDragMoveSnapping,
  onDragEndSnapping,
  onMultiDragEnd,
  generationRevealActive = false,
  revealVisible = true,
}: ElementNodeProps) {
  const isPanningImage = usePresentationStore((s) => s.editor.isPanningImage);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; cropX: number; cropY: number } | null>(null);

  const applySnap = (x: number, y: number, w?: number, h?: number) => {
    if (w != null && h != null) {
      const s = snapRect(x, y, w, h, gridSize, snapToGrid);
      return { x: s.x, y: s.y, width: s.w, height: s.h };
    }
    return {
      x: snapCoord(x, gridSize, snapToGrid),
      y: snapCoord(y, gridSize, snapToGrid),
    };
  };
  const shapeRef = useRef<Konva.Group | Konva.Rect | Konva.Text | Konva.Ellipse | Konva.Line | Konva.Star | Konva.Arrow | null>(null);
  const genFillBorderRef = useRef<Konva.Rect>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const rawImgSrc = el.type === 'image' ? (el.src || '').trim() : '';
  let displayImgSrc = editorImageFetchUrl(rawImgSrc);
  
  const isVideoSource = displayImgSrc.split('?')[0].endsWith('.mp4');
  let videoId = '';
  if (displayImgSrc.includes('youtube.com/embed/')) {
    videoId = displayImgSrc.split('embed/')[1]?.split('?')[0] || '';
    if (videoId) displayImgSrc = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  
  const imageHookSrc =
    displayImgSrc && !isVideoSource &&
    (/^data:image\//i.test(displayImgSrc) ||
      /^https?:\/\//i.test(displayImgSrc) ||
      /^blob:/i.test(displayImgSrc) ||
      displayImgSrc.startsWith('/api/'))
      ? displayImgSrc
      : '';
      
  const [img, imgStatus] = useImage(imageHookSrc, 'anonymous');
  const [videoElement, videoStatus] = useVideo(isVideoSource ? displayImgSrc : '');
  
  // Create an animation loop to trigger Konva redraws when video is playing
  useEffect(() => {
    if (!isVideoSource || !videoElement || videoStatus !== 'loaded') return;
    const node = shapeRef.current;
    if (!node) return;
    const layer = node.getLayer();
    if (!layer) return;
    
    const anim = new Konva.Animation(() => {
      // do nothing, but let it redraw the layer so the video frame updates
    }, layer);
    anim.start();
    return () => {
      anim.stop();
    };
  }, [isVideoSource, videoElement, videoStatus]);

  const activeMedia = isVideoSource ? videoElement : img;
  const activeMediaStatus = isVideoSource ? videoStatus : imgStatus;

  const spinnerRef = useRef<Konva.Arc>(null);
  const glowRef = useRef<Konva.Circle>(null);

  useEffect(() => {
    let borderAnim: Konva.Animation | undefined;
    let spinnerAnim: Konva.Animation | undefined;

    if (genFillBorderRef.current) {
      const node = genFillBorderRef.current;
      const layer = node.getLayer();
      if (layer) {
        borderAnim = new Konva.Animation((frame) => {
          const t = frame?.time ?? 0;
          node.dashOffset((t / 24) % 32);
        }, layer);
        borderAnim.start();
      }
    }

    if (spinnerRef.current && glowRef.current) {
      const sNode = spinnerRef.current;
      const gNode = glowRef.current;
      const layer = sNode.getLayer();
      if (layer) {
        spinnerAnim = new Konva.Animation((frame) => {
          const t = frame?.time ?? 0;
          sNode.rotation((t / 800) * 360);
          const scale = 1 + Math.sin(t / 200) * 0.15;
          gNode.scale({ x: scale, y: scale });
          gNode.opacity(0.4 + Math.sin(t / 200) * 0.2);
        }, layer);
        spinnerAnim.start();
      }
    }

    return () => {
      if (borderAnim) borderAnim.stop();
      if (spinnerAnim) spinnerAnim.stop();
    };
  }, [el.aiImagePending, el.type, el.id, img]);

  useEffect(() => {
    // Transformer logic moved to KonvaCanvas for separate overlay layer
    if (!isSelected || el.locked || !shapeRef.current) return;
  }, [isSelected, el.locked]);

  useEffect(() => {
    if (previewElementId !== el.id || generationRevealActive) return;
    const node = shapeRef.current;
    if (!node) return;
    const layer = node.getLayer();
    if (!layer) return;

    const baseOpacity = el.opacity ?? 1;
    const entrance = el.animation?.entrance;
    const startY = el.y;
    const startX = el.x;
    const cfg = getKonvaEntrancePreviewTween(
      entrance,
      elementAnimationDurationMs(el.animation),
      baseOpacity,
      startX,
      startY,
      el.width,
      el.height,
    );

    node.opacity(cfg.from.opacity);
    node.x(cfg.from.x);
    node.y(cfg.from.y);
    if (cfg.useScale) {
      node.offsetX(cfg.from.offsetX);
      node.offsetY(cfg.from.offsetY);
      node.scaleX(cfg.from.scaleX);
      node.scaleY(cfg.from.scaleY);
    }
    layer.batchDraw();

    const tween = new Konva.Tween({
      node,
      duration: cfg.durationSec,
      opacity: cfg.to.opacity,
      x: cfg.to.x,
      y: cfg.to.y,
      scaleX: cfg.to.scaleX,
      scaleY: cfg.to.scaleY,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        node.opacity(baseOpacity);
        node.x(cfg.resetPosition.x);
        node.y(cfg.resetPosition.y);
        node.offsetX(cfg.resetPosition.offsetX);
        node.offsetY(cfg.resetPosition.offsetY);
        node.scaleX(1);
        node.scaleY(1);
        layer.batchDraw();
      },
    });
    tween.play();
    return () => {
      tween.destroy();
      node.opacity(baseOpacity);
      node.x(startX);
      node.y(startY);
      node.offsetX(0);
      node.offsetY(0);
      node.scaleX(1);
      node.scaleY(1);
      layer.batchDraw();
    };
  }, [previewElementId, generationRevealActive, el.id, el.opacity, el.animation, el.x, el.y, el.width, el.height]);

  const baseOpacity = el.opacity ?? 1;
  const prevRevealVisibleRef = useRef(revealVisible);

  useEffect(() => {
    if (!generationRevealActive) {
      prevRevealVisibleRef.current = revealVisible;
      return;
    }
    const node = shapeRef.current;
    if (!node) return;
    const layer = node.getLayer();
    if (!layer) return;

    if (!revealVisible) {
      node.opacity(0);
      layer.batchDraw();
      prevRevealVisibleRef.current = false;
      return;
    }

    if (revealVisible && !prevRevealVisibleRef.current) {
      node.opacity(0);
      layer.batchDraw();
      prevRevealVisibleRef.current = true;
      const tween = new Konva.Tween({
        node,
        duration: 0.18,
        opacity: baseOpacity,
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          prevRevealVisibleRef.current = true;
          layer.batchDraw();
        },
      });
      tween.play();
      return () => tween.destroy();
    }

    prevRevealVisibleRef.current = revealVisible;
  }, [generationRevealActive, revealVisible, el.id, baseOpacity]);

  if (el.visible === false) return null;
  if (generationRevealActive && !revealVisible) return null;

  const elementListening = activeTool === 'select';
  const elementDraggable = activeTool === 'select' && !el.locked;

  const groupTransformEnd = () => {
    const node = shapeRef.current!;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(el.flipX ? -1 : 1);
    node.scaleY(el.flipY ? -1 : 1);
    
    const newWidth = Math.max(MIN_PLACE, el.width * Math.abs(scaleX));
    const newHeight = Math.max(MIN_PLACE, el.height * Math.abs(scaleY));
    
    const newScaleXSign = scaleX < 0 ? -1 : 1;
    const oldScaleXSign = el.flipX ? -1 : 1;
    const flippedX = newScaleXSign !== oldScaleXSign;
    const nextFlipX = flippedX ? !el.flipX : !!el.flipX;

    const newScaleYSign = scaleY < 0 ? -1 : 1;
    const oldScaleYSign = el.flipY ? -1 : 1;
    const flippedY = newScaleYSign !== oldScaleYSign;
    const nextFlipY = flippedY ? !el.flipY : !!el.flipY;

    const s = applySnap(node.x(), node.y(), newWidth, newHeight);
    onChange(
      {
        x: s.x,
        y: s.y,
        width: s.width ?? newWidth,
        height: s.height ?? newHeight,
        rotation: node.rotation(),
        flipX: nextFlipX,
        flipY: nextFlipY,
      },
      true,
    );
  };

  const commonGroup = {
    name: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation || 0,
    opacity: el.opacity ?? 1,
    draggable: elementDraggable && !el.id.startsWith('bg-') && isPanningImage !== el.id,
    listening: elementListening && !el.id.startsWith('bg-'),
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onSelect(e),
    onTap: () => onSelect(),
    onDragStart: () => {
      dragStartPosRef.current = { x: el.x, y: el.y };
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      if (onDragMoveSnapping && !e.evt.shiftKey) {
        const node = e.target;
        const w = node.width() * node.scaleX();
        const h = node.height() * node.scaleY();
        const snapped = onDragMoveSnapping(el.id, node.x(), node.y(), w, h);
        if (snapped) {
          node.x(snapped.x);
          node.y(snapped.y);
        }
      }
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      if (onDragEndSnapping) onDragEndSnapping();
      const s = applySnap(e.target.x(), e.target.y());
      const dx = s.x - (dragStartPosRef.current?.x ?? el.x);
      const dy = s.y - (dragStartPosRef.current?.y ?? el.y);
      dragStartPosRef.current = null;
      onChange({ x: s.x, y: s.y }, true);
      // Move all other selected elements by the same delta
      if (onMultiDragEnd) onMultiDragEnd(dx, dy, el.id);
    },
    onTransformEnd: groupTransformEnd,
    onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      onContextMenu(el.id, (e.evt as unknown as MouseEvent).clientX, (e.evt as unknown as MouseEvent).clientY);
    },
  };

  const commonProps = {
    name: el.id,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation || 0,
    opacity: el.opacity ?? 1,
    scaleX: el.flipX ? -1 : 1,
    scaleY: el.flipY ? -1 : 1,
    offsetX: el.flipX ? el.width : 0,
    offsetY: el.flipY ? el.height : 0,
    draggable: elementDraggable && !el.id.startsWith('bg-') && isPanningImage !== el.id,
    listening: elementListening && !el.id.startsWith('bg-'),
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onSelect(e),
    onTap: () => onSelect(),
    onDblClick: () => {
      if (el.type === 'text' && !el.locked && activeTool === 'select' && onDblClickText) onDblClickText();
      if (el.type === 'image' && !el.locked && activeTool === 'select') {
        usePresentationStore.getState().setEditorState({ isPanningImage: el.id });
      }
    },
    onDblTap: () => {
      if (el.type === 'text' && !el.locked && activeTool === 'select' && onDblClickText) onDblClickText();
      if (el.type === 'image' && !el.locked && activeTool === 'select') {
        usePresentationStore.getState().setEditorState({ isPanningImage: el.id });
      }
    },
    onDragStart: () => {
      dragStartPosRef.current = { x: el.x, y: el.y };
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      if (onDragMoveSnapping && !e.evt.shiftKey) {
        const node = e.target;
        const w = node.width() * node.scaleX();
        const h = node.height() * node.scaleY();
        const snapped = onDragMoveSnapping(el.id, node.x(), node.y(), w, h);
        if (snapped) {
          node.x(snapped.x);
          node.y(snapped.y);
        }
      }
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      if (onDragEndSnapping) onDragEndSnapping();
      const s = applySnap(e.target.x(), e.target.y());
      const dx = s.x - (dragStartPosRef.current?.x ?? el.x);
      const dy = s.y - (dragStartPosRef.current?.y ?? el.y);
      dragStartPosRef.current = null;
      onChange({ x: s.x, y: s.y }, true);
      // Move all other selected elements by the same delta
      if (onMultiDragEnd) onMultiDragEnd(dx, dy, el.id);
    },
    onTransformEnd: () => {
      const node = shapeRef.current!;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(el.flipX ? -1 : 1);
      node.scaleY(el.flipY ? -1 : 1);
      
      const newWidth = Math.max(MIN_PLACE, el.width * Math.abs(scaleX));
      const newHeight = Math.max(MIN_PLACE, el.height * Math.abs(scaleY));
      
      const newScaleXSign = scaleX < 0 ? -1 : 1;
      const oldScaleXSign = el.flipX ? -1 : 1;
      const flippedX = newScaleXSign !== oldScaleXSign;
      const nextFlipX = flippedX ? !el.flipX : !!el.flipX;

      const newScaleYSign = scaleY < 0 ? -1 : 1;
      const oldScaleYSign = el.flipY ? -1 : 1;
      const flippedY = newScaleYSign !== oldScaleYSign;
      const nextFlipY = flippedY ? !el.flipY : !!el.flipY;

      const s = applySnap(node.x(), node.y(), newWidth, newHeight);
      onChange(
        {
          x: s.x,
          y: s.y,
          width: s.width ?? newWidth,
          height: s.height ?? newHeight,
          rotation: node.rotation(),
          flipX: nextFlipX,
          flipY: nextFlipY,
        },
        true,
      );
    },
    onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      onContextMenu(el.id, (e.evt as unknown as MouseEvent).clientX, (e.evt as unknown as MouseEvent).clientY);
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
      const statusTitle = awaitingPrompt ? (aiSlot ? 'Generating masterpiece...' : 'Generative fill') : 'Rendering';
      const statusSub = awaitingPrompt
        ? aiSlot
          ? 'Applying AI models and polishing details'
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
          <Rect x={0} y={0} width={el.width} height={el.height} fill="transparent" listening={elementListening} />
          {!activeMedia && activeMediaStatus !== 'failed' && (
            <Group listening={false}>
              <Rect
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fill="rgba(241, 245, 249, 0.95)"
                shadowColor="rgba(15,23,42,0.08)"
                shadowBlur={16}
                shadowOffsetY={4}
                cornerRadius={!el.maskType || el.maskType === 'square' || el.maskType === 'none' ? 12 : 0}
              />
              <Rect
                ref={genFillBorderRef}
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fill="transparent"
                stroke="#5B7CFF"
                strokeWidth={1.5}
                opacity={0.7}
                cornerRadius={!el.maskType || el.maskType === 'square' || el.maskType === 'none' ? 12 : 0}
                dash={[6, 6]}
              />
              {aiSlot ? (
                <Group x={el.width / 2} y={el.height / 2 - 20}>
                  <Circle
                    ref={glowRef as React.RefObject<Konva.Circle>}
                    radius={16}
                    fill="rgba(91,124,255,0.15)"
                    shadowBlur={20}
                    shadowColor="#5B7CFF"
                  />
                  <Arc
                    ref={spinnerRef as React.RefObject<Konva.Arc>}
                    innerRadius={8}
                    outerRadius={11}
                    angle={270}
                    fill="#5B7CFF"
                    lineCap="round"
                  />
                </Group>
              ) : (
                <Text
                  x={0}
                  y={el.height / 2 - 26}
                  width={el.width}
                  text="✦"
                  fill="#5B7CFF"
                  fontSize={20}
                  align="center"
                  fontFamily="Inter"
                />
              )}
              <Text
                x={0}
                y={el.height / 2 - 2}
                width={el.width}
                text={statusTitle}
                fill="rgba(15,23,42,0.9)"
                fontSize={13}
                align="center"
                fontFamily="Inter"
                fontStyle="600"
              />
              <Text
                x={0}
                y={el.height / 2 + 18}
                width={el.width}
                text={statusSub}
                fill="rgba(100,116,139,0.8)"
                fontSize={10}
                align="center"
                fontFamily="Inter"
              />
            </Group>
          )}
          {!activeMedia && activeMediaStatus === 'failed' && displayImgSrc && (
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
          {activeMedia && (
            <KonvaImage
              image={activeMedia}
              x={0}
              y={0}
              width={el.width}
              height={el.height}
              {...getObjectFitCoverCrop(activeMedia as any, el.width, el.height, el.cropPositionX, el.cropPositionY)}
              draggable={isPanningImage === el.id}
              dragBoundFunc={(pos) => {
                if (isPanningImage === el.id) return { x: 0, y: 0 };
                return pos;
              }}
              onDragStart={(e) => {
                if (isPanningImage !== el.id) return;
                e.cancelBubble = true;
                panStartRef.current = {
                  pointerX: e.evt.clientX,
                  pointerY: e.evt.clientY,
                  cropX: el.cropPositionX ?? 0.5,
                  cropY: el.cropPositionY ?? 0.5,
                };
              }}
              onDragMove={(e) => {
                if (isPanningImage !== el.id || !panStartRef.current) return;
                e.cancelBubble = true;
                
                const dx = e.evt.clientX - panStartRef.current.pointerX;
                const dy = e.evt.clientY - panStartRef.current.pointerY;

                const media = activeMedia as any;
                const naturalWidth = media.naturalWidth || media.videoWidth || media.width;
                const naturalHeight = media.naturalHeight || media.videoHeight || media.height;
                const imageRatio = naturalWidth / naturalHeight;
                const boxRatio = el.width / el.height;
                
                let scaledWidth = el.width;
                let scaledHeight = el.height;
                
                if (imageRatio > boxRatio) {
                  scaledWidth = el.height * imageRatio;
                } else {
                  scaledHeight = el.width / imageRatio;
                }

                const overflowX = Math.max(0.1, scaledWidth - el.width);
                const overflowY = Math.max(0.1, scaledHeight - el.height);

                const scale = e.target.getAbsoluteScale().x;

                let newCropX = panStartRef.current.cropX - (dx / (overflowX * scale));
                let newCropY = panStartRef.current.cropY - (dy / (overflowY * scale));
                
                newCropX = Math.max(0, Math.min(1, newCropX));
                newCropY = Math.max(0, Math.min(1, newCropY));

                onChange({ cropPositionX: newCropX, cropPositionY: newCropY });
              }}
              onDragEnd={(e) => {
                if (isPanningImage !== el.id) return;
                e.cancelBubble = true;
                panStartRef.current = null;
              }}
            />
          )}

          {/* AI Animating Overlay */}
          {activeMedia && el.aiImagePending && (
            <Group listening={false}>
              <Rect
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fill="rgba(15,23,42,0.6)"
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
                text="Animating"
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
                text="Generating motion... this may take 1-2 minutes"
                fill="rgba(148,163,184,0.85)"
                fontSize={9}
                align="center"
                fontFamily="Inter"
              />
            </Group>
          )}

          {/* Centered Move Handle when in Pan Mode */}
          {activeMedia && isPanningImage === el.id && (
            <Group 
              x={el.width / 2} 
              y={el.height / 2}
              draggable={true}
              onDragStart={(e) => {
                e.cancelBubble = true;
                panStartRef.current = {
                  pointerX: e.evt.clientX,
                  pointerY: e.evt.clientY,
                  cropX: el.cropPositionX ?? 0.5,
                  cropY: el.cropPositionY ?? 0.5,
                };
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                if (!panStartRef.current) return;
                
                // Visual reset: keep the handle perfectly in the center
                e.target.x(el.width / 2);
                e.target.y(el.height / 2);

                const dx = e.evt.clientX - panStartRef.current.pointerX;
                const dy = e.evt.clientY - panStartRef.current.pointerY;

                const media = activeMedia as any;
                const naturalWidth = media.naturalWidth || media.videoWidth || media.width;
                const naturalHeight = media.naturalHeight || media.videoHeight || media.height;
                const imageRatio = naturalWidth / naturalHeight;
                const boxRatio = el.width / el.height;
                
                let scaledWidth = el.width;
                let scaledHeight = el.height;
                if (imageRatio > boxRatio) scaledWidth = el.height * imageRatio;
                else scaledHeight = el.width / imageRatio;

                const overflowX = Math.max(0.1, scaledWidth - el.width);
                const overflowY = Math.max(0.1, scaledHeight - el.height);

                const scale = e.target.getAbsoluteScale().x;

                let newCropX = panStartRef.current.cropX - (dx / (overflowX * scale));
                let newCropY = panStartRef.current.cropY - (dy / (overflowY * scale));
                
                newCropX = Math.max(0, Math.min(1, newCropX));
                newCropY = Math.max(0, Math.min(1, newCropY));

                onChange({ cropPositionX: newCropX, cropPositionY: newCropY });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                panStartRef.current = null;
                e.target.x(el.width / 2);
                e.target.y(el.height / 2);
              }}
            >
              <Circle radius={22} fill="#ffffff" shadowColor="black" shadowBlur={12} shadowOpacity={0.2} shadowOffset={{x:0, y:3}} />
              <Circle radius={20} fill="#4f46e5" />
              <Path data="M 5 9 L 2 12 L 5 15 M 9 5 L 12 2 L 15 5 M 19 9 L 22 12 L 19 15 M 15 19 L 12 22 L 9 19 M 2 12 L 22 12 M 12 2 L 12 22" stroke="white" strokeWidth={2} lineCap="round" lineJoin="round" x={-12} y={-12} />
            </Group>
          )}
        </Group>
      );
    }

    if (el.type === 'draw') {
      const style = el.shapeStyle || {};
      return (
        <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
          <Line
            points={el.points || []}
            stroke={style.stroke || '#fff'}
            strokeWidth={style.strokeWidth || 4}
            tension={0.55}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={false}
          />
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

      if (el.shapeType === 'path') {
        return (
          <Group ref={shapeRef as React.RefObject<Konva.Group>} {...commonGroup} width={el.width} height={el.height}>
            <Path
              data={el.content || ''}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              scaleX={el.width / 100}
              scaleY={el.height / 100}
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

  return renderShape();
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
  const bgUrl = bgImageUrl?.trim() || '';
  const [bgImg] = useImage(editorImageFetchUrl(bgUrl), 'anonymous');
  const heroOpacity = typeof bgImageOpacity === 'number' ? bgImageOpacity : 0.18;

  return (
    <>
      <Rect name={SLIDE_BG_NAME} x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={bg} />

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
  if (tool === 'image') return 'copy';
  return 'crosshair';
}

// ─── Main Konva Canvas ────────────────────────────────────────────────────────
export function KonvaCanvas({ scale }: { scale: number }) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; targetId: string | null }>({ visible: false, x: 0, y: 0, targetId: null });

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.visible) setContextMenu((prev) => ({ ...prev, visible: false }));
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu.visible]);
  /** Suppress the synthetic click after mouseup so we do not immediately deselect a newly placed element */
  const ignoreNextBgClickRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Expose stage globally so TopBar PDF export can call toDataURL()
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as Window & { __konvaStage?: typeof stageRef.current };
    win.__konvaStage = stageRef.current;
    return () => {
      delete win.__konvaStage;
    };
  }, []);

  const slide = usePresentationStore((s) => {
    const p = s.presentation;
    if (!p?.slides?.length) return undefined;
    return p.slides[s.currentSlideIndex];
  });

  const selectElement = usePresentationStore((s) => s.selectElement);
  const selectElements = usePresentationStore((s) => s.selectElements);
  const clearMultiSelection = usePresentationStore((s) => s.clearMultiSelection);
  const updateElement = usePresentationStore((s) => s.updateElement);
  const addElement    = usePresentationStore((s) => s.addElement);
  const removeElement = usePresentationStore((s) => s.removeElement);
  const { activeTool, selectedElementId, selectedElementIds, previewElementId, snapToGrid, gridSize } = usePresentationStore(
    useShallow((s) => ({
      activeTool: s.editor.activeTool,
      selectedElementId: s.editor.selectedElementId,
      selectedElementIds: s.editor.selectedElementIds,
      previewElementId: s.editor.previewElementId,
      snapToGrid: s.editor.snapToGrid,
      gridSize: s.editor.gridSize,
    })),
  );
  const colorPalette = usePresentationStore((s) => s.presentation?.colorPalette ?? []);
  const generationBuildReveal = usePresentationStore((s) => s.editor.generationBuildReveal);
  const isGenerating = usePresentationStore((s) => s.editor.isGenerating);
  const generationRevealedSlides = usePresentationStore(
    (s) => s.editor.generationRevealedSlides ?? [],
  );

  const revealEnabled = Boolean(generationBuildReveal && isGenerating && slide);
  const slideAlreadyRevealed = slide ? generationRevealedSlides.includes(slide.id) : false;
  const { isElementVisible } = useGenerationElementReveal({
    slideId: slide?.id ?? '',
    elements: slide?.elements ?? [],
    enabled: revealEnabled,
    slideAlreadyRevealed,
  });

  const { smartGuides, handleDragMoveSnapping, handleDragEndSnapping } = useSmartGuides({
    slideElements: slide?.elements,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  });

  const getPointer = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => getSlidePointerFromEvent(e, STAGE_PADDING),
    [],
  );

  const drawTool = useDrawTool({ activeTool, getPointer });
  const shapeTool = useShapePlacementTool({
    activeTool,
    getPointer,
    ignoreNextBgClickRef,
    onTextPlaced: setEditingTextId,
  });
  const { handleStageClick, createElementSelectHandler } = useCanvasSelection({
    activeTool,
    ignoreNextBgClickRef,
    onClearTextEdit: () => setEditingTextId(null),
  });

  const handleContextMenu = useCallback((id: string, x: number, y: number) => {
    selectElement(id);
    setContextMenu({ visible: true, x, y, targetId: id });
  }, [selectElement]);

  // ── Canvas-only keyboard shortcuts (undo/copy/delete live in useKeyboardShortcuts) ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      const store = usePresentationStore.getState();
      const sel = store.editor.selectedElementId;
      const currentSlide = store.presentation?.slides[store.currentSlideIndex];

      if (e.key === 'Escape') {
        selectElement(null);
        clearMultiSelection();
        setEditingTextId(null);
        return;
      }

      if (!sel || !currentSlide) return;
      const selectedEl = currentSlide.elements?.find((el) => el.id === sel);
      if (!selectedEl) return;

      // Arrow keys → nudge selected element
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        updateElement(currentSlide.id, sel, {
          x: Math.max(0, Math.min(1280 - selectedEl.width, selectedEl.x + dx)),
          y: Math.max(0, Math.min(720 - selectedEl.height, selectedEl.y + dy)),
        });
        return;
      }

      // Ctrl+] → bring forward  /  Ctrl+[ → send backward
      if (mod && (e.key === ']' || e.key === '[')) {
        e.preventDefault();
        store.reorderElements(currentSlide.id, sel, e.key === ']' ? 'up' : 'down', true);
        return;
      }

      // Ctrl+A → select all elements on current slide
      if (mod && e.key === 'a') {
        e.preventDefault();
        const allIds = currentSlide.elements
          ?.filter((el) => !el.id.startsWith('bg-') && el.visible !== false)
          .map((el) => el.id) ?? [];
        if (allIds.length > 0) store.selectElements(allIds);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectElement, clearMultiSelection, updateElement]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isSlideBackgroundTarget(e.target)) return;
    const pos = getPointer(e);
    if (!pos) return;
    if (drawTool.onMouseDown(e, pos)) return;
    shapeTool.onMouseDown(e, pos);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getPointer(e);
    if (!pos) return;
    if (drawTool.onMouseMove(e, pos)) return;
    shapeTool.onMouseMove(e, pos);
  };

  const handleMouseUp = () => {
    const store = usePresentationStore.getState();
    const s = store.presentation?.slides[store.currentSlideIndex];
    if (!s) {
      drawTool.resetStroke();
      shapeTool.clearPlacement();
      return;
    }

    const palette = store.presentation?.colorPalette || ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'];
    const accent = palette[2] || '#38BDF8';
    const z = (s.elements?.length || 0) + 1;

    if (
      drawTool.onMouseUp(accent, (payload) => {
        store.addElement(s.id, {
          id: payload.id,
          type: 'draw',
          x: payload.x,
          y: payload.y,
          width: payload.width,
          height: payload.height,
          points: payload.points,
          zIndex: payload.zIndex,
          visible: true,
          opacity: 1,
          locked: false,
          shapeStyle: {
            stroke: payload.stroke,
            strokeWidth: payload.strokeWidth,
          },
        });
      }, z)
    ) {
      return;
    }

    shapeTool.onMouseUp();
  };

  const bgEl = slide ? findDeckBackgroundElement(slide.elements) : undefined;
  const elements = (slide?.elements || []).filter((el) => el !== bgEl);

  useEffect(() => {
    if (trRef.current && stageRef.current) {
      const selectedNodes = selectedElementIds
        .map(id => stageRef.current!.findOne(`.${id}`))
        .filter((node): node is Konva.Node => !!node);
      trRef.current.nodes(selectedNodes);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedElementIds, elements]);

  if (!mounted || !slide) return null;

  return (
    <div
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'relative',
        backgroundColor: colorPalette[0] || '#05050A',
        cursor: placementCursor(activeTool),
        // The Stage is larger than the slide by STAGE_PADDING on each side.
        // We use a negative margin to pull the Stage into position so the
        // visual slide area is still top-left of the wrapper.
        overflow: 'visible',
      }}
    >
      {/* Stage is padded so transformer anchors can render outside the slide boundary */}
      <div style={{ position: 'absolute', top: -STAGE_PADDING, left: -STAGE_PADDING, pointerEvents: 'none' }}>
        <Stage
          ref={stageRef}
          width={CANVAS_WIDTH + STAGE_PADDING * 2}
          height={CANVAS_HEIGHT + STAGE_PADDING * 2}
          onClick={handleStageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ pointerEvents: 'auto' }}
        >
          <Layer 
            offsetX={-STAGE_PADDING} 
            offsetY={-STAGE_PADDING}
            clipX={0}
            clipY={0}
            clipWidth={CANVAS_WIDTH}
            clipHeight={CANVAS_HEIGHT}
          >
          <SlideBackground
            colors={colorPalette}
            bgImageUrl={bgEl?.src}
            bgImageOpacity={bgEl?.opacity}
          />
          {elements.map((el) => {
            const isMultiSelected = selectedElementIds.includes(el.id);
            return (
              <ElementNode
                key={el.id}
                el={el}
                isSelected={selectedElementId === el.id || (selectedElementIds.length > 1 && isMultiSelected)}
                onSelect={createElementSelectHandler(el.id)}
                onChange={(updates, save) => updateElement(slide.id, el.id, updates, save)}
                activeTool={activeTool}
                isEditingText={editingTextId === el.id}
                onDblClickText={() => {
                  usePresentationStore.getState().pushHistory();
                  setEditingTextId(el.id);
                }}
                previewElementId={previewElementId}
                generationRevealActive={revealEnabled && !slideAlreadyRevealed}
                revealVisible={isElementVisible(el.id)}
                snapToGrid={snapToGrid}
                gridSize={gridSize}
                onContextMenu={handleContextMenu}
                onDragMoveSnapping={handleDragMoveSnapping}
                onDragEndSnapping={handleDragEndSnapping}
                onMultiDragEnd={(dx, dy, sourceId) => {
                  // Move all OTHER selected elements by the same delta
                  const store = usePresentationStore.getState();
                  const ids = store.editor.selectedElementIds;
                  if (ids.length < 2) return;
                  const s = store.presentation?.slides[store.currentSlideIndex];
                  if (!s) return;
                  ids.filter((id) => id !== sourceId).forEach((id) => {
                    const target = s.elements?.find((e) => e.id === id);
                    if (!target || target.locked) return;
                    store.updateElement(s.id, id, {
                      x: Math.max(0, Math.min(1280 - target.width, target.x + dx)),
                      y: Math.max(0, Math.min(720 - target.height, target.y + dy)),
                    }, false);
                  });
                }}
              />
            );
          })}
          </Layer>
          {/* Overlay layer for unclipped items like transformers and guides */}
          <Layer offsetX={-STAGE_PADDING} offsetY={-STAGE_PADDING}>
            <Transformer
              ref={trRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < MIN_PLACE || newBox.height < MIN_PLACE) return oldBox;
                return newBox;
              }}
              rotateEnabled
              keepRatio={false}
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
              anchorFill="#ffffff"
              anchorStroke="#6366f1"
              anchorStrokeWidth={2}
              anchorSize={10}
              anchorCornerRadius={3}
              borderStroke="#6366f1"
              borderStrokeWidth={1.5}
              borderDash={[]}
              padding={6}
              rotateAnchorOffset={24}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            />
          {/* ── Smart alignment guides ────────────────────────────────────── */}
          <GuidesOverlay
            guides={smartGuides}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
          />
          {drawTool.previewPoints && drawTool.previewPoints.length >= 4 && (
            <Line
              points={drawTool.previewPoints}
              stroke="#38BDF8"
              strokeWidth={4}
              tension={0.55}
              lineCap="round"
              lineJoin="round"
              perfectDrawEnabled={false}
              listening={false}
            />
          )}
          {shapeTool.drawingRect && (
            <Rect
              x={shapeTool.drawingRect.w < 0 ? shapeTool.drawingRect.x + shapeTool.drawingRect.w : shapeTool.drawingRect.x}
              y={shapeTool.drawingRect.h < 0 ? shapeTool.drawingRect.y + shapeTool.drawingRect.h : shapeTool.drawingRect.y}
              width={Math.abs(shapeTool.drawingRect.w)}
              height={Math.abs(shapeTool.drawingRect.h)}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38BDF8"
              strokeWidth={1.5}
              dash={[8, 6]}
              listening={false}
            />
          )}
        </Layer>
        </Stage>
      </div>

      {/* ── Text inline editor overlay ────────────────────────────────────── */}
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

      {/* ── Context Menu Overlay ────────────────────────────────────────── */}
      {contextMenu.visible && contextMenu.targetId && (() => {
        const ctxEl = slide.elements?.find(el => el.id === contextMenu.targetId);
        return (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 9999,
            }}
            className="bg-white border border-neutral-200 shadow-xl rounded-lg py-1 w-52 text-sm text-neutral-800 overflow-hidden"
            onContextMenu={(e) => e.preventDefault()}
          >
            <button
              className="w-full text-left px-4 py-2 hover:bg-neutral-100 transition-colors flex items-center justify-between"
              onClick={(e) => { e.stopPropagation(); usePresentationStore.getState().setElementsOrder(slide.id, [contextMenu.targetId!, ...(slide.elements || []).map(el => el.id).filter(id => id !== contextMenu.targetId)], true); setContextMenu(prev => ({ ...prev, visible: false })); }}
            >
              Bring to Front
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-neutral-100 transition-colors flex items-center justify-between"
              onClick={(e) => { e.stopPropagation(); usePresentationStore.getState().setElementsOrder(slide.id, [...(slide.elements || []).map(el => el.id).filter(id => id !== contextMenu.targetId), contextMenu.targetId!], true); setContextMenu(prev => ({ ...prev, visible: false })); }}
            >
              Send to Back
            </button>
            <div className="h-px bg-neutral-100 my-1" />
            <button
              className="w-full text-left px-4 py-2 hover:bg-neutral-100 transition-colors flex items-center justify-between"
              onClick={(e) => { e.stopPropagation(); usePresentationStore.getState().duplicateElement(slide.id, contextMenu.targetId!); setContextMenu(prev => ({ ...prev, visible: false })); }}
            >
              Duplicate <span className="text-neutral-400 text-xs">Ctrl+D</span>
            </button>
            <button
              className={`w-full text-left px-4 py-2 transition-colors flex items-center justify-between ${ctxEl?.locked ? 'hover:bg-amber-50 text-amber-700' : 'hover:bg-neutral-100'}`}
              onClick={(e) => { e.stopPropagation(); updateElement(slide.id, contextMenu.targetId!, { locked: !ctxEl?.locked }, true); setContextMenu(prev => ({ ...prev, visible: false })); }}
            >
              {ctxEl?.locked ? 'Unlock' : 'Lock'} <span className="text-neutral-400 text-xs">{ctxEl?.locked ? '🔓' : '🔒'}</span>
            </button>
            <div className="h-px bg-neutral-100 my-1" />
            <button
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition-colors flex items-center justify-between"
              onClick={(e) => { e.stopPropagation(); removeElement(slide.id, contextMenu.targetId!); setContextMenu(prev => ({ ...prev, visible: false })); }}
            >
              Delete <span className="text-red-400 text-xs">Del</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
}
