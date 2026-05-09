'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Plus, Hash } from 'lucide-react';

// ─── Color Conversion Helpers ──────────────────────────────────────────────────

function hexToHsv(hex: string) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToHex(h: number, s: number, v: number) {
  h /= 60;
  s /= 100;
  v /= 100;
  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  const mod = i % 6;
  const r = [v, q, p, p, t, v][mod];
  const g = [t, v, v, q, p, p][mod];
  const b = [p, p, t, v, v, q][mod];
  
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_SAVED_COLORS = [
  '#FF4B4B', '#FF8A00', '#FFD600', '#4ADE80', '#2DD4BF', '#3B82F6', '#7C3AED',
  '#EC4899', '#F43F5E', '#A855F7', '#6366F1', '#0EA5E9', '#10B981', '#84CC16'
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
  variant?: 'full' | 'compact';
}

export function ColorPicker({ color, onChange, label, variant = 'full' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(color || '#4F46E5'));
  const [opacity, setOpacity] = useState(100);
  const [inputValue, setInputValue] = useState(color || '#4F46E5');
  const [savedColors, setSavedColors] = useState(INITIAL_SAVED_COLORS);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Sync color
  useEffect(() => {
    if (color && color !== inputValue) {
      setHsv(hexToHsv(color));
      setInputValue(color);
    }
  }, [color]);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 300;
      const popoverHeight = 440;
      
      let top = rect.bottom + 8;
      let left = rect.left;

      if (top + popoverHeight > window.innerHeight) {
        top = rect.top - popoverHeight - 8;
      }
      if (left + popoverWidth > window.innerWidth) {
        left = window.innerWidth - popoverWidth - 16;
      }

      setPopoverPos({ top, left });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateColor = useCallback((h: number, s: number, v: number) => {
    const newHex = hsvToHex(h, s, v);
    setHsv({ h, s, v });
    setInputValue(newHex);
    onChange(newHex);
  }, [onChange]);

  const handleMapPointer = (e: React.PointerEvent) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const s = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const v = Math.round(Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100)));
    updateColor(hsv.h, s, v);
  };

  const pureHueColor = useMemo(() => hsvToHex(hsv.h, 100, 100), [hsv.h]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 w-full transition-all active:scale-[0.98] ${
          variant === 'full' 
            ? 'p-3 rounded-2xl border border-black/[0.08] bg-white hover:border-black/20' 
            : 'p-1.5 rounded-xl border border-black/[0.04] bg-black/[0.02] hover:bg-white'
        }`}
      >
        <div 
          className={`${variant === 'full' ? 'w-10 h-10 rounded-xl' : 'w-5 h-5 rounded-md'} border border-black/10 shadow-sm shrink-0`}
          style={{ backgroundColor: color }}
        />
        <div className="flex flex-col items-start min-w-0 flex-1">
          {variant === 'full' && <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest leading-none mb-1">{label}</span>}
          <span className={`${variant === 'full' ? 'text-[14px]' : 'text-[11px]'} font-bold text-black/70 tracking-tight`}>{color.toUpperCase()}</span>
        </div>
        <ChevronDown size={14} className="text-black/20" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              style={{ top: popoverPos.top, left: popoverPos.left }}
              className="fixed z-[9999] w-[300px] bg-white border border-black/[0.1] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 flex flex-col gap-4"
            >
              <div 
                ref={mapRef}
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); handleMapPointer(e); }}
                onPointerMove={(e) => { if (e.buttons > 0) handleMapPointer(e); }}
                className="relative w-full h-[160px] rounded-xl overflow-hidden cursor-crosshair select-none"
                style={{ backgroundColor: pureHueColor }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <motion.div 
                  className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
                />
              </div>

              <div className="relative h-3 w-full rounded-full hue-track">
                <input
                  type="range" min="0" max="360" value={hsv.h}
                  onChange={(e) => updateColor(parseInt(e.target.value), hsv.s, hsv.v)}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{ left: `calc(${(hsv.h / 360) * 100}% - 8px)` }}
                />
              </div>

              <div className="relative h-3 w-full rounded-full opacity-track">
                <div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(to right, transparent, ${color})` }} />
                <input
                  type="range" min="0" max="100" value={opacity}
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{ left: `calc(${opacity}% - 8px)` }}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex items-center justify-between px-3 py-2 border border-black/[0.08] rounded-xl bg-white shadow-sm">
                  <span className="text-[12px] font-medium text-black/60">Hex</span>
                  <ChevronDown size={12} className="text-black/30" />
                </div>
                <div className="flex-[2] flex items-center gap-1.5 px-3 py-2 border border-black/[0.08] rounded-xl bg-white shadow-sm">
                  <Hash size={12} className="text-black/20" />
                  <input
                    type="text" value={inputValue.replace('#', '')}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setInputValue('#' + val);
                      if (/^[0-9A-F]{3,6}$/.test(val)) {
                        onChange('#' + val);
                        setHsv(hexToHsv('#' + val));
                      }
                    }}
                    className="w-full text-[12px] font-bold font-mono text-black/80 focus:outline-none uppercase"
                  />
                </div>
                <div className="flex-1 flex items-center justify-center px-2 py-2 border border-black/[0.08] rounded-xl bg-white shadow-sm">
                  <input
                    type="text" value={opacity + '%'}
                    readOnly
                    className="w-full text-[12px] font-bold text-center text-black/80 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-black/60">Saved colors:</span>
                  <button 
                    onClick={() => setSavedColors([...savedColors, color])}
                    className="flex items-center gap-1 text-[11px] font-bold text-black/30 hover:text-black/60 transition-colors"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2.5">
                  {savedColors.map((sc, i) => (
                    <button
                      key={`${sc}-${i}`}
                      onClick={() => {
                        onChange(sc);
                        setInputValue(sc);
                        setHsv(hexToHsv(sc));
                      }}
                      className={`w-full aspect-square rounded-full transition-all hover:scale-110 active:scale-90 relative ${
                        color.toUpperCase() === sc.toUpperCase() ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: sc }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
