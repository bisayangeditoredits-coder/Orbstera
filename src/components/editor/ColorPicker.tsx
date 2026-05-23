'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Check, Pipette, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  clamp,
  CURATED_SWATCHES,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  hueToHex,
  loadRecentColors,
  normalizeHex,
  pushRecentColor,
  type Hsv,
} from '@/lib/color-picker-utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
  variant?: 'full' | 'compact' | 'toolbar' | 'icon';
  /** Shown on toolbar variant trigger (default: label) */
  triggerLabel?: string;
  /** Deck / theme colors shown inside the popover */
  palettePresets?: string[];
}

function useDebouncedOnChange(onChange: (color: string) => void, ms = 16) {
  const onChangeRef = useRef(onChange);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  return useCallback((hex: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onChangeRef.current(hex);
    }, ms);
  }, [ms]);
}

function SwatchButton({
  c,
  active,
  onPick,
  size = 'md',
}: {
  c: string;
  active: boolean;
  onPick: (c: string) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      title={c}
      onClick={() => onPick(c)}
      className={cn(
        'rounded-lg border-2 transition-all hover:scale-105 active:scale-95 shadow-sm',
        size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
        active
          ? 'border-indigo-500 ring-2 ring-indigo-400/30 scale-105'
          : 'border-white/80 hover:border-indigo-300/60',
      )}
      style={{ background: c }}
    />
  );
}

function Checkerboard({ className }: { className?: string }) {
  return (
    <div
      className={cn('opacity-track rounded-xl', className)}
      aria-hidden
    />
  );
}

