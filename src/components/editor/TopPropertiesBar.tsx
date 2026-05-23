'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  RotateCcw,
  Link, Link2Off,
} from 'lucide-react';
import type { TextStyle, SlideElement } from '@/types';
import { ColorPicker } from '@/components/editor/ColorPicker';

// ── Helpers ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="w-px h-5 bg-black/[0.09] shrink-0 mx-2" />;
}

interface BtnProps {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}
function Btn({ active, title, onClick, children, disabled, className }: BtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      className={`
        flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100 shrink-0 select-none
        ${active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-neutral-600 hover:bg-black/[0.06] hover:text-neutral-900'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className ?? ''}
      `}
    >
      {children}
    </button>
  );
}

// Compact numeric input for X, Y, W, H, Rotation, Opacity
interface NumInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  width?: string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}
function NumInput({ label, value, min, max, step = 1, unit, width = 'w-14', onChange, onCommit }: NumInputProps) {
  const [localVal, setLocalVal] = useState(String(Math.round(value)));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocalVal(String(Math.round(value)));
  }, [value, focused]);

  const commit = () => {
    const n = parseFloat(localVal);
    if (!isNaN(n)) {
      const clamped = max !== undefined ? Math.min(max, Math.max(min ?? -Infinity, n)) : Math.max(min ?? -Infinity, n);
      onCommit(clamped);
      setLocalVal(String(Math.round(clamped)));
    } else {
      setLocalVal(String(Math.round(value)));
    }
  };

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">{label}</span>
        <div className={`relative flex items-center ${width} h-7 rounded-md bg-white border border-neutral-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/20 transition-all`}>
          <input
            type="number"
            value={localVal}
            min={min}
            max={max}
            step={step}
            onFocus={(e) => { setFocused(true); e.target.select(); }}
            onBlur={() => { setFocused(false); commit(); }}
            onChange={(e) => {
              setLocalVal(e.target.value);
              const n = parseFloat(e.target.value);
              if (!isNaN(n)) onChange(n);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.currentTarget.blur(); }
              if (e.key === 'ArrowUp') { e.preventDefault(); const n = Math.min(max ?? Infinity, (parseFloat(localVal) || 0) + (e.shiftKey ? 10 : step)); setLocalVal(String(Math.round(n))); onChange(n); }
              if (e.key === 'ArrowDown') { e.preventDefault(); const n = Math.max(min ?? -Infinity, (parseFloat(localVal) || 0) - (e.shiftKey ? 10 : step)); setLocalVal(String(Math.round(n))); onChange(n); }
            }}
            className="w-full bg-transparent text-[11px] font-semibold text-neutral-800 text-center tabular-nums outline-none px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && <span className="absolute right-1.5 text-[9px] text-neutral-400 select-none pointer-events-none">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

import { FontPicker } from '@/components/editor/FontPicker';

