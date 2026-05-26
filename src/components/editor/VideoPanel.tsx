'use client';

import { useState } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Video as Youtube, X, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

function extractYoutubeId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

export function VideoPanel({ onClose }: { onClose?: () => void }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const handleEmbed = () => {
    setError('');
    if (!url.trim()) return;

    const videoId = extractYoutubeId(url);
    if (!videoId) {
      setError('Please enter a valid YouTube link');
      return;
    }

    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    // Use a special URL format so our KonvaCanvas knows it's a YouTube embed
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image', // Treat it as an image but parse the youtube URL in the canvas
      x: 240,
      y: 135,
      width: 800,
      height: 450,
      src: embedUrl,
      zIndex: 100,
    });
    
    setUrl('');
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-black overflow-hidden relative">
      <div className="shrink-0 flex flex-col border-b border-black/[0.06] bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-neutral-200/60 flex items-center justify-center shrink-0">
              <Youtube size={19} className="text-neutral-900" strokeWidth={1.75} />
            </div>
            <div className="pt-0.5">
              <h2 className="text-[16px] font-semibold text-neutral-900 tracking-tight leading-tight">YouTube Embed</h2>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.14em] mt-1 leading-snug">
                Add videos to your slides
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl border border-black/[0.06] bg-white text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 hover:border-black/[0.08] transition-all flex items-center justify-center shadow-sm"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-6 flex flex-col">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">
              YouTube Link
            </label>
            <div className="relative">
              <LinkIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEmbed();
                }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full h-11 bg-white border border-black/[0.08] rounded-xl pl-10 pr-4 text-[13px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900/50 focus:ring-2 focus:ring-neutral-900/10 transition-all shadow-sm"
              />
            </div>
            {error && <p className="mt-2 text-[11px] text-red-500 font-medium">{error}</p>}
          </div>

          <button
            type="button"
            onClick={handleEmbed}
            disabled={!url.trim()}
            className="w-full min-h-11 py-2 rounded-xl bg-neutral-900 text-white font-bold text-[13px] hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation shadow-md"
          >
            <Youtube size={15} strokeWidth={2.5} /> Embed Video
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center text-center opacity-40">
          <Youtube size={32} className="mb-4 text-neutral-900" strokeWidth={1.5} />
          <p className="text-[12px] font-medium max-w-[200px] leading-relaxed">
            The video will play automatically when you present this slide.
          </p>
        </div>
      </div>
    </div>
  );
}
