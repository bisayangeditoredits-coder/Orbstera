'use client';

import { useRef, useMemo, useCallback, memo, useState, type ReactNode } from 'react';
import { PPT_ANIMATION_HINT, PPT_STYLE_ENTRANCE_OPTIONS } from '@/lib/editor/pptAnimationCatalog';
import { EDITOR_GOOGLE_FONTS } from '@/lib/editor-fonts';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, ArrowUp, ArrowDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Upload, Copy,
  GripVertical, ChevronDown, ChevronRight,
} from 'lucide-react';
import { SlideElement } from '@/types';
import { editorImageFetchUrl } from '@/lib/r2-public-url';
import { ColorPicker } from './ColorPicker';
import { LayerRowThumbnail } from './LayerRowThumbnail';
import { cn } from '@/lib/cn';

const fieldLabel = 'text-[10px] font-medium uppercase tracking-wide text-neutral-500';
const fieldInput =
  'h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-[12px] font-medium tabular-nums text-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary/35 focus:border-primary/40';
const controlBtn =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900';

function PropSection({
  title,
  defaultOpen = true,
  action,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t border-neutral-200/90 first:border-t-0 first:pt-0 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 py-1 text-left"
      >
        {open ? (
          <ChevronDown size={14} className="shrink-0 text-neutral-400" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-neutral-400" />
        )}
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{title}</span>
        {action && (
          <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {action}
          </span>
        )}
      </button>
      {open && <div className="mt-2 space-y-2.5">{children}</div>}
    </section>
  );
}

function Slider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-neutral-600">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-neutral-800">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className={fieldLabel}>{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className={fieldInput}
      />
    </label>
  );
}

