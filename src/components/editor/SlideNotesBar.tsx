'use client';

import { useState } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Sparkles, Loader2 } from 'lucide-react';

export function SlideNotesBar() {
  const presentation      = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const updateSlide       = usePresentationStore((s) => s.updateSlide);
  const slide = presentation?.slides[currentSlideIndex];

  const [aiLoading, setAiLoading] = useState(false);

  const runAiNotes = async () => {
    if (!slide || !presentation) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideTitle: slide.title || slide.elements?.find((e) => e.type === 'text')?.content,
          speakerNotes: slide.speakerNotes,
          presentationTitle: presentation.title,
        }),
      });
      const data = await res.json();
      if (typeof data.tips === 'string') {
        updateSlide(slide.id, { speakerNotes: data.tips });
      }
    } catch {
      /* ignore */
    } finally {
      setAiLoading(false);
    }
  };

  if (!slide) return null;

  const notes = slide.speakerNotes || '';

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        height: 96,
        background: '#ffffff',
        borderTop: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
        <span className="text-[11px] font-bold text-neutral-500 tracking-wide uppercase">Slide Notes</span>
        <button
          type="button"
          onClick={runAiNotes}
          disabled={aiLoading}
          className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
          style={{ background: 'rgba(59,130,246,0.08)', color: '#0009fa' }}
        >
          {aiLoading
            ? <Loader2 size={11} className="animate-spin" />
            : <Sparkles size={11} />}
          AI Notes
        </button>
      </div>
      {/* Textarea */}
      <div className="flex-1 relative flex items-start px-4 pb-2">
        <textarea
          value={notes}
          onChange={(e) => updateSlide(slide.id, { speakerNotes: e.target.value })}
          maxLength={1000}
          placeholder="Type your notes for this slide..."
          className="w-full h-full resize-none text-[12px] text-neutral-700 placeholder:text-neutral-400 bg-transparent outline-none leading-relaxed"
        />
        <span className="absolute right-4 bottom-2 text-[10px] font-medium" style={{ color: '#d1d5db' }}>
          {notes.length}/1000
        </span>
      </div>
    </div>
  );
}
