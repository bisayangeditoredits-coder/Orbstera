'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Plus, Trash2, Copy, GripVertical, ChevronUp, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { Slide } from '@/types';
import { findDeckBackgroundElement } from '@/lib/slide-background';
import { editorImageFetchUrl } from '@/lib/r2-public-url';

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
        <motion.div
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-primary/90 text-[7px] font-black uppercase tracking-wider text-white"
          layout
        >
          Live
        </motion.div>
        <motion.div
          className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[7px] font-bold text-white/70 backdrop-blur-sm"
          layout
        >
          {index + 1}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full rounded-md overflow-hidden relative"
      style={{ aspectRatio: '16/9', border: '1px solid rgba(255,255,255,0.08)' }}
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
          style={{ opacity: 0.18, pointerEvents: 'none' }}
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
                  fontSize: el.textStyle?.fontSize || 24,
                  color: el.textStyle?.color || '#FFFFFF',
                  fontWeight: el.textStyle?.fontWeight || 'normal',
                  fontStyle: el.textStyle?.fontStyle || 'normal',
                  fontFamily: el.textStyle?.fontFamily || 'Inter, sans-serif',
                  textAlign: (el.textStyle?.textAlign as React.CSSProperties['textAlign']) || 'left',
                  lineHeight: el.textStyle?.lineHeight || 1.4,
                  opacity: el.opacity ?? 1,
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
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
                  border: el.shapeStyle?.strokeWidth
                    ? `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.stroke || 'transparent'}`
                    : 'none',
                  borderRadius:
                    el.shapeType === 'circle'
                      ? '50%'
                      : el.shapeType === 'triangle'
                        ? '0'
                        : el.shapeStyle?.cornerRadius || 0,
                  opacity: el.opacity ?? 1,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                }}
              />
            );
          }
          if (el.type === 'image' && el.src) {
            return (
              <motion.img
                key={el.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: el.opacity ?? 1 }}
                src={editorImageFetchUrl(el.src)}
                alt=""
                style={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  objectFit: 'cover',
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                }}
              />
            );
          }
          return null;
        })}
      </div>
      {slide.generationStatus === 'visuals' && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-sky-500/90 text-[7px] font-black uppercase tracking-wider text-white flex items-center gap-1">
          <Loader2 size={8} className="animate-spin" />
          Visuals
        </div>
      )}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[7px] font-bold text-white/70 backdrop-blur-sm">
        {index + 1}
      </div>
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
    editor,
    currentSlideIndex,
    setCurrentSlideIndex,
    addSlide,
    removeSlide,
    duplicateSlide,
    reorderSlides,
  } = usePresentationStore();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const slides = presentation?.slides || [];
  const colors = presentation?.colorPalette || ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'];
  const isLiveGenerating = editor.isGenerating && editor.deckGenerationLifecycle !== 'idle';
  const targetSlides = Math.max(editor.generationTargetSlides || slides.length, slides.length);

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
        z-[130] w-[220px] shrink-0 border-r-2 border-black/[0.08] bg-[#FBFBFC] flex flex-col overflow-hidden shadow-[1px_0_10px_rgba(0,0,0,0.02)]
        max-md:fixed max-md:left-0 max-md:top-[var(--editor-topbar-h,104px)]
        max-md:h-[calc(100dvh-var(--editor-topbar-h,104px)-env(safe-area-inset-bottom,0px))]
        max-md:w-[min(260px,88vw)] max-md:transition-transform max-md:duration-300 max-md:ease-[cubic-bezier(0.16,1,0.3,1)]
        pl-[max(0px,env(safe-area-inset-left,0px))]
        ${drawerOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        md:relative md:top-auto md:h-auto md:translate-x-0 md:pt-0
      `}
    >
      <motion.div
        className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-5 sm:py-8 gap-2 min-w-0"
        layout
      >
        <motion.div className="flex flex-col min-w-0" layout>
          <span className="text-[10px] font-bold text-black/30 uppercase tracking-[0.3em] truncate">
            Gallery
          </span>
          <h2 className="text-[clamp(15px,4vw,18px)] font-semibold text-black tracking-tighter truncate">
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
          className="w-10 h-10 min-w-10 shrink-0 flex items-center justify-center rounded-2xl bg-white border border-black/[0.05] text-black hover:text-primary hover:border-primary/20 shadow-sm transition-all active:scale-[0.9] group touch-manipulation disabled:opacity-40"
          title="Add Architectural Slide"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </motion.div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] space-y-5 custom-scrollbar"
        data-lenis-prevent
      >
        <AnimatePresence mode="popLayout">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center opacity-20 px-4">
              <motion.div
                className="w-12 h-12 rounded-2xl border-2 border-dashed border-black mb-4"
                animate={{ rotate: [0, 4, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                {isLiveGenerating ? 'Preparing slides…' : 'Vault Empty'}
              </p>
            </div>
          ) : (
            slides.map((slide, index) => {
              const isActive = index === currentSlideIndex;
              const isHovered = hoveredIndex === index && !slide.isGeneratingPlaceholder;

              return (
                <motion.div
                  key={slide.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="relative group"
                  onClick={() => {
                    setCurrentSlideIndex(index);
                    onAfterSlideSelect?.();
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <motion.div
                    className={`relative rounded-[20px] overflow-hidden transition-all duration-500 ${
                      isActive
                        ? 'ring-[3px] ring-primary ring-offset-4 shadow-2xl shadow-primary/10'
                        : 'hover:shadow-xl hover:shadow-black/5'
                    }`}
                    layout
                  >
                    <SlideThumbnail slide={slide} index={index} colors={colors} />

                    <AnimatePresence>
                      {isHovered && !editor.isGenerating && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/60 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3 z-30"
                        >
                          <motion.div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reorderSlides(index, index - 1);
                              }}
                              disabled={index === 0}
                              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black transition-all disabled:opacity-20 flex items-center justify-center"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateSlide(slide.id);
                              }}
                              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black transition-all flex items-center justify-center"
                            >
                              <Copy size={16} />
                            </button>
                          </motion.div>
                          <motion.div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reorderSlides(index, index + 1);
                              }}
                              disabled={index === slides.length - 1}
                              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black transition-all disabled:opacity-20 flex items-center justify-center"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (slides.length > 1) removeSlide(slide.id);
                              }}
                              className="w-9 h-9 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white transition-all flex items-center justify-center"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <div className="mt-2 flex items-center justify-between px-2 gap-1">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest truncate ${
                        isActive ? 'text-primary' : 'text-black/20'
                      }`}
                    >
                      {slide.isGeneratingPlaceholder
                        ? statusLabel(slide.generationStatus, true)
                        : `Slide ${String(index + 1).padStart(2, '0')}`}
                    </span>
                    {isActive && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                        animate={{ scale: [1, 1.35, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
