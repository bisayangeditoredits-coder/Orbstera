'use client';

import { useRef, useMemo, useCallback, memo } from 'react';
import { PPT_ANIMATION_HINT, PPT_STYLE_ENTRANCE_OPTIONS } from '@/lib/editor/pptAnimationCatalog';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, ArrowUp, ArrowDown,
  AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Bold, Italic, Upload, Copy,
  GripVertical,
} from 'lucide-react';
import { SlideElement } from '@/types';
import { ColorPicker } from './ColorPicker';
import { LayerRowThumbnail } from './LayerRowThumbnail';

// ── Massive Google Fonts Library ──────────────────────────────────────────────
const GOOGLE_FONTS = [
  'Inter', 'Space Grotesk', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro', 'Raleway', 'PT Sans',
  'Merriweather', 'Roboto Condensed', 'Lora', 'Ubuntu', 'Playfair Display', 'Nunito', 'Poppins', 'Arimo', 'Titillium Web',
  'Muli', 'PT Serif', 'Nunito Sans', 'Fira Sans', 'Noto Sans', 'Dosis', 'Quicksand', 'Inconsolata', 'Crimson Text', 'Karla',
  'Rubik', 'Mukta', 'Work Sans', 'Varela Round', 'Cabin', 'Oxygen', 'Anton', 'Bitter', 'Abel', 'Fjalla One', 'Hind',
  'Josefin Sans', 'Libre Baskerville', 'Signika', 'Arvo', 'Asap', 'Dancing Script', 'Pacifico', 'Teko', 'Bebas Neue',
  'Caveat', 'Indie Flower', 'Righteous', 'Permanent Marker', 'Cinzel', 'Alfa Slab One', 'Courgette', 'Fredoka One',
  'Lobster', 'Amatic SC', 'Kalam', 'Great Vibes', 'Questrial', 'Rokkitt', 'Vollkorn', 'Yeseva One', 'Zilla Slab',
  'Alegreya', 'Barlow', 'Cairo', 'Cormorant Garamond', 'Exo 2', 'Heebo', 'IBM Plex Sans', 'Jura', 'Kanit', 'Noto Serif',
  'Orbitron', 'Prompt', 'Saira', 'JetBrains Mono', 'Outfit', 'DM Sans', 'Manrope', 'Plus Jakarta Sans', 'Syne',
  'Lora', 'Noto Sans JP', 'Noto Sans KR', 'Mukta', 'Hind Siliguri', 'Hind Madurai',
].sort();

const labelClass = 'text-[10px] font-semibold uppercase tracking-wide text-neutral-500 mb-1 block';
const sectionTitle = 'text-[11px] font-semibold text-neutral-600 tracking-tight mb-2 block';
const inputShell = 'rounded-xl border border-neutral-200/90 bg-white px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary/25 transition-shadow';
const controlBtn =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.97]';

// ─── Compact slider ───────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral-600">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-neutral-800">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

