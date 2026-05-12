'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, Sparkles, LayoutGrid } from 'lucide-react';
import { Slide } from '@/types';

const SLIDE_WIDTH = 160;
const SLIDE_HEIGHT = 90;

function SlideThumbnail({ slide, index, colors }: { slide: Slide; index: number; colors: string[] }) {
  // Scale factor: 1280×720 → thumbnail width (fill container)
  const scale = 160 / 1280;

  // Match KonvaCanvas SlideBackground exactly
  const bg     = colors[0] || '#05050A';
  const accent = colors[2] || '#7B61FF'; // index 2 = accent (same as canvas)

  // Find background image element (zIndex 0, full-slide)
  const bgEl = slide.elements?.find(
    (el) => el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0 && el.src
  );
  // All other elements (skip bg image — it's handled by the background layer)
  const visibleEls = (slide.elements || []).filter(
    (el) => el.visible !== false && !(el.type === 'image' && el.zIndex === 0 && el.x === 0 && el.y === 0)
  );

  return (
    <div
      className="w-full rounded-md overflow-hidden relative"
      style={{ aspectRatio: '16/9', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Layer 1: Solid base color */}
      <div className="absolute inset-0" style={{ background: bg }} />

      {/* Layer 2: Accent gradient overlay — matches KonvaCanvas SlideBackground */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${accent}33 0%, transparent 50%, ${accent}22 100%)`,
        }}
      />

      {/* Layer 3: Hero background image at 18% opacity (if present) */}
      {bgEl?.src && (
        <img
          src={bgEl.src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.18, pointerEvents: 'none' }}
        />
      )}

      {/* Layer 4: Slide elements scaled to thumbnail size */}
      <div
        className="absolute top-0 left-0"
        style={{
          width:           '1280px',
          height:          '720px',
          transform:       `scale(${scale})`,
          transformOrigin: '0 0',
          pointerEvents:   'none',
        }}
      >
        {visibleEls.map((el) => {
          if (el.type === 'text' && el.content) {
            return (
              <div
                key={el.id}
                style={{
                  position:   'absolute',
                  left:       el.x,
                  top:        el.y,
                  width:      el.width,
                  height:     el.height,
                  fontSize:   el.textStyle?.fontSize || 24,
                  color:      el.textStyle?.color || '#FFFFFF',
                  fontWeight: el.textStyle?.fontWeight || 'normal',
                  fontStyle:  el.textStyle?.fontStyle  || 'normal',
                  fontFamily: el.textStyle?.fontFamily || 'Inter, sans-serif',
                  textAlign:  (el.textStyle?.textAlign as any) || 'left',
                  lineHeight: el.textStyle?.lineHeight || 1.4,
                  opacity:    el.opacity ?? 1,
                  overflow:   'hidden',         // clip like Konva does
                  whiteSpace: 'pre-wrap',
                  wordBreak:  'break-word',
                  transform:  el.rotation ? `rotate(${el.rotation}deg)` : undefined,
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
                  position:     'absolute',
                  left:         el.x,
                  top:          el.y,
                  width:        el.width,
                  height:       el.height,
                  background:   el.shapeStyle?.fill || '#7B61FF',
                  border:       el.shapeStyle?.strokeWidth
                    ? `${el.shapeStyle.strokeWidth}px solid ${el.shapeStyle.stroke || 'transparent'}`
                    : 'none',
                  borderRadius: el.shapeType === 'circle'
                    ? '50%'
                    : el.shapeType === 'triangle'
                    ? '0'
                    : (el.shapeStyle?.cornerRadius || 0),
                  opacity:   el.opacity ?? 1,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                }}
              />
            );
          }

          if (el.type === 'image' && el.src) {
            return (
              <img
                key={el.id}
                src={el.src}
                alt=""
                style={{
                  position:   'absolute',
                  left:       el.x,
                  top:        el.y,
                  width:      el.width,
                  height:     el.height,
                  objectFit:  'cover',
                  opacity:    el.opacity ?? 1,
                  transform:  el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                  // No extra borderRadius — matches canvas exactly
                }}
              />
            );
          }

          return null;
        })}
      </div>

      {/* Slide number badge */}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[7px] font-bold text-white/70 backdrop-blur-sm">
        {index + 1}
      </div>
    </div>
  );
}


type SidebarProps = {
  /** On viewports below `md`, controls whether the slide drawer is visible */
  drawerOpen?: boolean;
  /** Called after choosing a slide — used to close the mobile drawer */
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
  const isLiveGenerating = editor.isGenerating && editor.deckGenerationLifecycle === 'streaming';
  const targetSlides = Math.max(editor.generationTargetSlides || 0, 0);

  const handleAddSlide = useCallback(() => {
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
  }, [addSlide]);

  return (
    <aside
      id="tour-gallery"
      className={`
        z-[130] w-[232px] shrink-0 border-r border-black/[0.07] bg-gradient-to-b from-[#FCFCFD] to-[#F6F7F9] flex flex-col overflow-hidden shadow-[1px_0_12px_rgba(15,23,42,0.04)]
        max-md:fixed max-md:left-0 max-md:top-[var(--editor-topbar-h,104px)]
        max-md:h-[calc(100dvh-var(--editor-topbar-h,104px)-env(safe-area-inset-bottom,0px))]
        max-md:w-[min(272px,88vw)] max-md:transition-transform max-md:duration-300 max-md:ease-[cubic-bezier(0.16,1,0.3,1)]
        pl-[max(0px,env(safe-area-inset-left,0px))]
        ${drawerOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'}
        md:relative md:top-auto md:h-auto md:translate-x-0 md:pt-0
      `}
    >
      {/* Gallery header */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-5 py-4 border-b border-black/[0.06] bg-white/60 backdrop-blur-sm min-w-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 w-8 h-8 rounded-xl bg-primary/[0.08] border border-primary/10 flex items-center justify-center shrink-0">
            <LayoutGrid size={15} className="text-primary" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-black/35 uppercase tracking-[0.22em] truncate">Gallery</span>
            <h2 className="text-[clamp(16px,4vw,19px)] font-semibold text-neutral-900 tracking-tight truncate leading-tight">
              {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
            </h2>
            {isLiveGenerating && (
              <p className="mt-1 text-[10px] font-semibold text-primary/85 truncate">
                Live · {slides.length}
                {targetSlides > 0 ? ` / ${targetSlides}` : ''}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddSlide}
          className="w-10 h-10 min-w-10 shrink-0 flex items-center justify-center rounded-2xl bg-white border border-black/[0.08] text-neutral-800 hover:text-primary hover:border-primary/25 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all active:scale-[0.92] group touch-manipulation"
          title="Add slide"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>

      {/* Slide list */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] space-y-4 custom-scrollbar"
        data-lenis-prevent
      >
        <AnimatePresence mode="popLayout">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] text-center px-3 py-6 rounded-[20px] border border-dashed border-black/[0.1] bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/5 border border-primary/10 flex items-center justify-center mb-4">
                <Sparkles size={22} className="text-primary/80" strokeWidth={1.5} />
              </div>
              <p className="text-[12px] font-semibold text-neutral-800 tracking-tight">No slides yet</p>
              <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed max-w-[13.5rem]">
                Open <span className="font-semibold text-primary">AI Generation</span> on the right to build a deck, or tap <span className="font-semibold text-neutral-700">+</span> for a blank slide.
              </p>
            </div>
          ) : (
            slides.map((slide, index) => {
              const isActive = index === currentSlideIndex;
              const isHovered = hoveredIndex === index;

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
                  <div className={`relative rounded-[18px] overflow-hidden transition-all duration-500 bg-white/40 ${
                    isActive 
                      ? 'ring-[3px] ring-primary ring-offset-[3px] ring-offset-[#F6F7F9] shadow-lg shadow-primary/15' 
                      : 'ring-1 ring-black/[0.06] hover:ring-black/[0.1] hover:shadow-lg hover:shadow-black/[0.06]'
                  }`}>
                    <SlideThumbnail slide={slide} index={index} colors={colors} />
                    
                    {/* Architectural Hover Interface */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/60 backdrop-blur-[6px] flex flex-col items-center justify-center gap-3 z-30"
                        >
                          <div className="flex gap-2">
                             <button
                               onClick={(e) => { e.stopPropagation(); reorderSlides(index, index - 1); }}
                               disabled={index === 0}
                               className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black transition-all disabled:opacity-20 flex items-center justify-center"
                             >
                               <ChevronUp size={16} />
                             </button>
                             <button
                               onClick={(e) => { e.stopPropagation(); duplicateSlide(slide.id); }}
                               className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black transition-all flex items-center justify-center"
                             >
                               <Copy size={16} />
                             </button>
                          </div>
                          <div className="flex gap-2">
                             <button
                               onClick={(e) => { e.stopPropagation(); reorderSlides(index, index + 1); }}
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
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Subtle Slide Identifier */}
                  <div className="mt-2 flex items-center justify-between px-1.5">
                     <span className={`text-[9px] font-bold uppercase tracking-[0.16em] ${isActive ? 'text-primary' : 'text-black/35'}`}>
                       Slide {String(index + 1).padStart(2, '0')}
                     </span>
                     {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" />}
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
