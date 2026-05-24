'use client';

import { useRef, useMemo, useCallback, memo, useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PPT_ANIMATION_HINT, PPT_STYLE_ENTRANCE_OPTIONS } from '@/lib/editor/pptAnimationCatalog';
import { EDITOR_GOOGLE_FONTS } from '@/lib/editor-fonts';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Eye, EyeOff, Lock, Unlock, Trash2, ArrowUp, ArrowDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic,
  Upload, Copy, GripVertical, Layers, Sparkles, Play,
  Type, Move, Palette, Zap, ChevronDown, RotateCcw,
  Strikethrough, Underline, Loader2, Wand2, Search
} from 'lucide-react';
import { SlideElement } from '@/types';
import { editorImageFetchUrl } from '@/lib/r2-public-url';
import { ColorPicker } from './ColorPicker';
import { LayerRowThumbnail } from './LayerRowThumbnail';
import { cn } from '@/lib/cn';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INPUT_CLS =
  'h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-[12px] font-medium text-neutral-900 placeholder:text-neutral-400 hover:bg-neutral-100 hover:border-neutral-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all';
const LABEL_CLS = 'text-[10px] font-semibold text-neutral-500 tracking-wide';

function AITextActions({ text, onUpdate }: { text: string; onUpdate: (newText: string) => void }) {
  const [loading, setLoading] = useState<string | null>(null);

  const applyAI = async (action: string) => {
    setLoading(action);
    try {
      const res = await fetch('/api/ai-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'API failed');
      }
      if (data.text) {
        onUpdate(data.text);
      }
    } catch (err: any) {
      alert('AI Text Magic failed: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2 mt-4 p-2 bg-neutral-50 rounded-lg border border-neutral-200/60">
      <div className="text-[10px] font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-neutral-500" />
        AI Magic Edit
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => applyAI('grammar')} disabled={!!loading} className="py-1.5 px-2 bg-white text-neutral-700 text-[10px] font-semibold rounded border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 transition-colors shadow-sm">
          {loading === 'grammar' ? '...' : 'Fix Grammar'}
        </button>
        <button onClick={() => applyAI('professional')} disabled={!!loading} className="py-1.5 px-2 bg-white text-neutral-700 text-[10px] font-semibold rounded border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 transition-colors shadow-sm">
          {loading === 'professional' ? '...' : 'Professional'}
        </button>
        <button onClick={() => applyAI('shorter')} disabled={!!loading} className="py-1.5 px-2 bg-white text-neutral-700 text-[10px] font-semibold rounded border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 transition-colors shadow-sm">
          {loading === 'shorter' ? '...' : 'Make Shorter'}
        </button>
        <button onClick={() => applyAI('tagalog')} disabled={!!loading} className="py-1.5 px-2 bg-white text-neutral-700 text-[10px] font-semibold rounded border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 transition-colors shadow-sm">
          {loading === 'tagalog' ? '...' : 'Translate Tagalog'}
        </button>
      </div>
    </div>
  );
}

// ─── Palette quick-pick ────────────────────────────────────────────────────────
const QUICK_COLORS = [
  '#FFFFFF', '#F8FAFC', '#1e293b', '#0f172a',
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#0009fa', '#EF4444', '#F97316',
  'transparent',
];

// ─── Section component ─────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  defaultOpen = true,
  badge,
  action,
  children,
}: {
  icon?: React.ElementType;
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-200/60 last:border-b-0 mb-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-neutral-50/80 transition-colors"
      >
        {Icon && <Icon size={14} className="shrink-0 text-primary" strokeWidth={2} />}
        <span className="flex-1 text-[11px] font-bold tracking-wide text-neutral-800">{title}</span>
        {badge && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            {badge}
          </span>
        )}
        {action && (
          <span className="shrink-0" onClick={(e) => e.stopPropagation()}>{action}</span>
        )}
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="shrink-0"
        >
          <ChevronDown size={13} className="text-neutral-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="px-3 pb-4 pt-1 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Premium Slider ───────────────────────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={LABEL_CLS}>{label}</span>
        <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-neutral-900 border border-neutral-200/60">
          {Math.round(value)}{unit}
        </span>
      </div>
      <div className="relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="absolute h-3.5 w-3.5 rounded-full bg-white border-2 border-neutral-900 shadow-sm pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
    </div>
  );
}