function layerDisplayName(el: SlideElement): string {
  if (el.id.includes('el-bg-')) return 'Background';
  if (el.type === 'text') return el.content?.trim().slice(0, 40) || 'Text';
  const kind = el.shapeType || el.type;
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function PropertyInspector({ element, slideId }: { element: SlideElement; slideId: string }) {
  const { updateElement, setEditorState } = usePresentationStore();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const upd = (changes: Partial<SlideElement>) => updateElement(slideId, element.id, changes);
  const ts = element.textStyle || {};
  const ss = element.shapeStyle || {};
  const anim = {
    entrance: (element.animation?.entrance || 'fadeIn') as import('@/types').AnimationEntrance,
    duration: element.animation?.duration ?? 600,
    delay: element.animation?.delay ?? 0,
  };

  const handleImageReplace = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => upd({ src: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-0">
      <PropSection title="Transform" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={element.x} onChange={(v) => upd({ x: v })} />
          <NumField label="Y" value={element.y} onChange={(v) => upd({ y: v })} />
          <NumField label="W" value={element.width} onChange={(v) => upd({ width: v })} />
          <NumField label="H" value={element.height} onChange={(v) => upd({ height: v })} />
        </div>
      </PropSection>

      {element.type === 'text' && (
        <PropSection title="Text">
          <textarea
            value={element.content || ''}
            onChange={(e) => upd({ content: e.target.value })}
            className="min-h-[3.5rem] w-full resize-none rounded-md border border-neutral-200 bg-white px-2 py-2 text-[12px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary/35"
            rows={2}
            placeholder="Content…"
          />
          <label className="block space-y-1">
            <span className={fieldLabel}>Font</span>
            <select
              value={ts.fontFamily || 'Inter'}
              onChange={(e) => upd({ textStyle: { ...ts, fontFamily: e.target.value } })}
              className={fieldInput}
              style={{ fontFamily: ts.fontFamily || 'Inter' }}
            >
              {EDITOR_GOOGLE_FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className={fieldLabel}>Size</span>
              <input
                type="number"
                min={6}
                max={200}
                value={ts.fontSize || 24}
                onChange={(e) => upd({ textStyle: { ...ts, fontSize: Number(e.target.value) } })}
                className={fieldInput}
              />
            </label>
            <div className="space-y-1">
              <span className={fieldLabel}>Align</span>
              <div className="flex h-8 gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5">
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
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-sm transition-colors',
                      (ts.textAlign || 'left') === btn.val
                        ? 'bg-primary text-white'
                        : 'text-neutral-500 hover:bg-neutral-100',
                    )}
                  >
                    <btn.icon size={13} strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => upd({ textStyle: { ...ts, fontWeight: ts.fontWeight === 'bold' ? 'normal' : 'bold' } })}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-[11px] font-semibold',
                ts.fontWeight === 'bold'
                  ? 'border-primary/40 bg-primary text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
              )}
            >
              <Bold size={13} /> Bold
            </button>
            <button
              type="button"
              onClick={() => upd({ textStyle: { ...ts, fontStyle: ts.fontStyle === 'italic' ? 'normal' : 'italic' } })}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md border py-1.5 text-[11px] font-semibold',
                ts.fontStyle === 'italic'
                  ? 'border-primary/40 bg-primary text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
              )}
            >
              <Italic size={13} /> Italic
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
          <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
            <ColorPicker
              label="Color"
              variant="compact"
              color={ts.color || '#FFFFFF'}
              onChange={(c) => upd({ textStyle: { ...ts, color: c } })}
            />
          </div>
        </PropSection>
      )}

      {element.type === 'image' && (
        <PropSection title="Image">
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
            <div className="aspect-video w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editorImageFetchUrl(element.src)} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[12px] font-semibold text-white hover:bg-primaryHover"
          >
            <Upload size={14} /> Replace
          </button>
          <Slider
            label="Opacity"
            value={(element.opacity ?? 1) * 100}
            min={0}
            max={100}
            onChange={(v) => upd({ opacity: v / 100 })}
          />
        </PropSection>
      )}

      {element.type === 'shape' && (
        <PropSection title="Shape">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
              <span className={fieldLabel}>Fill</span>
              <ColorPicker label="Fill" variant="compact" color={ss.fill || '#7B61FF'}
                onChange={(c) => upd({ shapeStyle: { ...ss, fill: c } })} />
            </div>
            <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
              <span className={fieldLabel}>Stroke</span>
              <ColorPicker label="Stroke" variant="compact" color={ss.stroke || 'transparent'}
                onChange={(c) => upd({ shapeStyle: { ...ss, stroke: c } })} />
            </div>
          </div>
          <Slider label="Stroke width" value={ss.strokeWidth || 0} min={0} max={20}
            onChange={(v) => upd({ shapeStyle: { ...ss, strokeWidth: v } })} />
          <Slider label="Corner radius" value={ss.cornerRadius || 0} min={0} max={100}
            onChange={(v) => upd({ shapeStyle: { ...ss, cornerRadius: v } })} />
        </PropSection>
      )}

      {element.type !== 'image' && (
        <PropSection title="Appearance" defaultOpen={element.type !== 'text'}>
          <Slider
            label="Opacity"
            value={(element.opacity ?? 1) * 100}
            min={0}
            max={100}
            onChange={(v) => upd({ opacity: v / 100 })}
          />
        </PropSection>
      )}

      <PropSection
        title="Animation"
        defaultOpen={false}
        action={
          <button
            type="button"
            onClick={() => {
              const ms = Math.min(4500, anim.delay + anim.duration + 500);
              setEditorState({ previewElementId: element.id });
              setTimeout(() => setEditorState({ previewElementId: null }), ms);
            }}
            className="rounded-md px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
          >
            Preview
          </button>
        }
      >
        <select
          value={anim.entrance}
          onChange={(e) => upd({ animation: { ...anim, entrance: e.target.value as import('@/types').AnimationEntrance } })}
          className={fieldInput}
        >
          {PPT_STYLE_ENTRANCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-[10px] leading-relaxed text-neutral-500">{PPT_ANIMATION_HINT}</p>
        <Slider label="Duration (ms)" value={anim.duration} min={100} max={2000} step={100}
          onChange={(v) => upd({ animation: { ...anim, duration: v } })} />
        <Slider label="Delay (ms)" value={anim.delay} min={0} max={2000} step={50}
          onChange={(v) => upd({ animation: { ...anim, delay: v } })} />
      </PropSection>
    </div>
  );
}

