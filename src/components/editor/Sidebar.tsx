'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Plus, Trash2, Copy, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
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


export function Sidebar() {
  const {
    presentation,
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
    <aside id="tour-gallery" className="w-[220px] shrink-0 border-r-2 border-black/[0.08] bg-[#FBFBFC] flex flex-col overflow-hidden shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      {/* Premium Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-black/30 uppercase tracking-[0.3em]">Gallery</span>
          <h2 className="text-[18px] font-semibold text-black tracking-tighter">{slides.length} Slides</h2>
        </div>
        <button
          onClick={handleAddSlide}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-black/[0.05] text-black hover:text-primary hover:border-primary/20 shadow-sm transition-all active:scale-[0.9] group"
          title="Add Architectural Slide"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>

      {/* Orchestrated Slide List */}
      <div 
        className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-5 custom-scrollbar"
        data-lenis-prevent
      >
        <AnimatePresence mode="popLayout">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center opacity-20 px-4">
              <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-black mb-4" />
              <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                Vault Empty
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
                  onClick={() => setCurrentSlideIndex(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className={`relative rounded-[20px] overflow-hidden transition-all duration-500 ${
                    isActive 
                      ? 'ring-[3px] ring-primary ring-offset-4 shadow-2xl shadow-primary/10' 
                      : 'hover:shadow-xl hover:shadow-black/5'
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
                  <div className="mt-2 flex items-center justify-between px-2">
                     <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-primary' : 'text-black/20'}`}>
                       Slide {String(index + 1).padStart(2, '0')}
                     </span>
                     {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
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