// ─── Property Editor ──────────────────────────────────────────────────────────
function PropertyEditor({ element, slideId }: { element: SlideElement; slideId: string }) {
  const { updateElement, setEditorState } = usePresentationStore();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const upd = (changes: Partial<SlideElement>) => updateElement(slideId, element.id, changes);
  const ts = element.textStyle || {};
  const ss = element.shapeStyle || {};

  const handleImageReplace = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => upd({ src: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">

      {/* ── TEXT ELEMENT ─────────────────────────────────────────────────── */}
      {element.type === 'text' && (
        <div className="space-y-4">
          <textarea
            value={element.content || ''}
            onChange={(e) => upd({ content: e.target.value })}
            className={`${inputShell} min-h-[4.5rem] w-full resize-none py-2.5 text-sm leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none`}
            rows={3}
            placeholder="Text content…"
          />

          <div className={inputShell}>
            <label className={labelClass}>Font family</label>
            <select
              value={ts.fontFamily || 'Inter'}
              onChange={(e) => upd({ textStyle: { ...ts, fontFamily: e.target.value } })}
              className="h-9 w-full cursor-pointer bg-transparent text-sm font-medium text-neutral-900 focus:outline-none"
              style={{ fontFamily: ts.fontFamily || 'Inter' }}
            >
              {GOOGLE_FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={inputShell}>
              <label className={labelClass}>Size</label>
              <input
                type="number"
                min={6}
                max={200}
                value={ts.fontSize || 24}
                onChange={(e) => upd({ textStyle: { ...ts, fontSize: Number(e.target.value) } })}
                className="h-9 w-full bg-transparent text-sm font-semibold text-neutral-900 focus:outline-none"
              />
            </div>
            <div className={inputShell}>
              <label className={labelClass}>Align</label>
              <div className="flex items-center gap-0.5 pt-0.5">
                {[
                  { val: 'left', icon: AlignLeft },
                  { val: 'center', icon: AlignCenter },
                  { val: 'right', icon: AlignRight },
                  { val: 'justify', icon: AlignJustify },
                ].map((btn) => (
                  <button
                    key={btn.val}
                    type="button"
                    onClick={() => upd({ textStyle: { ...ts, textAlign: btn.val as 'left' | 'center' | 'right' | 'justify' } })}
                    className={`flex h-9 flex-1 items-center justify-center rounded-lg text-neutral-500 transition-colors ${
                      (ts.textAlign || 'left') === btn.val
                        ? 'bg-primary text-white shadow-sm'
                        : 'hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <btn.icon size={14} strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => upd({ textStyle: { ...ts, fontWeight: ts.fontWeight === 'bold' ? 'normal' : 'bold' } })}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                ts.fontWeight === 'bold'
                  ? 'border-primary/30 bg-primary text-white shadow-sm'
                  : 'border-neutral-200/90 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Bold size={15} strokeWidth={2} /> Bold
            </button>
            <button
              type="button"
              onClick={() => upd({ textStyle: { ...ts, fontStyle: ts.fontStyle === 'italic' ? 'normal' : 'italic' } })}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                ts.fontStyle === 'italic'
                  ? 'border-primary/30 bg-primary text-white shadow-sm'
                  : 'border-neutral-200/90 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <Italic size={15} strokeWidth={2} /> Italic
            </button>
          </div>

          <Slider
            label="Line height"
            value={(ts.lineHeight || 1.4) * 10}
            min={8}
            max={30}
            step={1}
            onChange={(v) => upd({ textStyle: { ...ts, lineHeight: v / 10 } })}
          />

          <div className={`${inputShell} bg-neutral-50/80`}>
            <label className={labelClass}>Color</label>
            <ColorPicker
              label="Text color"
              variant="compact"
              color={ts.color || '#FFFFFF'}
              onChange={(c) => upd({ textStyle: { ...ts, color: c } })}
            />
          </div>
        </div>
      )}

      {/* ── IMAGE ELEMENT ────────────────────────────────────────────────── */}
      {element.type === 'image' && (
        <div className="space-y-4">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageReplace(f);
              e.target.value = '';
            }}
          />
          {element.src && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-neutral-200/90 bg-neutral-100 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={element.src} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 active:scale-[0.99]"
          >
            <Upload size={16} strokeWidth={2} /> Replace image
          </button>
          <Slider label="Opacity" value={(element.opacity ?? 1) * 100} min={0} max={100}
            onChange={(v) => upd({ opacity: v / 100 })} />
        </div>
      )}

      {/* ── SHAPE ELEMENT ────────────────────────────────────────────────── */}
      {element.type === 'shape' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className={inputShell}>
              <label className={labelClass}>Fill</label>
              <ColorPicker label="Fill" variant="compact" color={ss.fill || '#7B61FF'}
                onChange={(c) => upd({ shapeStyle: { ...ss, fill: c } })} />
            </div>
            <div className={inputShell}>
              <label className={labelClass}>Stroke</label>
              <ColorPicker label="Stroke" variant="compact" color={ss.stroke || '#FFFFFF'}
                onChange={(c) => upd({ shapeStyle: { ...ss, stroke: c } })} />
            </div>
          </div>
          <Slider label="Stroke width" value={ss.strokeWidth || 0} min={0} max={20}
            onChange={(v) => upd({ shapeStyle: { ...ss, strokeWidth: v } })} />
          <Slider label="Corner radius" value={ss.cornerRadius || 0} min={0} max={100}
            onChange={(v) => upd({ shapeStyle: { ...ss, cornerRadius: v } })} />
        </div>
      )}

      {/* ── COMMON: Opacity + Geometry ────────────────────────────────────── */}
      {element.type !== 'image' && (
        <Slider label="Opacity" value={(element.opacity ?? 1) * 100} min={0} max={100}
          onChange={(v) => upd({ opacity: v / 100 })} />
      )}

      {/* ── Animation ────────────────────────────────────────────────────── */}
      <div className="space-y-3 border-t border-neutral-200/80 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Animation</span>
          <button
            type="button"
            onClick={() => {
              const anim = {
                entrance: (element.animation?.entrance || 'fadeIn') as import('@/types').AnimationEntrance,
                duration: element.animation?.duration ?? 600,
                delay: element.animation?.delay ?? 0,
              };
              const ms = Math.min(4500, anim.delay + anim.duration + 500);
              setEditorState({ previewElementId: element.id });
              setTimeout(() => setEditorState({ previewElementId: null }), ms);
            }}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
          >
            Preview
          </button>
        </div>

        {(() => {
          const anim = {
            entrance: (element.animation?.entrance || 'fadeIn') as import('@/types').AnimationEntrance,
            duration: element.animation?.duration ?? 600,
            delay: element.animation?.delay ?? 0,
          };
          return (
            <>
              <select
                value={anim.entrance}
                onChange={(e) => upd({ animation: { ...anim, entrance: e.target.value as import('@/types').AnimationEntrance } })}
                className={`${inputShell} h-10 w-full cursor-pointer appearance-none text-sm font-medium text-neutral-900 focus:outline-none`}
              >
                {PPT_STYLE_ENTRANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs leading-relaxed text-neutral-500">{PPT_ANIMATION_HINT}</p>
              <Slider label="Duration (ms)" value={anim.duration} min={100} max={2000} step={100}
                onChange={(v) => upd({ animation: { ...anim, duration: v } })} />
              <Slider label="Delay (ms)" value={anim.delay} min={0} max={2000} step={50}
                onChange={(v) => upd({ animation: { ...anim, delay: v } })} />
            </>
          );
        })()}
      </div>

      {/* ── Geometry ─────────────────────────────────────────────────────── */}
      <div className="border-t border-neutral-200/80 pt-4">
        <span className={sectionTitle}>Position & size</span>
        <div className="grid grid-cols-2 gap-2">
          {(['x', 'y', 'width', 'height'] as const).map((prop) => (
            <div key={prop} className={`${inputShell} flex h-10 items-center justify-between gap-2`}>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{prop}</span>
              <input
                type="number"
                value={Math.round(element[prop] as number)}
                onChange={(e) => upd({ [prop]: Number(e.target.value) })}
                className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold text-neutral-900 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable layer row (drag handle + thumbnail + actions) ───────────────────
const SortableLayerRow = memo(function SortableLayerRow({
  el,
  slideId,
  isSelected,
  onToggleSelect,
  onDuplicate,
}: {
  el: SlideElement;
  slideId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDuplicate: (el: SlideElement) => void;
}) {
  const controls = useDragControls();
  const pushHistory = usePresentationStore((s) => s.pushHistory);
  const updateElement = usePresentationStore((s) => s.updateElement);
  const removeElement = usePresentationStore((s) => s.removeElement);
  const reorderElements = usePresentationStore((s) => s.reorderElements);

  const displayName =
    el.type === 'text'
      ? (el.content?.trim().slice(0, 36) || 'Empty text')
      : `${(el.shapeType || el.type).charAt(0).toUpperCase() + (el.shapeType || el.type).slice(1)}`;

  return (
    <Reorder.Item
      as="div"
      value={el.id}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => pushHistory()}
      className={`group relative rounded-2xl border transition-shadow ${
        isSelected
          ? 'border-neutral-200/90 bg-white shadow-lg shadow-neutral-900/5 ring-1 ring-primary/15'
          : 'border-transparent bg-transparent hover:border-neutral-200/60 hover:bg-white/80'
      }`}
    >
      <div className="flex w-full min-w-0 flex-col gap-0">
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleSelect}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleSelect();
            }
          }}
          className="flex cursor-pointer items-center gap-2 px-2 py-2.5 sm:gap-2.5 sm:px-3"
        >
          <button
            type="button"
            className="touch-none shrink-0 cursor-grab rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 active:cursor-grabbing"
            aria-label="Drag to reorder layer"
            title="Drag to reorder"
            onPointerDown={(e) => {
              e.stopPropagation();
              controls.start(e);
            }}
          >
            <GripVertical size={16} strokeWidth={2} />
          </button>

          <div className="shrink-0">
            <LayerRowThumbnail el={el} />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <p className={`truncate text-sm font-semibold tracking-tight ${isSelected ? 'text-neutral-900' : 'text-neutral-700'}`}>
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs tabular-nums text-neutral-500">
              {Math.round(el.x)}, {Math.round(el.y)} · {Math.round(el.width)}×{Math.round(el.height)}
            </p>
          </div>
        </div>

        <div
          className={`flex w-full min-w-0 flex-wrap items-center justify-end gap-1 px-2 pb-2 sm:px-3 ${
            isSelected
              ? 'opacity-100'
              : 'pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'
          }`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={controlBtn}
            aria-label={el.visible !== false ? 'Hide layer' : 'Show layer'}
            title={el.visible !== false ? 'Hide' : 'Show'}
            onClick={(e) => {
              e.stopPropagation();
              updateElement(slideId, el.id, { visible: !el.visible });
            }}
          >
            {el.visible !== false ? <Eye size={14} strokeWidth={1.75} /> : <EyeOff size={14} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            className={controlBtn}
            aria-label={el.locked ? 'Unlock layer' : 'Lock layer'}
            title={el.locked ? 'Unlock' : 'Lock'}
            onClick={(e) => {
              e.stopPropagation();
              updateElement(slideId, el.id, { locked: !el.locked });
            }}
          >
            {el.locked ? <Lock size={14} strokeWidth={1.75} /> : <Unlock size={14} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            className={controlBtn}
            aria-label="Bring forward"
            title="Bring forward"
            onClick={(e) => {
              e.stopPropagation();
              reorderElements(slideId, el.id, 'up', true);
            }}
          >
            <ArrowUp size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={controlBtn}
            aria-label="Send backward"
            title="Send backward"
            onClick={(e) => {
              e.stopPropagation();
              reorderElements(slideId, el.id, 'down', true);
            }}
          >
            <ArrowDown size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={controlBtn}
            aria-label="Duplicate layer"
            title="Duplicate"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(el);
            }}
          >
            <Copy size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={`${controlBtn} hover:border-red-100 hover:bg-red-50 hover:text-red-600`}
            aria-label="Delete layer"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              removeElement(slideId, el.id);
            }}
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="overflow-hidden border-t border-neutral-200/80 bg-gradient-to-b from-white to-neutral-50/90"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5">
              <PropertyEditor element={el} slideId={slideId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
});

// ─── Main Layers Panel ────────────────────────────────────────────────────────
export function LayersPanel() {
  const {
    presentation,
    currentSlideIndex,
    editor,
    selectElement,
    addElement,
    setElementsOrder,
  } = usePresentationStore();

  const slide = presentation?.slides[currentSlideIndex];
  const displayIds = useMemo(
    () => [...(slide?.elements || [])].reverse().map((e) => e.id),
    [slide?.elements],
  );

  const byId = useMemo(() => {
    const m = new Map<string, SlideElement>();
    for (const e of slide?.elements || []) m.set(e.id, e);
    return m;
  }, [slide?.elements]);

  const duplicateElement = (el: SlideElement) => {
    if (!slide) return;
    const copy: SlideElement = {
      ...el,
      id: `el-copy-${Date.now()}`,
      x: el.x + 20,
      y: el.y + 20,
      zIndex: (slide.elements?.length || 0) + 1,
    };
    addElement(slide.id, copy);
    selectElement(copy.id);
  };

  const handleReorder = useCallback(
    (next: string[]) => {
      if (slide) setElementsOrder(slide.id, next, false);
    },
    [slide, setElementsOrder],
  );

  return (
    <div
      id="tour-layers"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-neutral-50/95 text-neutral-900 selection:bg-primary/20"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200/80 bg-white/90 px-4 py-3.5 backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-primary to-sky-400 shadow-[0_0_10px_rgba(59,130,246,0.45)]" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Layers</h3>
            <p className="text-xs text-neutral-500">Stacking, visibility, and properties</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg border border-neutral-200/90 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium tabular-nums text-neutral-600">
          {displayIds.length} elements
        </span>
      </div>

      <div
        className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2 sm:p-3"
        data-lenis-prevent
      >
        <AnimatePresence mode="popLayout">
          {displayIds.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
              <p className="text-sm font-medium text-neutral-400">No elements on this slide</p>
              <p className="mt-1 text-xs text-neutral-400">Use the toolbar to add text, shapes, or images</p>
            </motion.div>
          ) : (
            <Reorder.Group
              as="div"
              axis="y"
              values={displayIds}
              onReorder={handleReorder}
              className="flex flex-col gap-1.5"
            >
              {displayIds.map((id) => {
                const el = byId.get(id);
                if (!el) return null;
                const isSelected = editor.selectedElementId === el.id;
                return (
                  <SortableLayerRow
                    key={id}
                    el={el}
                    slideId={slide!.id}
                    isSelected={isSelected}
                    onToggleSelect={() => selectElement(isSelected ? null : el.id)}
                    onDuplicate={duplicateElement}
                  />
                );
              })}
            </Reorder.Group>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
