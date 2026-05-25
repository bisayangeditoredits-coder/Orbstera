'use client';

import { useRef, useState } from 'react';
import { LayoutList, Sparkles, Loader2, CheckCircle2, ArrowRight, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OutlineSlide } from './planner-utils';
import { getOutlineProgress } from './planner-utils';
import { cn } from '@/lib/cn';

type PlannerOutlinePanelProps = {
  slides: OutlineSlide[];
  loading: boolean;
  topic: string;
  canGenerate: boolean;
  slideNotes: Record<number, string>;
  targetSlideCount?: number;
  onGenerate: () => void;
  onReorder: (slides: OutlineSlide[]) => void;
  onUpdateSlideNotes: (slideNum: number, notes: string) => void;
};

// ── Skeleton card shown while loading ─────────────────────────────────────────
function SlideSkeleton({ index }: { index: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.1 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700"
        >
          {index + 1}
        </motion.div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded-md bg-slate-200" />
          <div className="h-2.5 w-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ── Single sortable slide card ─────────────────────────────────────────────────
function SortableSlideCard({
  slide,
  isDragging,
  notes,
  onUpdateNotes,
  entranceDelay,
  animateEntrance,
}: {
  slide: OutlineSlide;
  isDragging?: boolean;
  notes?: string;
  onUpdateNotes?: (notes: string) => void;
  entranceDelay: number;
  animateEntrance: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSelf,
  } = useSortable({ id: String(slide.number) });
  
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSelf ? 0.35 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <motion.article
        layout={false}
        initial={animateEntrance ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: isSelf ? 0.35 : 1, y: 0 }}
        transition={{
          duration: 0.35,
          ease: [0.25, 0.1, 0.25, 1],
          delay: animateEntrance ? entranceDelay : 0,
        }}
        onClick={() => !expanded && setExpanded(true)}
        className={cn(
          'group flex min-h-[88px] flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition sm:min-h-[96px] sm:p-5',
          !expanded && 'hover:border-slate-300 hover:shadow-md cursor-pointer',
          isDragging && 'ring-2 ring-primary/30',
        )}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} strokeWidth={1.75} />
          </button>

          {/* Slide number badge */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white shadow-sm shadow-slate-900/20">
            {slide.number}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold leading-snug text-slate-900">{slide.title}</h3>
                {slide.type && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                      slide.type === 'Problem'
                        ? 'bg-amber-50 text-amber-800'
                        : slide.type === 'Solution'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {slide.type}
                  </span>
                )}
              </div>
              {!expanded && (
                <span className="text-[10px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition">
                  {notes ? 'Edit details' : 'Add details'}
                </span>
              )}
            </div>
            {slide.description && (
              <motion.p
                layout
                className="mt-1.5 text-xs leading-relaxed text-slate-500"
              >
                {slide.description}
              </motion.p>
            )}
            
            {notes && !expanded && (
              <p className="mt-2 text-xs italic text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 line-clamp-2">
                {notes}
              </p>
            )}
          </div>
        </div>

        {/* Expansion area for notes */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2"
          >
            <textarea
              autoFocus
              value={notes || ''}
              onChange={(e) => onUpdateNotes?.(e.target.value)}
              placeholder="Add specific details, bullet points, or instructions for this slide..."
              className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 shadow-inner placeholder:text-slate-400 focus:border-primary/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-y"
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag conflict
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
              >
                Save details
              </button>
            </div>
          </motion.div>
        )}
      </motion.article>
    </li>
  );
}

