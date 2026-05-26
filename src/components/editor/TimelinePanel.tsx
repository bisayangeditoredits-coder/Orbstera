'use client';

import { useState, useCallback, useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, ChevronUp, ChevronDown, ArrowRight,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  CheckCircle2, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type TimelineEvent = {
  id: string;
  title: string;
  date: string;
  description: string;
};

// ─── SVG Builders ─────────────────────────────────────────────────────────────
function buildHorizontalSVG(events: TimelineEvent[], color: string): string {
  const W = 1280, H = 420;
  const padX = 80;
  const centerY = H / 2;
  const lineY = centerY;
  const count = events.length || 1;
  const spacing = (W - padX * 2) / Math.max(count - 1, 1);

  let circles = '';
  let labels = '';

  events.forEach((ev, i) => {
    const x = count === 1 ? W / 2 : padX + i * spacing;
    const above = i % 2 === 0;
    const textY = above ? lineY - 30 : lineY + 55;
    const dateY = above ? lineY - 55 : lineY + 75;
    const descY = above ? lineY - 75 : lineY + 95;
    const connY1 = above ? lineY - 10 : lineY + 10;
    const connY2 = above ? lineY - 24 : lineY + 24;

    circles += `<circle cx="${x}" cy="${lineY}" r="10" fill="${color}" stroke="white" stroke-width="3"/>`;
    labels += `
      <line x1="${x}" y1="${connY1}" x2="${x}" y2="${connY2}" stroke="${color}" stroke-width="2" stroke-dasharray="4,3"/>
      <text x="${x}" y="${dateY}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="13" fill="${color}" font-weight="700">${escXml(ev.date)}</text>
      <text x="${x}" y="${textY}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="16" fill="#111827" font-weight="700">${escXml(ev.title)}</text>
      ${ev.description ? `<text x="${x}" y="${descY}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="12" fill="#6b7280">${escXml(ev.description.substring(0, 40))}</text>` : ''}
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff" rx="16"/>
  <line x1="${padX}" y1="${lineY}" x2="${W - padX}" y2="${lineY}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
  ${circles}
  ${labels}
</svg>`;
}

function buildVerticalSVG(events: TimelineEvent[], color: string): string {
  const W = 1280;
  const rowH = 100;
  const H = Math.max(400, events.length * rowH + 80);
  const lineX = 120;
  const padTop = 60;

  let circles = '';
  let labels = '';

  events.forEach((ev, i) => {
    const y = padTop + i * rowH;
    circles += `<circle cx="${lineX}" cy="${y}" r="10" fill="${color}" stroke="white" stroke-width="3"/>`;
    labels += `
      <text x="${lineX + 30}" y="${y - 4}" font-family="Inter,Arial,sans-serif" font-size="16" fill="#111827" font-weight="700">${escXml(ev.title)}</text>
      <text x="${lineX + 30}" y="${y + 16}" font-family="Inter,Arial,sans-serif" font-size="13" fill="${color}" font-weight="600">${escXml(ev.date)}</text>
      ${ev.description ? `<text x="${lineX + 30}" y="${y + 34}" font-family="Inter,Arial,sans-serif" font-size="12" fill="#6b7280">${escXml(ev.description.substring(0, 80))}</text>` : ''}
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff" rx="16"/>
  <line x1="${lineX}" y1="${padTop - 20}" x2="${lineX}" y2="${padTop + (events.length - 1) * rowH + 20}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
  ${circles}
  ${labels}
</svg>`;
}

function escXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toDataUrl(svg: string) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TimelinePanel({ onClose }: { onClose?: () => void }) {
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const [events, setEvents] = useState<TimelineEvent[]>([
    { id: '1', title: 'Start', date: '2024', description: '' },
    { id: '2', title: 'Milestone', date: '2025', description: '' },
    { id: '3', title: 'Launch', date: '2026', description: '' },
  ]);
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [color, setColor] = useState('#6366f1');
  const [inserted, setInserted] = useState(false);

  const addEvent = () => {
    setEvents((e) => [...e, { id: Date.now().toString(), title: 'Event', date: '2027', description: '' }]);
  };

  const removeEvent = (id: string) => setEvents((e) => e.filter((ev) => ev.id !== id));

  const moveEvent = (id: string, dir: -1 | 1) => {
    setEvents((e) => {
      const idx = e.findIndex((ev) => ev.id === id);
      if (idx < 0) return e;
      const next = idx + dir;
      if (next < 0 || next >= e.length) return e;
      const arr = [...e];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const updateEvent = (id: string, field: keyof TimelineEvent, val: string) => {
    setEvents((e) => e.map((ev) => ev.id === id ? { ...ev, [field]: val } : ev));
  };

  const handleInsert = useCallback(() => {
    if (currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    if (!slide) return;

    const svg = layout === 'horizontal'
      ? buildHorizontalSVG(events, color)
      : buildVerticalSVG(events, color);

    const src = toDataUrl(svg);
    const h = layout === 'horizontal' ? 400 : Math.max(400, events.length * 100 + 80);

    addElement(slide.id, {
      id: `el-timeline-${Date.now()}`,
      type: 'image',
      x: 80, y: 80,
      width: 1100, height: Math.min(h, 560),
      src, zIndex: 10,
    } as any);

    setInserted(true);
    setTimeout(() => setInserted(false), 2000);
  }, [events, layout, color, currentSlideIndex, presentation, addElement]);

  const previewSvg = layout === 'horizontal'
    ? buildHorizontalSVG(events, color)
    : buildVerticalSVG(events, color);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Clock size={15} className="text-neutral-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-neutral-900 leading-none">Timeline Builder</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">Build & insert timelines</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-all">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA]" style={{ scrollbarWidth: 'none' }}>
        <div className="px-4 pt-4 pb-6 space-y-4">

          {/* Layout + Color */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-neutral-200 overflow-hidden bg-white flex-1">
              <button
                onClick={() => setLayout('horizontal')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all ${layout === 'horizontal' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <AlignHorizontalJustifyCenter size={13} /> Horizontal
              </button>
              <button
                onClick={() => setLayout('vertical')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all ${layout === 'vertical' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <AlignVerticalJustifyCenter size={13} /> Vertical
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-400">Color</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-200"
                style={{ padding: 2 }} />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-neutral-100">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Preview</p>
            </div>
            <div className="p-2 overflow-x-auto">
              <div dangerouslySetInnerHTML={{ __html: previewSvg }}
                className="w-full" style={{ minWidth: 260 }} />
            </div>
          </div>

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Events</p>
              <button onClick={addEvent}
                className="flex items-center gap-1 text-[11px] font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-2.5 py-1.5 rounded-lg hover:border-neutral-400 transition-all">
                <Plus size={11} /> Add
              </button>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {events.map((ev, i) => (
                  <motion.div key={ev.id}
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                    className="bg-white border border-neutral-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveEvent(ev.id, -1)} disabled={i === 0}
                          className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30 transition-colors">
                          <ChevronUp size={12} />
                        </button>
                        <button onClick={() => moveEvent(ev.id, 1)} disabled={i === events.length - 1}
                          className="text-neutral-300 hover:text-neutral-600 disabled:opacity-30 transition-colors">
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <input
                        value={ev.title}
                        onChange={(e) => updateEvent(ev.id, 'title', e.target.value)}
                        placeholder="Title"
                        className="flex-1 text-[12px] font-bold text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-neutral-400 transition-all"
                      />
                      <input
                        value={ev.date}
                        onChange={(e) => updateEvent(ev.id, 'date', e.target.value)}
                        placeholder="Date"
                        className="w-20 text-[12px] font-semibold text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-neutral-400 transition-all"
                      />
                      <button onClick={() => removeEvent(ev.id)}
                        className="text-neutral-300 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <input
                      value={ev.description}
                      onChange={(e) => updateEvent(ev.id, 'description', e.target.value)}
                      placeholder="Short description (optional)"
                      className="w-full text-[11px] text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-neutral-400 transition-all"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Insert */}
          <AnimatePresence mode="wait">
            {inserted ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="h-12 rounded-2xl bg-neutral-900 flex items-center justify-center gap-2 shadow-md">
                <CheckCircle2 size={15} className="text-white" />
                <span className="text-white font-bold text-[13px]">Added to Slide!</span>
              </motion.div>
            ) : (
              <motion.button key="insert"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                onClick={handleInsert}
                whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }}
                className="w-full h-12 rounded-2xl bg-neutral-900 text-white font-bold text-[13px] hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-md">
                <ArrowRight size={15} strokeWidth={2.5} />
                Insert into Slide
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
