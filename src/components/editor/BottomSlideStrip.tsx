'use client';

import { usePresentationStore } from '@/store/usePresentationStore';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { findDeckBackgroundElement } from '@/lib/slide-background';
import { editorImageFetchUrl } from '@/lib/r2-public-url';
import type { Slide } from '@/types';

function HorizThumb({
  slide, index, isActive, onClick, colorBg,
}: {
  slide: Slide; index: number; isActive: boolean; onClick: () => void; colorBg: string;
}) {
  const bgEl = findDeckBackgroundElement(slide.elements);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 rounded-md overflow-hidden transition-all duration-200 touch-manipulation"
      style={{
        width: 80,
        height: 45,
        background: colorBg,
        outline: isActive ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.1)',
        outlineOffset: isActive ? 1 : 0,
      }}
    >
      {bgEl?.src && (
        <img
          src={editorImageFetchUrl(bgEl.src)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18 }}
        />
      )}
      {/* Mini element preview */}
      <div
        className="absolute top-0 left-0"
        style={{ width: 1280, height: 720, transform: 'scale(0.0625)', transformOrigin: '0 0', pointerEvents: 'none' }}
      >
        {(slide.elements || []).filter(el => el.visible !== false && el !== bgEl).slice(0, 8).map(el => {
          if (el.type === 'text' && el.content) {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height,
                  fontSize: el.textStyle?.fontSize || 24, color: el.textStyle?.color || '#fff',
                  fontWeight: el.textStyle?.fontWeight || 'normal',
                  overflow: 'visible', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  overflowWrap: 'anywhere', margin: 0, padding: 0,
                  transform: el.rotation ? `rotate(${el.rotation}deg) translateY(-0.1em)` : 'translateY(-0.1em)',
                  lineHeight: el.textStyle?.lineHeight || 1.4,
                }}
              >
                {el.content}
              </div>
            );
          }
          if (el.type === 'shape') {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height,
                  background: el.shapeStyle?.fill || '#7B61FF',
                  borderRadius: el.shapeType === 'circle' ? '50%' : el.shapeStyle?.cornerRadius || 0,
                  border: el.shapeStyle?.strokeWidth && el.shapeStyle?.stroke ? `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.stroke}` : 'none',
                  boxSizing: 'border-box',
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  opacity: el.opacity ?? 1,
                }}
              />
            );
          }
          if (el.type === 'image' && el.src) {
            return (
              <img key={el.id} src={editorImageFetchUrl(el.src)} alt=""
                style={{ position: 'absolute', left: el.x, top: el.y, width: el.width, height: el.height, objectFit: 'cover', opacity: el.opacity ?? 1 }}
              />
            );
          }
          return null;
        })}
      </div>
      {/* Slide number */}
      <div className="absolute bottom-0.5 right-1 text-[7px] font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {index + 1}
      </div>
      {/* Active indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500" />
      )}
    </button>
  );
}

export function BottomSlideStrip() {
  const presentation     = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const setCurrentSlideIndex = usePresentationStore((s) => s.setCurrentSlideIndex);
  const addSlide         = usePresentationStore((s) => s.addSlide);
  const isGenerating     = usePresentationStore((s) => s.editor.isGenerating);

  const slides   = presentation?.slides || [];
  const colorBg  = presentation?.colorPalette?.[0] || '#05050A';

  const goToPrev = () => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
  const goToNext = () => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1));

  const handleAdd = () => {
    if (isGenerating) return;
    addSlide({
      id: `slide-${Date.now()}`,
      type: 'hero',
      title: 'New Slide',
      subtitle: '',
      bullets: [],
      elements: [],
      animation: { entrance: 'fadeSlideUp', duration: 1000 },
    } as Slide);
  };

  if (!slides.length) return null;

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4"
      style={{
        height: 68,
        background: '#ffffff',
        borderTop: '1px solid #e5e7eb',
      }}
    >
      {/* Prev */}
      <button
        type="button"
        onClick={goToPrev}
        disabled={currentSlideIndex === 0}
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
        style={{ color: '#6b7280', background: '#f3f4f6' }}
      >
        <ChevronLeft size={15} />
      </button>

      {/* Scrollable thumbnails */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        {slides.map((slide, i) => (
          <HorizThumb
            key={slide.id}
            slide={slide}
            index={i}
            isActive={i === currentSlideIndex}
            colorBg={colorBg}
            onClick={() => setCurrentSlideIndex(i)}
          />
        ))}
        {/* Add slide */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={isGenerating}
          className="shrink-0 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            width: 34, height: 45,
            border: '1px dashed rgba(0,0,0,0.15)',
            color: '#9ca3af',
          }}
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Slide counter + Next */}
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: '#9ca3af' }}>
          Slide {currentSlideIndex + 1} of {slides.length}
        </span>
        <button
          type="button"
          onClick={goToNext}
          disabled={currentSlideIndex >= slides.length - 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-20"
          style={{ color: '#6b7280', background: '#f3f4f6' }}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