// ─── NumField pair ────────────────────────────────────────────────────────────
function NumField({ label, value, onChange, min, icon }: {
  label: string; value: number;
  onChange: (v: number) => void;
  min?: number; icon?: string;
}) {
  return (
    <div className="flex-1 space-y-1.5">
      <span className={LABEL_CLS}>{label}</span>
      <div className="relative group">
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400 pointer-events-none select-none group-focus-within:text-primary transition-colors">
            {icon}
          </span>
        )}
        <input
          type="number"
          min={min}
          value={Math.round(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(INPUT_CLS, icon ? 'pl-7' : '', 'font-mono tracking-tight')}
        />
      </div>
    </div>
  );
}

// ─── Color swatch row ─────────────────────────────────────────────────────────
export function SwatchRow({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {QUICK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(c)}
            className={cn(
              'h-5 w-5 rounded-md border-2 transition-all hover:scale-110 active:scale-95 cursor-pointer',
              color === c ? 'border-primary scale-110 shadow-md shadow-primary/20' : 'border-neutral-200/50 shadow-sm',
              c === 'transparent' && 'bg-white border-dashed border-neutral-300',
            )}
            style={c !== 'transparent' ? { background: c } : {}}
          >
            {c === 'transparent' && (
              <span className="block w-full h-full relative overflow-hidden rounded">
                <span className="absolute inset-0" style={{
                  background: 'linear-gradient(135deg, #ff4444 0%, #ff4444 45%, #fff 45%, #fff 55%, #ff4444 55%)',
                  opacity: 0.6,
                }} />
              </span>
            )}
          </button>
        ))}
      </div>
      <ColorPicker label="Custom" variant="compact" color={color} onChange={onChange} />
    </div>
  );
}

// ─── Font size stepper ────────────────────────────────────────────────────────
function FontSizeStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96, 120];
  return (
    <div className="flex items-center gap-1.5 h-8">
      <button
        type="button"
        onClick={() => { const prev = SIZES.filter(s => s < value).pop(); if (prev) onChange(prev); }}
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-indigo-300 text-lg font-light transition-all active:scale-95"
      >−</button>
      <input
        type="number"
        min={6} max={200}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-14 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 focus:bg-white text-center text-[12px] font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono"
      />
      <button
        type="button"
        onClick={() => { const next = SIZES.find(s => s > value); if (next) onChange(next); }}
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-indigo-300 text-lg font-light transition-all active:scale-95"
      >+</button>
    </div>
  );
}

// ─── Toggle pill button ───────────────────────────────────────────────────────
function PillToggle({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void;
  icon: React.ElementType; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all active:scale-95',
        active
          ? 'bg-primary text-white shadow-sm shadow-primary/20'
          : 'bg-neutral-50 border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300',
      )}
    >
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </button>
  );
}

