/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Trash2, Copy, GripVertical, ChevronUp, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { Slide } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';
import { editorImageFetchUrl } from '@/lib/r2-public-url';
import { VirtualColumn } from '@/components/ui/VirtualColumn';

const SLIDE_WIDTH = 160;
const SLIDE_HEIGHT = 90;

function statusLabel(status?: Slide['generationStatus'], isPlaceholder?: boolean): string {
  if (!isPlaceholder) return '';
  switch (status) {
    case 'composing':
      return 'Composing…';
    case 'visuals':
      return 'Rendering visuals…';
    case 'ready':
      return 'Ready';
    default:
      return 'Queued';
  }
}

function SlideThumbnail({ slide, index, colors }: { slide: Slide; index: number; colors: string[] }) {
  const isPlaceholder = Boolean(slide.isGeneratingPlaceholder);
  const scale = 160 / 1280;
  const bg = colors[0] || '#05050A';
  const accent = colors[2] || '#7B61FF';
  const bgEl = findDeckBackgroundElement(slide.elements);
  const visibleEls = (slide.elements || []).filter((el) => el.visible !== false && el !== bgEl);

  if (isPlaceholder) {
    return (
      <motion.div
        className="w-full rounded-md overflow-hidden relative"
        style={{ aspectRatio: '16/9', border: '1px solid rgba(59,130,246,0.25)' }}
        animate={{ opacity: slide.generationStatus === 'composing' ? [0.72, 1, 0.72] : 1 }}
        transition={{ duration: 1.6, repeat: slide.generationStatus === 'composing' ? Infinity : 0 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${bg} 0%, ${accent}22 50%, ${bg} 100%)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
          {slide.generationStatus === 'composing' ? (
            <Loader2 size={18} className="text-primary animate-spin" />
          ) : (
            <Sparkles size={18} className="text-primary/70" />
          )}
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/80">
            {statusLabel(slide.generationStatus, true)}
          </p>
          {slide.title && (
            <p className="text-[10px] font-semibold text-white/60 line-clamp-2">{slide.title}</p>
          )}
        </div>
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-primary"
          initial={{ width: '0%' }}
          animate={{
            width: slide.generationStatus === 'ready' ? '100%' : slide.generationStatus === 'composing' ? '55%' : '12%',
          }}
          transition={{ duration: 0.5 }}
        />
        <div
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-primary/90 text-[7px] font-bold uppercase tracking-wider text-white"
        >
          Live
        </div>
        <div
          className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[7px] font-bold text-white/70 backdrop-blur-sm"
        >
          {index + 1}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full rounded-none overflow-hidden relative"
      style={{ aspectRatio: '16/9', border: '1px solid rgba(0,0,0,0.1)' }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="absolute inset-0" style={{ background: bg }} />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accent}33 0%, transparent 50%, ${accent}22 100%)`,
        }}
      />
      {bgEl?.src && (
        <img
          src={editorImageFetchUrl(bgEl.src)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18, pointerEvents: 'none', maxWidth: 'none' }}
        />
      )}
      <div
        className="absolute top-0 left-0"
        style={{
          width: '1280px',
          height: '720px',
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      >
        {visibleEls.map((el) => {
          if (el.type === 'text' && el.content) {
            const defaultFontSize = el.textStyle?.fontSize || 24;
            let computedFontSize = defaultFontSize;
            if (el.content && el.content.length > 40 && el.width && el.height) {
              const estimatedMaxFontSize = Math.sqrt((el.width * el.height) / (el.content.length * 0.65));
              computedFontSize = Math.max(9, Math.min(defaultFontSize, Math.floor(estimatedMaxFontSize)));
            }

            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  fontSize: computedFontSize,
                  color: el.textStyle?.color || '#FFFFFF',
                  fontWeight: el.textStyle?.fontWeight || 'normal',
                  fontStyle: el.textStyle?.fontStyle || 'normal',
                  fontFamily: el.textStyle?.fontFamily || 'Inter, sans-serif',
                  textAlign: (el.textStyle?.textAlign as React.CSSProperties['textAlign']) || 'left',
                  lineHeight: el.textStyle?.lineHeight || 1.4,
                  opacity: el.opacity ?? 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  overflow: 'visible',
                  margin: 0,
                  padding: 0,
                  transform: el.rotation ? `rotate(${el.rotation}deg) translateY(-0.1em)` : `translateY(-0.1em)`,
                }}
              >
                {el.content}
              </motion.div>
            );
          }
          if (el.type === 'shape') {
            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  background: el.shapeStyle?.fill || '#7B61FF',
                  border: el.shapeStyle?.strokeWidth && el.shapeStyle?.stroke ? `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.stroke}` : 'none',
                  borderRadius: el.shapeStyle?.cornerRadius ? `${el.shapeStyle.cornerRadius}px` : undefined,
                  boxSizing: 'border-box',
                  opacity: el.opacity ?? 1,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                }}
              />
            );
          }
          if (el.type === 'image' && el.src) {
            const src = editorImageFetchUrl(el.src);
            const isVideo = src.split('?')[0].endsWith('.mp4');
            const style = {
              position: 'absolute' as const,
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              objectFit: 'cover' as const,
              maxWidth: 'none',
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            };

            if (isVideo) {
              return (
                <motion.video
                  key={el.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: el.opacity ?? 1 }}
                  src={src}
                  style={style}
                  muted
                  playsInline
                  loop
                  autoPlay
                />
              );
            }

            return (
              <motion.img
                key={el.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: el.opacity ?? 1 }}
                src={src}
                alt=""
                style={style}
              />
            );
          }
          return null;
        })}
      </div>
      {slide.generationStatus === 'visuals' && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-sky-500/90 text-[7px] font-bold uppercase tracking-wider text-white flex items-center gap-1">
          <Loader2 size={8} className="animate-spin" />
          Visuals
        </div>
      )}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-white/70 text-[7px] font-bold text-neutral-800 backdrop-blur-sm shadow-sm">
        {index + 1}
      </div>
    </motion.div>
  );
}

type SlideRailItemProps = {
  slide: Slide;
  index: number;
  colors: string[];
  isActive: boolean;
  isHovered: boolean;
  isGenerating: boolean;
  onSelect: () => void;
  onHover: (index: number | null) => void;
  onReorderUp: () => void;
  onReorderDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  buildRevealEntrance?: boolean;
  buildRevealDelay?: number;
};

function SlideRailItem({
  slide,
  index,
  colors,
  isActive,
  isHovered,
  isGenerating,
  buildRevealEntrance = false,
  buildRevealDelay = 0,
  onSelect,
  onHover,
  onReorderUp,
  onReorderDown,
  onDuplicate,
  onRemove,
  canRemove,
  canMoveUp,
  canMoveDown,
}: SlideRailItemProps) {
  return (
    <motion.div
      layout="position"
      initial={
        buildRevealEntrance
          ? { opacity: 0, scale: 0.92, y: 8 }
          : { opacity: 0, y: 10 }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: buildRevealEntrance ? 0.38 : 0.3,
        ease: [0.16, 1, 0.3, 1],
        delay: buildRevealEntrance ? buildRevealDelay : 0,
      }}
      className="relative group w-[160px] mx-auto"
      onClick={onSelect}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.div
        className={`relative rounded-none overflow-hidden transition-all duration-300 shadow-sm ${
          isActive
            ? 'ring-2 ring-indigo-500'
            : 'hover:ring-1 hover:ring-neutral-300'
        }`}
      >
        <SlideThumbnail slide={slide} index={index} colors={colors} />

        <AnimatePresence>
          {isHovered && !isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3 z-30"
            >
              <motion.div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderUp();
                  }}
                  disabled={!canMoveUp}
                  className="w-9 h-9 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all disabled:opacity-20 flex items-center justify-center shadow-sm"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all flex items-center justify-center shadow-sm"
                >
                  <Copy size={16} />
                </button>
              </motion.div>
              <motion.div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderDown();
                  }}
                  disabled={!canMoveDown}
                  className="w-9 h-9 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all disabled:opacity-20 flex items-center justify-center shadow-sm"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 transition-all flex items-center justify-center shadow-sm"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div className="mt-2 flex items-center justify-between px-0.5 gap-1">
        <span
          className={`text-[9px] font-bold uppercase tracking-widest truncate ${
            isActive ? 'text-indigo-600' : 'text-neutral-500'
          }`}
        >
          {slide.isGeneratingPlaceholder
            ? statusLabel(slide.generationStatus, true)
            : `Slide ${String(index + 1).padStart(2, '0')}`}
        </span>
        {isActive && (
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

type SidebarProps = {
  drawerOpen?: boolean;
  onAfterSlideSelect?: () => void;
};

export function Sidebar({ drawerOpen = true, onAfterSlideSelect }: SidebarProps) {
  const {
    presentation,
    isGenerating,
    deckGenerationLifecycle,
    generationBuildReveal,
    generationTargetSlides,
    orchestrationPhase,
    activeModelLabel,
    orchestrationMessage,
    freeTasteActive,
    freeTasteImagesRemaining,
    currentSlideIndex,
    setCurrentSlideIndex,
    addSlide,
    removeSlide,
    duplicateSlide,
    reorderSlides,
  } = usePresentationStore(
    useShallow((s) => ({
      presentation: s.presentation,
      isGenerating: s.editor.isGenerating,
      deckGenerationLifecycle: s.editor.deckGenerationLifecycle,
      generationBuildReveal: s.editor.generationBuildReveal,
      generationTargetSlides: s.editor.generationTargetSlides,
      orchestrationPhase: s.editor.orchestrationPhase,
      activeModelLabel: s.editor.activeModelLabel,
      orchestrationMessage: s.editor.orchestrationMessage,
      freeTasteActive: s.editor.freeTasteActive,
      freeTasteImagesRemaining: s.editor.freeTasteImagesRemaining,
      currentSlideIndex: s.currentSlideIndex,
      setCurrentSlideIndex: s.setCurrentSlideIndex,
      addSlide: s.addSlide,
      removeSlide: s.removeSlide,
      duplicateSlide: s.duplicateSlide,
      reorderSlides: s.reorderSlides,
    }))
  );

  const editor = { isGenerating, deckGenerationLifecycle, generationBuildReveal, generationTargetSlides, orchestrationPhase, activeModelLabel, orchestrationMessage, freeTasteActive, freeTasteImagesRemaining };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const slides = presentation?.slides || [];
  const colors = presentation?.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
  const isLiveGenerating = editor.isGenerating && editor.deckGenerationLifecycle !== 'idle';
  const buildRevealActive = Boolean(editor.generationBuildReveal && editor.isGenerating);
  const targetSlides = Math.max(editor.generationTargetSlides || slides.length, slides.length);
  const useVirtualRail = !isLiveGenerating && slides.length > 24;
  const prevSlideIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    prevSlideIdsRef.current = new Set(slides.map((s) => s.id));
  }, [slides]);

  const renderSlideRailItem = (slide: Slide, index: number) => {
    const isNewSlide = buildRevealActive && !prevSlideIdsRef.current.has(slide.id);
    return (
    <SlideRailItem
      key={slide.id}
      slide={slide}
      index={index}
      colors={colors}
      isActive={index === currentSlideIndex}
      isHovered={hoveredIndex === index && !slide.isGeneratingPlaceholder}
      isGenerating={editor.isGenerating}
      buildRevealEntrance={isNewSlide}
      buildRevealDelay={isNewSlide ? index * 0.12 : 0}
      onSelect={() => {
        setCurrentSlideIndex(index);
        onAfterSlideSelect?.();
      }}
      onHover={setHoveredIndex}
      onReorderUp={() => reorderSlides(index, index - 1)}
      onReorderDown={() => reorderSlides(index, index + 1)}
      onDuplicate={() => duplicateSlide(slide.id)}
      onRemove={() => {
        if (slides.length > 1) removeSlide(slide.id);
      }}
      canRemove={slides.length > 1}
      canMoveUp={index > 0}
      canMoveDown={index < slides.length - 1}
    />
  );
  };

  const handleAddSlide = useCallback(() => {
    if (editor.isGenerating) return;
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      type: 'hero',
      title: 'Strategic Narrative',
      subtitle: 'Designing for impact',
      bullets: [],
      elements: [],
      animation: { entrance: 'fadeSlideUp', duration: 1000 },
    };
    addSlide(newSlide);
  }, [addSlide, editor.isGenerating]);

  return (
    <aside
      id="tour-gallery"
      className={`
        z-[130] w-[180px] shrink-0 border-r border-neutral-200 bg-neutral-50/50 flex flex-col overflow-hidden
        max-md:fixed max-md:left-0 max-md:top-[var(--editor-topbar-h,104px)]
        max-md:h-[calc(100dvh-var(--editor-topbar-h,104px)-env(safe-area-inset-bottom,0px))]
        max-md:w-[min(260px,88vw)] max-md:transition-transform max-md:duration-300 max-md:ease-[cubic-bezier(0.16,1,0.3,1)]
        pl-[max(0px,env(safe-area-inset-left,0px))]
        ${drawerOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        md:relative md:top-auto md:h-auto md:translate-x-0 md:pt-0
      `}
    >
      <motion.div layout className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-5 sm:py-8 gap-2 min-w-0">
        <motion.div className="flex flex-col min-w-0" layout>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.3em] truncate">
            Gallery
          </span>
          <h2 className="text-[clamp(15px,4vw,18px)] font-semibold text-neutral-900 tracking-tighter truncate">
            {isLiveGenerating ? 'Building deck' : `${slides.length} Slides`}
          </h2>
          {isLiveGenerating && (
            <motion.p
              className="mt-1 text-[10px] font-semibold text-primary/90 line-clamp-2"
              key={editor.orchestrationMessage || editor.orchestrationPhase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {editor.activeModelLabel
                ? `${editor.activeModelLabel} · `
                : ''}
              {editor.orchestrationMessage ||
                `Live ${slides.filter((s) => !s.isGeneratingPlaceholder).length} / ${targetSlides}`}
            </motion.p>
          )}
          {editor.freeTasteActive && isLiveGenerating && (
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600/90">
              Premium preview · {editor.freeTasteImagesRemaining ?? 0} HD visuals left
            </p>
          )}
        </motion.div>
        <button
          type="button"
          onClick={handleAddSlide}
          disabled={editor.isGenerating}
          className="w-10 h-10 min-w-10 shrink-0 flex items-center justify-center rounded-2xl bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 shadow-sm transition-all active:scale-[0.9] group touch-manipulation disabled:opacity-40"
          title="Add Slide"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </motion.div>

      <motion.div
        className={`flex-1 min-h-0 pt-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] custom-scrollbar ${
          useVirtualRail ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden space-y-5'
        }`}
        data-lenis-prevent
      >
        <AnimatePresence>
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center opacity-40 px-4">
              <motion.div
                className="w-12 h-12 rounded-2xl border-2 border-dashed border-neutral-300 mb-4"
                animate={{ rotate: 180 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                {isLiveGenerating ? 'Preparing slides…' : 'No Slides'}
              </p>
            </div>
          ) : useVirtualRail ? (
            <VirtualColumn
              items={slides}
              estimateSize={132}
              gap={20}
              className="h-full"
              getKey={(slide) => slide.id}
              renderItem={(slide, index) => renderSlideRailItem(slide, index)}
            />
          ) : (
            slides.map((slide, index) => renderSlideRailItem(slide, index))
          )}
        </AnimatePresence>
      </motion.div>
    </aside>
  );
}