export function ColorPicker({
  color,
  onChange,
  label,
  variant = 'full',
  palettePresets,
  triggerLabel,
}: ColorPickerProps) {
  const displayLabel = triggerLabel ?? label;
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [localHex, setLocalHex] = useState(color);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(color) ?? { h: 220, s: 0.8, v: 0.9 });
  const [hexInput, setHexInput] = useState(color.toUpperCase());
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const emitChange = useDebouncedOnChange(onChange);

  const applyHex = useCallback(
    (hex: string, opts?: { commit?: boolean }) => {
      const n = normalizeHex(hex);
      if (!n) return;
      const nextHsv = hexToHsv(n);
      if (!nextHsv) return;
      setLocalHex(n);
      setHexInput(n);
      setHsv(nextHsv);
      emitChange(n);
      if (opts?.commit) {
        pushRecentColor(n);
        setRecent(loadRecentColors());
      }
    },
    [emitChange],
  );

  const applyHsv = useCallback(
    (next: Hsv, commit = false) => {
      const hex = hsvToHex(next);
      setHsv(next);
      setLocalHex(hex);
      setHexInput(hex);
      emitChange(hex);
      if (commit) {
        pushRecentColor(hex);
        setRecent(loadRecentColors());
      }
    },
    [emitChange],
  );

  useEffect(() => {
    if (color.toLowerCase() !== localHex.toLowerCase()) {
      const n = normalizeHex(color) ?? color;
      setLocalHex(n);
      setHexInput(n.toUpperCase());
      const parsed = hexToHsv(n);
      if (parsed) setHsv(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  useEffect(() => {
    if (open) setRecent(loadRecentColors());
  }, [open]);

  const updatePopoverPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const popW = 300;
    const popH = 420;
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + popW > window.innerWidth - 12) {
      left = window.innerWidth - popW - 12;
    }
    if (top + popH > window.innerHeight - 12) {
      top = rect.top - popH - 8;
    }
    setPopoverPos({ top: Math.max(12, top), left: Math.max(12, left) });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    const onResize = () => updatePopoverPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
      applyHex(localHex, { commit: true });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        applyHex(localHex, { commit: true });
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, localHex, applyHex]);

  const pickSv = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const s = clamp((clientX - r.left) / r.width, 0, 1);
      const v = clamp(1 - (clientY - r.top) / r.height, 0, 1);
      applyHsv({ ...hsv, s, v });
    },
    [applyHsv, hsv],
  );

  const pickHue = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const h = clamp(((clientX - r.left) / r.width) * 360, 0, 360);
      applyHsv({ ...hsv, h });
    },
    [applyHsv, hsv],
  );

  const bindDrag = (
    onPick: (x: number, y: number) => void,
    onPick1d?: (x: number) => void,
  ) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (onPick1d) onPick1d(e.clientX);
      else onPick(e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
      if (onPick1d) onPick1d(e.clientX);
      else onPick(e.clientX, e.clientY);
    },
    onPointerUp: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    },
  });

  const tryEyedropper = async () => {
    if (typeof window === 'undefined' || !('EyeDropper' in window)) return;
    try {
      // @ts-expect-error EyeDropper is Chromium-only
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) applyHex(result.sRGBHex, { commit: true });
    } catch {
      /* cancelled */
    }
  };

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(localHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const rgb = hexToRgb(localHex);
  const hueColor = hueToHex(hsv.h);
  const presets = [
    ...(palettePresets?.filter((c) => normalizeHex(c)) ?? []),
    ...CURATED_SWATCHES.filter((c) => !palettePresets?.includes(c)),
  ].slice(0, 20);

  const popover = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={`${label} color picker`}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[200] w-[300px] rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-[0_24px_80px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.8)_inset] overflow-hidden"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <div className="relative px-4 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="text-[13px] font-semibold text-slate-800 mt-0.5">Precision color</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  applyHex(localHex, { commit: true });
                }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-14 w-14 rounded-xl overflow-hidden ring-1 ring-slate-200/80 shadow-inner shrink-0">
                <Checkerboard className="absolute inset-0" />
                <div className="absolute inset-0" style={{ backgroundColor: localHex }} />
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-3 gap-1.5">
                {(['Fill', 'UI', 'Text'] as const).map((slot, i) => (
                  <div
                    key={slot}
                    className="h-8 rounded-lg border border-slate-200/80 overflow-hidden relative"
                    style={{
                      background:
                        i === 0
                          ? localHex
                          : i === 1
                            ? `linear-gradient(135deg, ${localHex} 0%, ${localHex}88 100%)`
                            : `linear-gradient(180deg, transparent 40%, ${localHex} 40%)`,
                    }}
                  >
                    <span className="absolute bottom-0.5 left-1 text-[7px] font-bold text-white/90 drop-shadow-md">
                      {slot}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3.5">
            <div
              ref={svRef}
              className="relative h-[148px] w-full rounded-xl cursor-crosshair overflow-hidden ring-1 ring-slate-200/90 shadow-inner touch-none"
              style={{ backgroundColor: hueColor }}
              {...bindDrag(pickSv)}
            >
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to right, #fff, transparent)' }}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, #000, transparent)' }}
              />
              <div
                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.25)] pointer-events-none"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  backgroundColor: localHex,
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div
                ref={hueRef}
                className="relative flex-1 h-3 rounded-full hue-track cursor-ew-resize ring-1 ring-slate-200/80 touch-none"
                {...bindDrag(() => {}, pickHue)}
              >
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{
                    left: `calc(${(hsv.h / 360) * 100}% - 7px)`,
                    backgroundColor: hueColor,
                  }}
                />
              </div>
              <button
                type="button"
                title="Eyedropper"
                onClick={tryEyedropper}
                className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/80 transition-all"
              >
                <Pipette size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">HEX</span>
              <div className="flex-1 flex items-center rounded-xl border border-slate-200 bg-slate-50/80 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15 overflow-hidden">
                <span className="pl-3 text-[12px] font-mono text-slate-400 select-none">#</span>
                <input
                  value={hexInput.replace(/^#/, '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                    setHexInput(`#${raw.toUpperCase()}`);
                    if (raw.length === 6) applyHex(`#${raw}`);
                  }}
                  onBlur={() => {
                    const n = normalizeHex(hexInput);
                    if (n) applyHex(n, { commit: true });
                    else setHexInput(localHex.replace(/^#/, ''));
                  }}
                  className="flex-1 py-2 pr-2 bg-transparent text-[12px] font-mono font-semibold text-slate-800 outline-none uppercase tracking-wide"
                  spellCheck={false}
                />
              </div>
              <button
                type="button"
                onClick={copyHex}
                className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                title="Copy hex"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>

            {rgb && (
              <div className="grid grid-cols-3 gap-2">
                {(['R', 'G', 'B'] as const).map((ch, i) => (
                  <div
                    key={ch}
                    className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-center"
                  >
                    <span className="text-[9px] font-bold text-slate-400">{ch}</span>
                    <p className="text-[11px] font-mono font-semibold text-slate-700 tabular-nums">
                      {[rgb.r, rgb.g, rgb.b][i]}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {presets.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">
                  {palettePresets?.length ? 'Deck palette' : 'Swatches'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((c) => (
                    <SwatchButton
                      key={c}
                      c={c}
                      active={localHex.toUpperCase() === c.toUpperCase()}
                      onPick={(picked) => applyHex(picked, { commit: true })}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}

            {recent.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.16em] mb-2">Recent</p>
                <div className="flex flex-wrap gap-1.5">
                  {recent.map((c) => (
                    <SwatchButton
                      key={c}
                      c={c}
                      active={localHex.toUpperCase() === c}
                      onPick={(picked) => applyHex(picked, { commit: true })}
                      size="sm"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const swatch = (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden ring-1 ring-slate-200/90 shadow-sm transition-transform',
        variant === 'full' && 'w-10 h-10 rounded-xl group-hover:scale-105',
        variant === 'compact' && 'w-6 h-6 rounded-lg group-hover:scale-105',
        variant === 'toolbar' && 'w-7 h-7 rounded-md',
        variant === 'icon' && 'w-8 h-8 rounded-lg',
      )}
    >
      <Checkerboard className="absolute inset-0 rounded-[inherit]" />
      <div
        className="absolute inset-0 transition-colors duration-150"
        style={{ backgroundColor: localHex }}
      />
    </div>
  );

  const triggerButton = (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls={open ? popoverId : undefined}
      title={`${displayLabel}: ${localHex}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        if (!open) updatePopoverPosition();
        setOpen((v) => !v);
      }}
      className={cn(
        'transition-all cursor-pointer text-left group shrink-0',
        variant === 'full' &&
          'flex items-center gap-3 w-full p-3 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 hover:border-indigo-300/50 hover:shadow-[0_8px_24px_-8px_rgba(99,102,241,0.2)] active:scale-[0.99]',
        variant === 'compact' &&
          'flex items-center gap-3 w-full p-1.5 rounded-xl border border-slate-200/70 bg-white hover:border-indigo-300/40 active:scale-[0.98]',
        variant === 'toolbar' &&
          'rounded-md border border-black/15 overflow-hidden hover:ring-2 hover:ring-indigo-400/50 active:scale-95',
        variant === 'icon' &&
          'rounded-lg border border-neutral-200 overflow-hidden hover:ring-2 hover:ring-indigo-300 active:scale-95',
        open &&
          variant !== 'toolbar' &&
          variant !== 'icon' &&
          'border-indigo-400/60 ring-2 ring-indigo-500/15 shadow-md',
        open && (variant === 'toolbar' || variant === 'icon') && 'ring-2 ring-indigo-400/50',
      )}
    >
      {variant === 'toolbar' || variant === 'icon' ? (
        swatch
      ) : (
        <>
          {swatch}
          <div className="flex flex-col items-start min-w-0 flex-1 select-none">
            {variant === 'full' && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] leading-none mb-1">
                {label}
              </span>
            )}
            <span
              className={cn(
                'font-mono font-semibold text-slate-700 tracking-tight transition-colors',
                variant === 'full' ? 'text-[13px]' : 'text-[11px]',
              )}
            >
              {localHex.toUpperCase()}
            </span>
          </div>
          {variant === 'full' && (
            <span className="text-[10px] font-semibold text-indigo-500/80 opacity-0 group-hover:opacity-100 transition-opacity pr-0.5">
              Edit
            </span>
          )}
        </>
      )}
    </button>
  );

  return (
    <>
      {variant === 'toolbar' ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">
            {displayLabel}
          </span>
          {triggerButton}
        </div>
      ) : (
        triggerButton
      )}

      {typeof document !== 'undefined' && createPortal(popover, document.body)}
    </>
  );
}