// ─── Align row ────────────────────────────────────────────────────────────────
function AlignRow({ value, onChange }: {
  value: string;
  onChange: (v: 'left' | 'center' | 'right' | 'justify') => void;
}) {
  const opts = [
    { val: 'left' as const, icon: AlignLeft },
    { val: 'center' as const, icon: AlignCenter },
    { val: 'right' as const, icon: AlignRight },
    { val: 'justify' as const, icon: AlignJustify },
  ];
  return (
    <div className="grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1">
      {opts.map(({ val, icon: Icon }) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={cn(
            'flex items-center justify-center rounded-lg py-1.5 transition-all active:scale-95',
            value === val
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700',
          )}
        >
          <Icon size={13} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

// ─── layerDisplayName ─────────────────────────────────────────────────────────
function layerDisplayName(el: SlideElement): string {
  if (el.id.includes('el-bg-')) return 'Background';
  if (el.type === 'text') return el.content?.trim().slice(0, 36) || 'Text';
  const kind = el.shapeType || el.type;
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function layerTypeLabel(el: SlideElement): string {
  if (el.id.includes('el-bg-')) return 'Background';
  const map: Record<string, string> = {
    text: 'Text Layer',
    image: 'Image Layer',
    shape: el.shapeType ? `${el.shapeType.charAt(0).toUpperCase() + el.shapeType.slice(1)} Shape` : 'Shape Layer',
    icon: 'Icon Layer',
  };
  return map[el.type] || 'Layer';
}

// ─── Property Inspector ────────────────────────────────────────────────────────
function PropertyInspector({ element, slideId }: { element: SlideElement; slideId: string }) {
  const updateElement = usePresentationStore((s) => s.updateElement);
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const setActivePanel = usePresentationStore((s) => s.setActivePanel);
  const setPanelOpen = usePresentationStore((s) => s.setPanelOpen);
  const selectElement = usePresentationStore((s) => s.selectElement);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [removeBgError, setRemoveBgError] = useState('');
  
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

  const handleRemoveBg = async () => {
    if (!element.src) return;
    setIsRemovingBg(true);
    setRemoveBgError('');
    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: element.src }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove background');
      
      upd({ src: data.image });
    } catch (err: any) {
      setRemoveBgError(err.message);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleGenerateWithAI = () => {
    selectElement(element.id);
    if (element.src?.trim()) {
      upd({ src: '' });
    }
    setEditorState({
      generativeFillTarget: { slideId, elementId: element.id },
      activeTool: 'select',
    });
  };

  const handleSearchStockPhotos = () => {
    setActivePanel('photos');
    setPanelOpen(true);
  };

  return (
    <div className="space-y-0">

      {/* ── Transform ─────────────────────────────────────────── */}
      <Section icon={Move} title="Transform" defaultOpen>
        <div className="grid grid-cols-2 gap-1.5">
          <NumField icon="X" label="Position X" value={element.x} onChange={(v) => upd({ x: v })} />
          <NumField icon="Y" label="Position Y" value={element.y} onChange={(v) => upd({ y: v })} />
          <NumField icon="W" label="Width" value={element.width} min={1} onChange={(v) => upd({ width: Math.max(1, v) })} />
          <NumField icon="H" label="Height" value={element.height} min={1} onChange={(v) => upd({ height: Math.max(1, v) })} />
        </div>
        {element.rotation !== undefined && element.rotation !== 0 && (
          <div className="flex items-center gap-2">
            <Slider label="Rotation" value={element.rotation || 0} min={-180} max={180} unit="°"
              onChange={(v) => upd({ rotation: v })} />
            <button
              type="button"
              onClick={() => upd({ rotation: 0 })}
              className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
              title="Reset rotation"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        )}
      </Section>

      {/* ── Text ──────────────────────────────────────────────── */}
      {element.type === 'text' && (
        <Section icon={Type} title="Typography" defaultOpen>
          {/* Content */}
          <div className="space-y-1">
            <span className={LABEL_CLS}>Content</span>
            <textarea
              value={element.content || ''}
              onChange={(e) => upd({ content: e.target.value })}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 focus:bg-white px-3 py-2.5 text-[12px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              rows={3}
              placeholder="Enter text content…"
            />
          </div>

          {/* Font Family */}
          <div className="space-y-1">
            <span className={LABEL_CLS}>Font Family</span>
            <select
              value={ts.fontFamily || 'Inter'}
              onChange={(e) => upd({ textStyle: { ...ts, fontFamily: e.target.value } })}
              className={INPUT_CLS}
              style={{ fontFamily: ts.fontFamily || 'Inter' }}
            >
              {EDITOR_GOOGLE_FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
              ))}
            </select>
          </div>

          {/* Size + Weight + Style */}
          <div className="space-y-1">
            <span className={LABEL_CLS}>Size</span>
            <FontSizeStepper value={ts.fontSize || 24} onChange={(v) => upd({ textStyle: { ...ts, fontSize: v } })} />
          </div>

          {/* Style toggles */}
          <div className="flex gap-1.5">
            <PillToggle
              active={ts.fontWeight === 'bold'}
              onClick={() => upd({ textStyle: { ...ts, fontWeight: ts.fontWeight === 'bold' ? 'normal' : 'bold' } })}
              icon={Bold} label="Bold"
            />
            <PillToggle
              active={ts.fontStyle === 'italic'}
              onClick={() => upd({ textStyle: { ...ts, fontStyle: ts.fontStyle === 'italic' ? 'normal' : 'italic' } })}
              icon={Italic} label="Italic"
            />
            <PillToggle
              active={ts.textDecoration === 'underline'}
              onClick={() => upd({ textStyle: { ...ts, textDecoration: ts.textDecoration === 'underline' ? 'none' : 'underline' } })}
              icon={Underline} label="U"
            />
            <PillToggle
              active={ts.textDecoration === 'line-through'}
              onClick={() => upd({ textStyle: { ...ts, textDecoration: ts.textDecoration === 'line-through' ? 'none' : 'line-through' } })}
              icon={Strikethrough} label="S"
            />
          </div>

          {/* Alignment */}
          <div className="space-y-1">
            <span className={LABEL_CLS}>Alignment</span>
            <AlignRow
              value={ts.textAlign || 'left'}
              onChange={(v) => upd({ textStyle: { ...ts, textAlign: v } })}
            />
          </div>

          {/* Spacing */}
          <Slider
            label="Line height"
            value={(ts.lineHeight || 1.4) * 10}
            min={8} max={30} step={1}
            onChange={(v) => upd({ textStyle: { ...ts, lineHeight: v / 10 } })}
          />
          <Slider
            label="Letter spacing"
            value={ts.letterSpacing || 0}
            min={-5} max={20} step={0.5} unit="px"
            onChange={(v) => upd({ textStyle: { ...ts, letterSpacing: v } })}
          />

          {/* Color */}
          <div className="space-y-1">
            <span className={LABEL_CLS}>Color</span>
            <SwatchRow color={ts.color || '#FFFFFF'} onChange={(c) => upd({ textStyle: { ...ts, color: c } })} />
          </div>

          <AITextActions text={element.content || ''} onUpdate={(newText) => upd({ content: newText })} />
        </Section>
      )}

      {/* ── Image ─────────────────────────────────────────────── */}
      {element.type === 'image' && (
        <Section icon={Upload} title="Image" defaultOpen>
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
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 group">
              {element.src.split('?')[0].endsWith('.mp4') ? (
                element.content ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={element.content} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={element.src} muted className="h-full w-full object-cover" />
                )
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={editorImageFetchUrl(element.src)} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-neutral-900 shadow-lg backdrop-blur-sm"
                >
                  Replace
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[12px] font-bold text-white shadow-sm hover:bg-primaryHover hover:shadow-md transition-all active:scale-[0.98]"
          >
            <Upload size={14} strokeWidth={2.5} />
            {element.src ? 'Replace Image' : 'Upload Image'}
          </button>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleGenerateWithAI}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-[12px] font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 transition-all active:scale-[0.98]"
            >
              <Sparkles size={14} strokeWidth={2.5} />
              Generate with AI
            </button>
            <button
              type="button"
              onClick={handleSearchStockPhotos}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-[12px] font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 transition-all active:scale-[0.98]"
            >
              <Search size={14} strokeWidth={2.5} />
              Search Stock Photos
            </button>
            {element.src && !element.src.includes('api.iconify.design') && (
              <button
                type="button"
                onClick={handleRemoveBg}
                disabled={isRemovingBg}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white text-[12px] font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRemovingBg ? (
                  <>
                    <Loader2 size={14} className="animate-spin" strokeWidth={2.5} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 size={14} strokeWidth={2.5} />
                    AI Remove BG
                  </>
                )}
              </button>
            )}
          </div>
          {removeBgError && (
            <p className="pt-1 text-[10px] text-red-500 font-medium text-center">{removeBgError}</p>
          )}

          {element.src?.includes('api.iconify.design') && (
            <div className="mt-4 space-y-1 pt-3 border-t border-neutral-100">
              <span className={LABEL_CLS}>Icon Color</span>
              <SwatchRow 
                color={(() => {
                  const match = element.src?.match(/color=%23([0-9A-Fa-f]{6})/);
                  return match ? `#${match[1]}` : '#000000';
                })()}
                onChange={(c) => {
                  const hex = c.replace('#', '');
                  let newSrc = element.src!;
                  if (newSrc.includes('color=%23')) {
                    newSrc = newSrc.replace(/color=%23[0-9A-Fa-f]{6}/, `color=%23${hex}`);
                  } else {
                    newSrc = `${newSrc}${newSrc.includes('?') ? '&' : '?'}color=%23${hex}`;
                  }
                  upd({ src: newSrc });
                }}
              />
            </div>
          )}
          <Slider
            label="Opacity"
            value={(element.opacity ?? 1) * 100}
            min={0} max={100} unit="%"
            onChange={(v) => upd({ opacity: v / 100 })}
          />
          <div className="pt-2 border-t border-neutral-100 mt-2 space-y-3">
            <Slider
              label="Image Pan X"
              value={(element.cropPositionX ?? 0.5) * 100}
              min={0} max={100} unit="%"
              onChange={(v) => upd({ cropPositionX: v / 100 })}
            />
            <Slider
              label="Image Pan Y"
              value={(element.cropPositionY ?? 0.5) * 100}
              min={0} max={100} unit="%"
              onChange={(v) => upd({ cropPositionY: v / 100 })}
            />
          </div>
          {element.maskType && element.maskType !== 'none' && (
            <div className="rounded-lg bg-indigo-50 px-3 py-2 flex items-center gap-2">
              <Sparkles size={12} className="text-indigo-500 shrink-0" />
              <span className="text-[10px] font-semibold text-indigo-600 capitalize">{element.maskType} mask applied</span>
            </div>
          )}
        </Section>
      )}

      {/* ── Shape ─────────────────────────────────────────────── */}
      {element.type === 'shape' && (
        <Section icon={Palette} title="Fill & Stroke" defaultOpen>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className={LABEL_CLS}>Fill Color</span>
              <SwatchRow color={ss.fill || '#6366F1'} onChange={(c) => upd({ shapeStyle: { ...ss, fill: c } })} />
            </div>
            <div className="space-y-1.5">
              <span className={LABEL_CLS}>Stroke Color</span>
              <SwatchRow color={ss.stroke || 'transparent'} onChange={(c) => upd({ shapeStyle: { ...ss, stroke: c } })} />
            </div>
          </div>
          <Slider label="Stroke Width" value={ss.strokeWidth || 0} min={0} max={20} unit="px"
            onChange={(v) => upd({ shapeStyle: { ...ss, strokeWidth: v } })} />
          {(!element.shapeType || element.shapeType === 'rect') && (
            <Slider label="Corner Radius" value={ss.cornerRadius || 0} min={0} max={100} unit="px"
              onChange={(v) => upd({ shapeStyle: { ...ss, cornerRadius: v } })} />
          )}
          <div className="space-y-2 border-t border-neutral-100 pt-2.5">
            <span className={LABEL_CLS}>Shadow</span>
            <SwatchRow
              color={ss.shadowColor || 'rgba(0,0,0,0.3)'}
              onChange={(c) => upd({ shapeStyle: { ...ss, shadowColor: c } })}
            />
            <Slider label="Blur" value={ss.shadowBlur || 0} min={0} max={60} unit="px"
              onChange={(v) => upd({ shapeStyle: { ...ss, shadowBlur: v } })} />
            <div className="grid grid-cols-2 gap-1.5">
              <Slider label="Offset X" value={ss.shadowOffsetX || 0} min={-30} max={30}
                onChange={(v) => upd({ shapeStyle: { ...ss, shadowOffsetX: v } })} />
              <Slider label="Offset Y" value={ss.shadowOffsetY || 0} min={-30} max={30}
                onChange={(v) => upd({ shapeStyle: { ...ss, shadowOffsetY: v } })} />
            </div>
          </div>
        </Section>
      )}

      {/* ── Appearance ────────────────────────────────────────── */}
      {element.type !== 'image' && (
        <Section icon={Palette} title="Appearance">
          <Slider
            label="Opacity"
            value={(element.opacity ?? 1) * 100}
            min={0} max={100} unit="%"
            onChange={(v) => upd({ opacity: v / 100 })}
          />
        </Section>
      )}

      {/* ── Animation ─────────────────────────────────────────── */}
      <Section
        icon={Zap}
        title="Animation"
        defaultOpen={false}
        badge={anim.entrance !== 'none' ? 'ON' : undefined}
        action={
          <button
            type="button"
            onClick={() => {
              const ms = Math.min(4500, anim.delay + anim.duration + 500);
              setEditorState({ previewElementId: element.id });
              setTimeout(() => setEditorState({ previewElementId: null }), ms);
            }}
            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            <Play size={9} strokeWidth={2.5} className="fill-indigo-600" />
            Preview
          </button>
        }
      >
        <div className="space-y-1">
          <span className={LABEL_CLS}>Entrance Effect</span>
          <select
            value={anim.entrance}
            onChange={(e) => upd({ animation: { ...anim, entrance: e.target.value as import('@/types').AnimationEntrance } })}
            className={INPUT_CLS}
          >
            {PPT_STYLE_ENTRANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {anim.entrance !== 'none' && (
          <>
            <Slider label="Duration" value={anim.duration} min={100} max={2000} step={100} unit="ms"
              onChange={(v) => upd({ animation: { ...anim, duration: v } })} />
            <Slider label="Delay" value={anim.delay} min={0} max={2000} step={50} unit="ms"
              onChange={(v) => upd({ animation: { ...anim, delay: v } })} />
          </>
        )}
        <p className="text-[9.5px] leading-relaxed text-neutral-400 bg-neutral-50 rounded-lg px-2.5 py-2">
          {PPT_ANIMATION_HINT}
        </p>
      </Section>
    </div>
  );
}

// ─── Sortable Layer Row ────────────────────────────────────────────────────────
const SortableLayerRow = memo(function SortableLayerRow({
  el,
  slideId,
  isSelected,
  onSelect,
  onDuplicate,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDragEnd,
}: {
  el: SlideElement;
  slideId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: (el: SlideElement) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}) {
  const updateElement = usePresentationStore((s) => s.updateElement);
  const removeElement = usePresentationStore((s) => s.removeElement);
  const reorderElements = usePresentationStore((s) => s.reorderElements);

  const isHidden = el.visible === false;
  const isLocked = el.locked;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onClick={onSelect}
      className={cn(
        'group relative rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden',
        isSelected
          ? 'border-indigo-300/60 bg-gradient-to-r from-indigo-50/80 to-violet-50/60 shadow-md shadow-indigo-100/50 ring-1 ring-indigo-200/60'
          : 'border-transparent hover:border-neutral-200 hover:bg-white hover:shadow-sm',
      )}
    >
      {/* Selection accent bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl bg-gradient-to-b from-indigo-500 to-violet-500" />
      )}

      <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-2 pointer-events-none">
        {/* Drag handle */}
        <div
          className="shrink-0 cursor-grab rounded-lg p-1 text-neutral-300 hover:text-neutral-500 transition-colors pointer-events-auto"
          aria-label="Drag to reorder"
        >
          <GripVertical size={13} strokeWidth={2} />
        </div>

        {/* Thumbnail */}
        <LayerRowThumbnail el={el} />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={cn(
            'truncate text-[12px] font-semibold leading-tight',
            isSelected ? 'text-indigo-900' : isHidden ? 'text-neutral-400' : 'text-neutral-800',
          )}>
            {layerDisplayName(el)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9.5px] font-medium text-neutral-400 tabular-nums">
              {Math.round(el.width)}×{Math.round(el.height)}
            </span>
            {isLocked && (
              <span className="rounded bg-amber-50 px-1 text-[8px] font-bold text-amber-500">LOCK</span>
            )}
            {isHidden && (
              <span className="rounded bg-neutral-100 px-1 text-[8px] font-bold text-neutral-400">HIDDEN</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className={cn(
            'flex shrink-0 items-center gap-0.5 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          <ActionBtn
            title={isHidden ? 'Show' : 'Hide'}
            onClick={() => updateElement(slideId, el.id, { visible: !isHidden }, true)}
            active={isHidden}
          >
            {isHidden ? <EyeOff size={12} strokeWidth={2} /> : <Eye size={12} strokeWidth={2} />}
          </ActionBtn>
          <ActionBtn
            title={isLocked ? 'Unlock' : 'Lock'}
            onClick={() => updateElement(slideId, el.id, { locked: !isLocked }, true)}
            active={isLocked}
            activeClass="text-amber-500 bg-amber-50 hover:bg-amber-100"
          >
            {isLocked ? <Lock size={12} strokeWidth={2} /> : <Unlock size={12} strokeWidth={2} />}
          </ActionBtn>
          <ActionBtn title="Move up" onClick={() => reorderElements(slideId, el.id, 'up', true)}>
            <ArrowUp size={12} strokeWidth={2} />
          </ActionBtn>
          <ActionBtn title="Move down" onClick={() => reorderElements(slideId, el.id, 'down', true)}>
            <ArrowDown size={12} strokeWidth={2} />
          </ActionBtn>
          <ActionBtn title="Duplicate" onClick={() => onDuplicate(el)}>
            <Copy size={12} strokeWidth={2} />
          </ActionBtn>
          <ActionBtn
            title="Delete"
            onClick={() => removeElement(slideId, el.id)}
            hoverClass="hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={12} strokeWidth={2} />
          </ActionBtn>
        </div>
      </div>
    </div>
  );
});

function ActionBtn({
  title,
  onClick,
  children,
  active,
  activeClass,
  hoverClass,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  activeClass?: string;
  hoverClass?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        'h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-neutral-400 transition-all active:scale-90',
        active ? (activeClass || 'text-indigo-500 bg-indigo-50') : '',
        hoverClass || 'hover:bg-neutral-100 hover:text-neutral-700',
      )}
    >
      {children}
    </button>
  );
}

// ─── Main LayersPanel ─────────────────────────────────────────────────────────
export function LayersPanel() {
  const {
    currentSlideIndex,
    selectedId,
    selectElement,
    addElement,
    setElementsOrder,
    slide,
  } = usePresentationStore(
    useShallow((s) => ({
      currentSlideIndex: s.currentSlideIndex,
      selectedId: s.editor.selectedElementId,
      selectElement: s.selectElement,
      addElement: s.addElement,
      setElementsOrder: s.setElementsOrder,
      slide: s.presentation?.slides[s.currentSlideIndex],
    }))
  );

  const [activeTab, setActiveTab] = useState<'layers' | 'properties'>('layers');

  const selectedElement = selectedId
    ? slide?.elements?.find((e) => e.id === selectedId)
    : undefined;

  // Auto-switch tabs based on selection
  useEffect(() => {
    if (selectedId) {
      setActiveTab('properties');
    } else {
      setActiveTab('layers');
    }
  }, [selectedId]);

  const displayIds = useMemo(
    () => [...(slide?.elements || [])].reverse().map((e) => e.id),
    [slide?.elements],
  );

  const byId = useMemo(() => {
    const m = new Map<string, SlideElement>();
    for (const e of slide?.elements || []) m.set(e.id, e);
    return m;
  }, [slide?.elements]);

  const duplicateElement = useCallback((el: SlideElement) => {
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
  }, [slide, addElement, selectElement]);

  const [localIds, setLocalIds] = useState<string[]>([]);
  const draggedItemIndex = useRef<number | null>(null);

  useEffect(() => {
    if (draggedItemIndex.current === null) {
      setLocalIds(displayIds);
    }
  }, [displayIds]);

  const handleDragStart = useCallback((index: number, e: React.DragEvent) => {
    draggedItemIndex.current = index;
    usePresentationStore.getState().pushHistory();
    // Required for Firefox
    e.dataTransfer.effectAllowed = 'move';
    // A transparent image or minimal data to hide default ghost if desired, but default is fine
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', localIds[index]);
    }
  }, [localIds]);

  const handleDragEnter = useCallback((index: number, e: React.DragEvent) => {
    e.preventDefault();
    const draggedIdx = draggedItemIndex.current;
    if (draggedIdx === null || draggedIdx === index) return;

    // Reorder locally
    setLocalIds((prev) => {
      const newIds = [...prev];
      const [draggedId] = newIds.splice(draggedIdx, 1);
      newIds.splice(index, 0, draggedId);
      return newIds;
    });

    // Update current drag index
    draggedItemIndex.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedItemIndex.current = null;
    if (slide) setElementsOrder(slide.id, localIds, false);
  }, [slide, localIds, setElementsOrder]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  }, []);

  const elementCount = displayIds.length;

  return (
    <div
      id="tour-layers"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#F7F8FA]"
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-neutral-200/80 bg-white px-3 pt-3 pb-0">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-neutral-900 flex items-center justify-center shadow-sm">
              <Layers size={12} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-[13px] font-bold tracking-tight text-neutral-900">
              {activeTab === 'layers' ? 'Layers' : selectedElement ? layerTypeLabel(selectedElement) : 'Properties'}
            </h3>
          </div>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-neutral-500">
            {elementCount} {elementCount === 1 ? 'layer' : 'layers'}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 rounded-t-lg overflow-hidden border-b-0">
          {(['layers', 'properties'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-2 text-[11px] font-bold tracking-wide transition-all relative',
                activeTab === tab
                  ? 'text-indigo-600'
                  : 'text-neutral-400 hover:text-neutral-600',
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                />
              )}
              {tab === 'properties' && selectedElement && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 align-middle" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar" data-lenis-prevent>
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'layers' ? (
            <motion.div
              key="layers"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="p-2"
            >
              {displayIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center mb-3">
                    <Layers size={20} className="text-neutral-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-[12px] font-semibold text-neutral-500">No elements</p>
                  <p className="mt-1 text-[10px] text-neutral-400 max-w-[140px]">
                    AI will add elements when you generate a slide
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {localIds.map((id, index) => {
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
                        onDragStart={(e) => handleDragStart(index, e)}
                        onDragEnter={(e) => handleDragEnter(index, e)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="properties"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="p-2"
            >
              {selectedElement && slide ? (
                <PropertyInspector element={selectedElement} slideId={slide.id} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center mb-3">
                    <Sparkles size={20} className="text-indigo-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-[12px] font-semibold text-neutral-500">No selection</p>
                  <p className="mt-1 text-[10px] text-neutral-400 max-w-[140px]">
                    Click any layer or element on the canvas to edit its properties
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('layers')}
                    className="mt-4 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-bold text-neutral-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                  >
                    Browse Layers
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
