'use client';

import { useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, ArrowUp, ArrowDown,
  Type, Image, Square, BarChart2, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Bold, Italic, Upload, Copy,
} from 'lucide-react';
import { SlideElement } from '@/types';
import { ColorPicker } from './ColorPicker';

function ElementIcon({ type }: { type: SlideElement['type'] }) {
  switch (type) {
    case 'text':  return <Type      size={11} className="text-primary" />;
    case 'image': return <Image     size={11} className="text-secondary" />;
    case 'chart': return <BarChart2 size={11} className="text-accent" />;
    default:      return <Square    size={11} className="text-textMuted" />;
  }
}

// ─── Compact slider ───────────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[7px] font-black text-black/25 uppercase tracking-[0.2em]">{label}</span>
        <span className="text-[10px] font-bold text-black/60">{Math.round(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 accent-primary rounded-full"
      />
    </div>
  );
}

// ─── Property Editor ──────────────────────────────────────────────────────────
function PropertyEditor({ element, slideId }: { element: SlideElement; slideId: string }) {
  const { updateElement, setEditorState } = usePresentationStore();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const upd = (changes: Partial<SlideElement>) => updateElement(slideId, element.id, changes);
  const ts  = element.textStyle || {};
  const ss  = element.shapeStyle || {};

  const handleImageReplace = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => upd({ src: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">

      {/* ── TEXT ELEMENT ─────────────────────────────────────────────────── */}
      {element.type === 'text' && (
        <div className="space-y-3">
          {/* Content textarea */}
          <textarea
            value={element.content || ''}
            onChange={(e) => upd({ content: e.target.value })}
            className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl px-3 py-2 text-[12px] text-black/90 resize-none focus:outline-none focus:border-primary/40 focus:bg-white transition-all"
            rows={2}
            placeholder="Text content..."
          />

          {/* Size + Align */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/[0.02] px-3 py-1.5 rounded-xl border border-black/[0.03]">
              <label className="text-[7px] font-black text-black/25 uppercase tracking-[0.2em] mb-0.5 block">Size</label>
              <input
                type="number" min={6} max={200}
                value={ts.fontSize || 24}
                onChange={(e) => upd({ textStyle: { ...ts, fontSize: Number(e.target.value) } })}
                className="w-full bg-transparent text-[12px] h-5 font-bold text-black focus:outline-none"
              />
            </div>
            <div className="bg-black/[0.02] px-2 py-1.5 rounded-xl border border-black/[0.03]">
              <label className="text-[7px] font-black text-black/25 uppercase tracking-[0.2em] mb-0.5 block">Align</label>
              <div className="flex items-center gap-0.5">
                {[
                  { val: 'left',    icon: AlignLeft    },
                  { val: 'center',  icon: AlignCenter  },
                  { val: 'right',   icon: AlignRight   },
                  { val: 'justify', icon: AlignJustify },
                ].map((btn) => (
                  <button
                    key={btn.val}
                    onClick={() => upd({ textStyle: { ...ts, textAlign: btn.val as any } })}
                    className={`flex-1 flex items-center justify-center h-5 rounded-md transition-all ${
                      (ts.textAlign || 'left') === btn.val ? 'bg-primary text-white' : 'text-black/30 hover:bg-black/5'
                    }`}
                  >
                    <btn.icon size={10} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bold + Italic */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => upd({ textStyle: { ...ts, fontWeight: ts.fontWeight === 'bold' ? 'normal' : 'bold' } })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                ts.fontWeight === 'bold' ? 'bg-primary text-white' : 'bg-black/[0.03] text-black/50 hover:bg-black/[0.06]'
              }`}
            >
              <Bold size={12} /> Bold
            </button>
            <button
              onClick={() => upd({ textStyle: { ...ts, fontStyle: ts.fontStyle === 'italic' ? 'normal' : 'italic' } })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                ts.fontStyle === 'italic' ? 'bg-primary text-white' : 'bg-black/[0.03] text-black/50 hover:bg-black/[0.06]'
              }`}
            >
              <Italic size={12} /> Italic
            </button>
          </div>

          {/* Line height slider */}
          <Slider
            label="Line Height"
            value={(ts.lineHeight || 1.4) * 10}
            min={8} max={30} step={1}
            onChange={(v) => upd({ textStyle: { ...ts, lineHeight: v / 10 } })}
          />

          {/* Color */}
          <div className="bg-black/[0.02] px-3 py-1.5 rounded-xl border border-black/[0.03]">
            <label className="text-[7px] font-black text-black/25 uppercase tracking-[0.2em] mb-1 block">Color</label>
            <ColorPicker label="Text Color" variant="compact" color={ts.color || '#FFFFFF'}
              onChange={(c) => upd({ textStyle: { ...ts, color: c } })} />
          </div>
        </div>
      )}

      {/* ── IMAGE ELEMENT ────────────────────────────────────────────────── */}
      {element.type === 'image' && (
        <div className="space-y-3">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageReplace(f); e.target.value = ''; }} />
          {element.src && (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/10 border border-black/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={element.src} alt="element preview" className="w-full h-full object-cover" />
            </div>
          )}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all"
          >
            <Upload size={13} /> Replace Image
          </button>
          {/* Opacity for images */}
          <Slider label="Opacity" value={(element.opacity ?? 1) * 100} min={0} max={100}
            onChange={(v) => upd({ opacity: v / 100 })} />
        </div>
      )}

      {/* ── SHAPE ELEMENT ────────────────────────────────────────────────── */}
      {element.type === 'shape' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/[0.02] px-3 py-1.5 rounded-xl border border-black/[0.03]">
              <label className="text-[7px] font-black text-black/25 uppercase tracking-[0.2em] mb-1 block">Fill</label>
              <ColorPicker label="Fill" variant="compact" color={ss.fill || '#7B61FF'}
                onChange={(c) => upd({ shapeStyle: { ...ss, fill: c } })} />
            </div>
            <div className="bg-black/[0.02] px-3 py-1.5 rounded-xl border border-black/[0.03]">
              <label className="text-[7px] font-black text-black/25 uppercase tracking-[0.2em] mb-1 block">Stroke</label>
              <ColorPicker label="Stroke" variant="compact" color={ss.stroke || '#FFFFFF'}
                onChange={(c) => upd({ shapeStyle: { ...ss, stroke: c } })} />
            </div>
          </div>
          <Slider label="Stroke Width" value={ss.strokeWidth || 0} min={0} max={20}
            onChange={(v) => upd({ shapeStyle: { ...ss, strokeWidth: v } })} />
          <Slider label="Corner Radius" value={ss.cornerRadius || 0} min={0} max={100}
            onChange={(v) => upd({ shapeStyle: { ...ss, cornerRadius: v } })} />
        </div>
      )}

      {/* ── COMMON: Opacity + Geometry ────────────────────────────────────── */}
      {element.type !== 'image' && (
        <Slider label="Opacity" value={(element.opacity ?? 1) * 100} min={0} max={100}
          onChange={(v) => upd({ opacity: v / 100 })} />
      )}

      {/* ── Animation ────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-black/[0.05] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">Animation</span>
          <button
            onClick={() => {
              setEditorState({ previewElementId: element.id });
              setTimeout(() => setEditorState({ previewElementId: null }), 1600);
            }}
            className="text-[8px] font-black text-black/40 hover:text-black uppercase tracking-widest transition-colors"
          >▶ Preview</button>
        </div>

        {/* Safe animation helper — always builds a complete AnimationConfig */}
        {(() => {
          const anim = {
            entrance: (element.animation?.entrance || 'fadeIn') as import('@/types').AnimationEntrance,
            duration: element.animation?.duration ?? 600,
            delay:    element.animation?.delay    ?? 0,
          };
          return (
            <>
              <select
                value={anim.entrance}
                onChange={(e) => upd({ animation: { ...anim, entrance: e.target.value as import('@/types').AnimationEntrance } })}
                className="w-full bg-black/[0.02] border border-black/[0.06] rounded-lg px-3 py-2 text-[11px] font-bold text-black focus:outline-none appearance-none cursor-pointer"
              >
                <option value="none">None</option>
                <option value="fadeIn">Fade In</option>
                <option value="fadeSlideUp">Slide Up</option>
                <option value="fadeSlideLeft">Slide Left</option>
                <option value="zoomIn">Zoom In</option>
                <option value="reveal">Wipe Reveal</option>
                <option value="elasticScale">Elastic Scale</option>
                <option value="glitch">Glitch</option>
                <option value="bounceIn">Bounce In</option>
              </select>
              <Slider label="Duration (ms)" value={anim.duration} min={100} max={2000} step={100}
                onChange={(v) => upd({ animation: { ...anim, duration: v } })} />
              <Slider label="Delay (ms)" value={anim.delay} min={0} max={2000} step={50}
                onChange={(v) => upd({ animation: { ...anim, delay: v } })} />
            </>
          );
        })()}
      </div>

      {/* ── Geometry ─────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-black/[0.05]">
        <span className="text-[8px] font-black text-black/25 uppercase tracking-[0.3em] mb-2 block">Position & Size</span>
        <div className="grid grid-cols-2 gap-2">
          {(['x', 'y', 'width', 'height'] as const).map((prop) => (
            <div key={prop} className="bg-black/[0.02] px-3 py-1.5 rounded-lg border border-black/[0.03] flex items-center justify-between">
              <span className="text-[8px] font-black text-black/20 uppercase tracking-widest">{prop}</span>
              <input
                type="number"
                value={Math.round(element[prop] as number)}
                onChange={(e) => upd({ [prop]: Number(e.target.value) })}
                className="w-12 bg-transparent text-[10px] font-bold text-black text-right focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Layers Panel ────────────────────────────────────────────────────────
export function LayersPanel() {
  const {
    presentation,
    currentSlideIndex,
    editor,
    selectElement,
    updateElement,
    removeElement,
    reorderElements,
    addElement,
  } = usePresentationStore();

  const slide    = presentation?.slides[currentSlideIndex];
  const elements = [...(slide?.elements || [])].reverse();

  const duplicateElement = (el: SlideElement) => {
    if (!slide) return;
    const copy: SlideElement = {
      ...el,
      id: `el-copy-${Date.now()}`,
      x:  el.x + 20,
      y:  el.y + 20,
      zIndex: (slide.elements?.length || 0) + 1,
    };
    addElement(slide.id, copy);
    selectElement(copy.id);
  };

  return (
    <div id="tour-layers" className="flex flex-col h-full bg-[#FBFBFB] text-black overflow-hidden selection:bg-primary/20">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-black/[0.05] bg-white/40 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(123,97,255,0.4)]" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-black/80">Layers</h3>
        </div>
        <span className="text-[9px] font-bold text-black/40 uppercase tracking-widest bg-black/[0.03] px-2 py-1 rounded border border-black/[0.05]">
          {elements.length} elements
        </span>
      </div>

      {/* Layer List */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 overscroll-contain"
        data-lenis-prevent
      >
        <AnimatePresence mode="popLayout">
          {elements.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <p className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">No elements</p>
              <p className="text-[9px] text-black/15 mt-1">Use the toolbar above to add elements</p>
            </motion.div>
          ) : (
            elements.map((el, i) => {
              const isSelected = editor.selectedElementId === el.id;
              return (
                <motion.div
                  key={el.id} layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className={`group relative rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-white border-black/[0.08] shadow-premium ring-1 ring-primary/10'
                      : 'bg-transparent border-transparent hover:bg-black/[0.02]'
                  }`}
                  onClick={() => selectElement(isSelected ? null : el.id)}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      isSelected ? 'bg-primary text-white border-primary/20' : 'bg-black/[0.03] text-black/30 border-black/[0.05]'
                    }`}>
                      <ElementIcon type={el.type} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-bold truncate tracking-tight ${isSelected ? 'text-black' : 'text-black/60'}`}>
                        {el.type === 'text'
                          ? (el.content?.slice(0, 22) || 'Empty Text')
                          : `${(el.shapeType || el.type).charAt(0).toUpperCase() + (el.shapeType || el.type).slice(1)}`}
                      </p>
                      <p className="text-[9px] text-black/25">
                        {Math.round(el.x)}, {Math.round(el.y)} · {Math.round(el.width)}×{Math.round(el.height)}
                      </p>
                    </div>

                    {/* Quick controls */}
                    <div className={`flex items-center gap-0.5 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {/* Visibility */}
                      <button onClick={(e) => { e.stopPropagation(); slide && updateElement(slide.id, el.id, { visible: !el.visible }); }}
                        className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/30 hover:text-black transition-all"
                        title={el.visible !== false ? 'Hide' : 'Show'}>
                        {el.visible !== false ? <Eye size={10} /> : <EyeOff size={10} />}
                      </button>
                      {/* Lock */}
                      <button onClick={(e) => { e.stopPropagation(); slide && updateElement(slide.id, el.id, { locked: !el.locked }); }}
                        className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/30 hover:text-black transition-all"
                        title={el.locked ? 'Unlock' : 'Lock'}>
                        {el.locked ? <Lock size={10} /> : <Unlock size={10} />}
                      </button>
                      {/* Move up */}
                      <button onClick={(e) => { e.stopPropagation(); slide && reorderElements(slide.id, el.id, 'up'); }}
                        className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/30 hover:text-black transition-all">
                        <ArrowUp size={10} />
                      </button>
                      {/* Move down */}
                      <button onClick={(e) => { e.stopPropagation(); slide && reorderElements(slide.id, el.id, 'down'); }}
                        className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/30 hover:text-black transition-all">
                        <ArrowDown size={10} />
                      </button>
                      {/* Duplicate */}
                      <button onClick={(e) => { e.stopPropagation(); duplicateElement(el); }}
                        className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/30 hover:text-black transition-all"
                        title="Duplicate">
                        <Copy size={10} />
                      </button>
                      {/* Delete */}
                      <button onClick={(e) => { e.stopPropagation(); slide && removeElement(slide.id, el.id); }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-black/30 hover:text-red-500 transition-all">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Property Editor */}
                  <AnimatePresence>
                    {isSelected && slide && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="overflow-hidden border-t border-black/[0.04]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-4">
                          <PropertyEditor element={el} slideId={slide.id} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