const SortableLayerRow = memo(function SortableLayerRow({
  el,
  slideId,
  isSelected,
  onSelect,
  onDuplicate,
}: {
  el: SlideElement;
  slideId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: (el: SlideElement) => void;
}) {
  const controls = useDragControls();
  const pushHistory = usePresentationStore((s) => s.pushHistory);
  const updateElement = usePresentationStore((s) => s.updateElement);
  const removeElement = usePresentationStore((s) => s.removeElement);
  const reorderElements = usePresentationStore((s) => s.reorderElements);

  return (
    <Reorder.Item
      as="div"
      value={el.id}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => pushHistory()}
      onClick={onSelect}
      className={cn(
        'group rounded-md border transition-colors cursor-pointer',
        isSelected
          ? 'border-primary/35 bg-primary/[0.06] ring-1 ring-primary/20'
          : 'border-transparent hover:border-neutral-200 hover:bg-white',
      )}
    >
      <div className="flex items-center gap-1.5 px-1.5 py-1.5">
        <button
          type="button"
          className="touch-none shrink-0 cursor-grab rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 active:cursor-grabbing"
          aria-label="Drag to reorder"
          onPointerDown={(e) => {
            e.stopPropagation();
            controls.start(e);
          }}
        >
          <GripVertical size={14} strokeWidth={2} />
        </button>

        <LayerRowThumbnail el={el} />

        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[12px] font-semibold', isSelected ? 'text-neutral-900' : 'text-neutral-700')}>
            {layerDisplayName(el)}
          </p>
          <p className="truncate text-[10px] tabular-nums text-neutral-500">
            {Math.round(el.width)} × {Math.round(el.height)}
            {el.locked ? ' · Locked' : ''}
            {el.visible === false ? ' · Hidden' : ''}
          </p>
        </div>

        <div
          className={cn(
            'flex shrink-0 items-center gap-0.5',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={controlBtn}
            title={el.visible !== false ? 'Hide' : 'Show'}
            onClick={() => updateElement(slideId, el.id, { visible: !el.visible })}
          >
            {el.visible !== false ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            type="button"
            className={controlBtn}
            title={el.locked ? 'Unlock' : 'Lock'}
            onClick={() => updateElement(slideId, el.id, { locked: !el.locked })}
          >
            {el.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button type="button" className={controlBtn} title="Bring forward"
            onClick={() => reorderElements(slideId, el.id, 'up', true)}>
            <ArrowUp size={13} />
          </button>
          <button type="button" className={controlBtn} title="Send backward"
            onClick={() => reorderElements(slideId, el.id, 'down', true)}>
            <ArrowDown size={13} />
          </button>
          <button type="button" className={controlBtn} title="Duplicate" onClick={() => onDuplicate(el)}>
            <Copy size={13} />
          </button>
          <button
            type="button"
            className={cn(controlBtn, 'hover:bg-red-50 hover:text-red-600')}
            title="Delete"
            onClick={() => removeElement(slideId, el.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
});

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
  const selectedId = editor.selectedElementId;
  const selectedElement = selectedId
    ? slide?.elements?.find((e) => e.id === selectedId)
    : undefined;

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

  const elementCount = displayIds.length;
  const countLabel = elementCount === 1 ? '1 element' : `${elementCount} elements`;

  return (
    <div
      id="tour-layers"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#F7F8FA] text-neutral-900"
    >
      <header className="shrink-0 border-b border-neutral-200 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold tracking-tight text-neutral-900">Layers</h3>
          <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium tabular-nums text-neutral-600">
            {countLabel}
          </span>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-neutral-500">
          Drag to reorder · Select a layer to edit properties below
        </p>
      </header>

      <div
        className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2"
        data-lenis-prevent
      >
        {displayIds.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[12px] font-medium text-neutral-500">No elements on this slide</p>
            <p className="mt-1 text-[10px] text-neutral-400">Use the tool rail to add content</p>
          </div>
        ) : (
          <Reorder.Group
            as="div"
            axis="y"
            values={displayIds}
            onReorder={handleReorder}
            className="flex flex-col gap-1"
          >
            {displayIds.map((id) => {
              const el = byId.get(id);
              if (!el) return null;
              return (
                <SortableLayerRow
                  key={id}
                  el={el}
                  slideId={slide!.id}
                  isSelected={selectedId === el.id}
                  onSelect={() => selectElement(el.id)}
                  onDuplicate={duplicateElement}
                />
              );
            })}
          </Reorder.Group>
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white flex flex-col max-h-[min(52%,420px)] min-h-0">
        {selectedElement && slide ? (
          <>
            <div className="shrink-0 border-b border-neutral-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Properties</p>
              <p className="truncate text-[12px] font-semibold text-neutral-900">{layerDisplayName(selectedElement)}</p>
            </div>
            <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3" data-lenis-prevent>
              <PropertyInspector element={selectedElement} slideId={slide.id} />
            </div>
          </>
        ) : (
          <div className="px-3 py-6 text-center">
            <p className="text-[11px] font-medium text-neutral-500">No selection</p>
            <p className="mt-0.5 text-[10px] text-neutral-400">Select a layer to edit properties</p>
          </div>
        )}
      </div>
    </div>
  );
}