// ── Overlay card shown while dragging ─────────────────────────────────────────
function DragOverlayCard({ slide }: { slide: OutlineSlide }) {
  return (
    <article className="flex min-h-[88px] flex-col gap-2 rounded-2xl border border-primary/30 bg-white p-4 shadow-xl ring-2 ring-primary/20 sm:min-h-[96px] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 cursor-grabbing rounded-md p-0.5 text-primary">
          <GripVertical size={16} strokeWidth={1.75} />
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white shadow-sm">
          {slide.number}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-snug text-slate-900">{slide.title}</h3>
          {slide.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-2">
              {slide.description}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export function PlannerOutlinePanel({
  slides,
  loading,
  topic,
  canGenerate,
  slideNotes,
  targetSlideCount,
  onGenerate,
  onReorder,
  onUpdateSlideNotes,
}: PlannerOutlinePanelProps) {
  const hasSlides = slides.length > 0;
  const { count, isStreaming, target } = getOutlineProgress(slides, loading, targetSlideCount);
  const progressPct = Math.min(100, Math.round((count / target) * 100));

  const seenSlideNumbersRef = useRef<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeSlide = activeId ? slides.find((s) => String(s.number) === activeId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => String(s.number) === active.id);
    const newIndex = slides.findIndex((s) => String(s.number) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(slides, oldIndex, newIndex).map((s, i) => ({
      ...s,
      number: i + 1,
    }));
    onReorder(reordered);
  };

  return (
    <div className="dot-grid flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-slate-50">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LayoutList size={18} className="text-slate-700" strokeWidth={1.75} />
            <h2 className="font-space-grotesk text-sm font-bold text-slate-900">Live outline</h2>
          </div>
          {isStreaming && !hasSlides && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
              <Loader2 size={10} className="animate-spin" />
              Building...
            </span>
          )}
          {hasSlides && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">
              {count} slide{count === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {topic && (
          <p className="mt-1 truncate text-xs text-slate-500" title={topic}>
            {topic}
          </p>
        )}
        {(loading || hasSlides) && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200/80">
            <motion.div
              className="h-full rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${loading && !hasSlides ? 12 : progressPct}%` }}
              animate={loading ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 1.2, repeat: loading ? Infinity : 0 }}
            />
          </div>
        )}
        {hasSlides && !loading && (
          <p className="mt-2 text-[10px] font-medium text-slate-400 flex items-center gap-1">
            <GripVertical size={10} />
            Drag cards to reorder slides. Click to add details.
          </p>
        )}
      </header>

      {/* Slide list */}
      <div
        data-lenis-prevent
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5 [-webkit-overflow-scrolling:touch]"
      >
        {loading && !hasSlides ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <SlideSkeleton key={i} index={i} />
            ))}
          </div>
        ) : hasSlides ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={slides.map((s) => String(s.number))}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {slides.map((slide) => {
                    const isNew = !seenSlideNumbersRef.current.has(slide.number);
                    if (isNew) seenSlideNumbersRef.current.add(slide.number);
                    return (
                      <SortableSlideCard
                        key={slide.number}
                        slide={slide}
                        isDragging={activeId === String(slide.number)}
                        notes={slideNotes[slide.number]}
                        onUpdateNotes={(n) => onUpdateSlideNotes(slide.number, n)}
                        animateEntrance={isNew}
                        entranceDelay={isNew ? (slide.number - 1) * 0.08 : 0}
                      />
                    );
                  })}
                </AnimatePresence>
                {loading && (
                  <li className="pt-1 list-none">
                    <SlideSkeleton index={slides.length} />
                  </li>
                )}
              </ul>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
              {activeSlide ? <DragOverlayCard slide={activeSlide} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 shadow-sm">
              <Sparkles size={24} strokeWidth={1.75} />
            </div>
            <p className="mt-5 font-space-grotesk text-base font-bold text-slate-900">
              Outline builds here
            </p>
            <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-slate-500">
              As Copilot plans your deck, each slide appears as a card you can drag to reorder before
              generating.
            </p>
            <ol className="mt-8 max-w-[240px] space-y-3 text-left text-[11px] text-slate-500">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  1
                </span>
                Describe your topic in chat
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  2
                </span>
                Drag cards to reorder slides
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  3
                </span>
                Click Generate deck when ready
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Generate button */}
      {canGenerate && (
        <div className="shrink-0 border-t border-slate-200 bg-white p-4 sm:px-5">
          <button
            type="button"
            onClick={onGenerate}
            className="group relative overflow-hidden flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[13px] font-bold text-white shadow-xl shadow-primary/25 transition hover:bg-primaryHover active:scale-[0.99]"
          >
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
            />
            <CheckCircle2 size={18} strokeWidth={1.75} className="relative z-10" />
            <span className="relative z-10">Generate deck</span>
            <ArrowRight size={15} className="relative z-10 opacity-80 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}