export function TopPropertiesBar() {
  const { selectedElementId } = usePresentationStore(
    useShallow((s) => ({ selectedElementId: s.editor.selectedElementId }))
  );

  const slide = usePresentationStore((s) => s.presentation?.slides[s.currentSlideIndex]);
  const colorPalette = usePresentationStore((s) => s.presentation?.colorPalette ?? []);
  const updateElement = usePresentationStore((s) => s.updateElement);

  const el = slide?.elements?.find((e) => e.id === selectedElementId);
  const show = !!(el && slide && !el.id.startsWith('bg-'));

  const [lockRatio, setLockRatio] = useState(false);
  const aspectRatio = useRef(1);

  useEffect(() => {
    if (el) aspectRatio.current = el.width / Math.max(1, el.height);
  }, [el?.id]);

  const update = useCallback((updates: Partial<SlideElement>, saveHistory = false) => {
    if (!slide || !el) return;
    updateElement(slide.id, el.id, updates, saveHistory);
  }, [slide, el, updateElement]);

  const commitUpdate = useCallback((updates: Partial<SlideElement>) => {
    update(updates, true);
  }, [update]);

  // If no element is selected, still render the bar so the layout doesn't shift
  if (!show || !el || !slide) {
    return (
      <div className="w-full h-12 bg-[#F9FAFB] border-b border-gray-200 flex items-center justify-center px-4 shrink-0 overflow-x-auto scrollbar-none hidden md:flex z-10 relative">
        <span className="text-[11px] font-medium text-neutral-400 select-none">No element selected</span>
      </div>
    );
  }

  const ts: TextStyle = el.textStyle ?? {};
  const isText = el.type === 'text';
  const isImage = el.type === 'image';
  const rotation = el.rotation ?? 0;
  const opacity = Math.round((el.opacity ?? 1) * 100);

  const isBold = ts.fontWeight === 'bold';
  const isItalic = ts.fontStyle === 'italic';
  const isUnderline = ts.textDecoration === 'underline';
  const align = ts.textAlign ?? 'left';
  const fontSize = ts.fontSize ?? 24;
  const textColor = ts.color ?? '#FFFFFF';
  const fontFamily = ts.fontFamily ?? 'Inter';

  return (
    <div className="w-full h-12 bg-[#F9FAFB] border-b border-gray-200 flex justify-center items-center px-4 shrink-0 overflow-x-auto scrollbar-none hidden md:flex z-10 relative">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-4 h-full"
          >
            {/* ── Position & Size ─────────────────────────────── */}
            <div className="flex items-center gap-3">
              <NumInput
                label="X"
                value={el.x}
                step={1}
                width="w-14"
                onChange={(v) => update({ x: v })}
                onCommit={(v) => commitUpdate({ x: v })}
              />
              <NumInput
                label="Y"
                value={el.y}
                step={1}
                width="w-14"
                onChange={(v) => update({ y: v })}
                onCommit={(v) => commitUpdate({ y: v })}
              />
            </div>

            <Divider />

            <div className="flex items-center gap-3">
              <NumInput
                label="W"
                value={el.width}
                min={1}
                step={1}
                width="w-16"
                onChange={(v) => {
                  if (lockRatio) update({ width: v, height: Math.round(v / aspectRatio.current) });
                  else update({ width: v });
                }}
                onCommit={(v) => {
                  if (lockRatio) commitUpdate({ width: v, height: Math.round(v / aspectRatio.current) });
                  else commitUpdate({ width: v });
                }}
              />

              {/* Lock ratio toggle */}
              <button
                type="button"
                title={lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                onMouseDown={(e) => { e.preventDefault(); setLockRatio(!lockRatio); }}
                className={`flex items-center justify-center w-6 h-6 rounded transition-all ${lockRatio ? 'text-indigo-600 bg-indigo-50' : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200'}`}
              >
                {lockRatio ? <Link size={12} strokeWidth={2.5} /> : <Link2Off size={12} strokeWidth={2} />}
              </button>

              <NumInput
                label="H"
                value={el.height}
                min={1}
                step={1}
                width="w-16"
                onChange={(v) => {
                  if (lockRatio) update({ height: v, width: Math.round(v * aspectRatio.current) });
                  else update({ height: v });
                }}
                onCommit={(v) => {
                  if (lockRatio) commitUpdate({ height: v, width: Math.round(v * aspectRatio.current) });
                  else commitUpdate({ height: v });
                }}
              />
            </div>

            <Divider />

            {/* Rotation */}
            <div className="flex items-center gap-1">
              <NumInput
                label="Angle"
                value={rotation}
                min={-360}
                max={360}
                step={1}
                unit="°"
                width="w-14"
                onChange={(v) => update({ rotation: v })}
                onCommit={(v) => commitUpdate({ rotation: v })}
              />
              {rotation !== 0 && (
                <button
                  type="button"
                  title="Reset rotation"
                  onMouseDown={(e) => { e.preventDefault(); commitUpdate({ rotation: 0 }); }}
                  className="flex items-center justify-center w-6 h-6 rounded text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors ml-1"
                >
                  <RotateCcw size={12} strokeWidth={2} />
                </button>
              )}
            </div>

            <Divider />

            {/* Opacity */}
            <NumInput
              label="Opacity"
              value={opacity}
              min={0}
              max={100}
              step={1}
              unit="%"
              width="w-14"
              onChange={(v) => update({ opacity: v / 100 })}
              onCommit={(v) => commitUpdate({ opacity: v / 100 })}
            />

            {/* ── Text-specific controls ───────────────────────── */}
            {isText && (
              <>
                <Divider />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">Font</span>
                  <FontPicker
                    value={fontFamily}
                    onChange={(font) => updateElement(slide.id, el.id, { textStyle: { ...ts, fontFamily: font } }, true)}
                  />
                </div>
                
                <Divider />
                
                <div className="flex items-center gap-1">
                  <Btn active={isBold} title="Bold (Ctrl+B)" onClick={() => updateElement(slide.id, el.id, { textStyle: { ...ts, fontWeight: isBold ? 'normal' : 'bold' } }, true)}>
                    <Bold size={14} strokeWidth={2.5} />
                  </Btn>
                  <Btn active={isItalic} title="Italic (Ctrl+I)" onClick={() => updateElement(slide.id, el.id, { textStyle: { ...ts, fontStyle: isItalic ? 'normal' : 'italic' } }, true)}>
                    <Italic size={14} strokeWidth={2.2} />
                  </Btn>
                  <Btn active={isUnderline} title="Underline" onClick={() => updateElement(slide.id, el.id, { textStyle: { ...ts, textDecoration: isUnderline ? 'none' : 'underline' } }, true)}>
                    <Underline size={14} strokeWidth={2.2} />
                  </Btn>
                </div>
                
                <Divider />
                
                <div className="flex items-center gap-1">
                  <Btn active={align === 'left'} title="Align left" onClick={() => updateElement(slide.id, el.id, { textStyle: { ...ts, textAlign: 'left' } }, true)}>
                    <AlignLeft size={14} />
                  </Btn>
                  <Btn active={align === 'center'} title="Align center" onClick={() => updateElement(slide.id, el.id, { textStyle: { ...ts, textAlign: 'center' } }, true)}>
                    <AlignCenter size={14} />
                  </Btn>
                  <Btn active={align === 'right'} title="Align right" onClick={() => updateElement(slide.id, el.id, { textStyle: { ...ts, textAlign: 'right' } }, true)}>
                    <AlignRight size={14} />
                  </Btn>
                </div>
                
                <Divider />
                
                <div className="flex items-center gap-3">
                  <NumInput
                    label="Size"
                    value={fontSize}
                    min={4}
                    max={300}
                    step={1}
                    width="w-14"
                    onChange={(v) => updateElement(slide.id, el.id, { textStyle: { ...ts, fontSize: v } })}
                    onCommit={(v) => updateElement(slide.id, el.id, { textStyle: { ...ts, fontSize: v } }, true)}
                  />
                  <ColorPicker
                    variant="toolbar"
                    label="Text color"
                    triggerLabel="Color"
                    color={textColor}
                    palettePresets={colorPalette}
                    onChange={(c) =>
                      updateElement(slide.id, el.id, { textStyle: { ...ts, color: c } }, true)
                    }
                  />
                </div>
              </>
            )}

            {/* ── Image fit ────────────────────────────────────── */}
            {isImage && el.src && (
              <>
                <Divider />
                <div className="flex items-center gap-1 bg-neutral-200/50 p-1 rounded-md">
                  {(['cover', 'contain', 'fill'] as const).map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); commitUpdate({ objectFit: fit }); }}
                      className={`px-3 h-7 text-[11px] font-semibold rounded transition-all capitalize ${el.objectFit === fit || (!el.objectFit && fit === 'cover') ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
