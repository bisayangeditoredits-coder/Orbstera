/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Loader2, X, RefreshCw, Wand2, Maximize2, Plus } from 'lucide-react';

const STYLES = [
  { label: 'Realistic', value: 'realistic photo, ultra detailed, 8k' },
  { label: 'Illustration', value: 'digital illustration, vibrant colors, detailed artwork' },
  { label: '3D Art', value: '3D render, octane render, blender, cinema4d' },
  { label: 'Abstract', value: 'abstract art, geometric, colorful shapes' },
  { label: 'Oil Painting', value: 'oil painting, impressionist, fine art, brush strokes' },
  { label: 'Minimal', value: 'minimalist design, clean, white background, simple' },
];

function buildPollinationsUrl(prompt: string, style: string, seed: number) {
  const full = encodeURIComponent(`${prompt}, ${style}`);
  return `https://image.pollinations.ai/prompt/${full}?width=1280&height=720&seed=${seed}`;
}

export function PollinationsPanel({ onClose }: { onClose?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 99999));

  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);
  const updateSlide = usePresentationStore((s) => s.updateSlide);

  const generate = () => {
    if (!prompt.trim()) return;
    const newSeed = Math.floor(Math.random() * 99999);
    setSeed(newSeed);
    setLoading(true);
    setImageUrl(buildPollinationsUrl(prompt, selectedStyle.value, newSeed));
  };

  const regenerate = () => {
    if (!imageUrl) return;
    const newSeed = Math.floor(Math.random() * 99999);
    setSeed(newSeed);
    setLoading(true);
    setImageUrl(buildPollinationsUrl(prompt, selectedStyle.value, newSeed));
  };

  const handleAddAsBackground = () => {
    if (!imageUrl || currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    if (!slide) return;
    updateSlide(slide.id, {
      elements: [
        {
          id: `bg-${Date.now()}`,
          type: 'image',
          x: 0, y: 0, width: 1280, height: 720,
          src: imageUrl,
          zIndex: 0,
          locked: true,
        },
        ...(slide.elements ?? []),
      ],
    });
    onClose?.();
  };

  const handleAddAsElement = () => {
    if (!imageUrl || currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;
    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      x: 140, y: 80, width: 800, height: 450,
      src: imageUrl,
      zIndex: 10,
    });
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
            <ImagePlus size={16} className="text-neutral-700" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900 leading-tight">AI Image Gen</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">Powered by Pollinations · 100% Free</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all flex items-center justify-center">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
        {/* Prompt input */}
        <div>
          <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">Describe your image</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }}
            placeholder="e.g. A futuristic city skyline at sunset, cinematic lighting..."
            className="w-full h-24 bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all resize-none"
          />
        </div>

        {/* Style picker */}
        <div>
          <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest block mb-2">Style</label>
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map((style) => (
              <button
                key={style.label}
                onClick={() => setSelectedStyle(style)}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all ${
                  selectedStyle.label === style.label
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-900'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!prompt.trim() || loading}
          className="w-full h-10 rounded-xl bg-neutral-900 text-white font-bold text-[13px] hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
        >
          <Wand2 size={15} strokeWidth={2.5} />
          Generate Image
        </button>

        {/* Preview */}
        <AnimatePresence>
          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 aspect-video">
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={22} className="animate-spin text-neutral-400" />
                      <p className="text-[11px] text-neutral-400 font-medium">Generating...</p>
                    </div>
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt="Generated"
                  className="w-full h-full object-cover"
                  onLoad={() => setLoading(false)}
                  onError={() => setLoading(false)}
                />
              </div>

              <button
                onClick={regenerate}
                disabled={loading}
                className="w-full h-9 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-semibold text-[12px] hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={13} strokeWidth={2.5} />
                Regenerate
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleAddAsElement}
                  disabled={loading}
                  className="h-10 rounded-xl border border-neutral-200 bg-white text-neutral-900 font-bold text-[12px] hover:bg-neutral-50 hover:border-neutral-400 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Add Element
                </button>
                <button
                  onClick={handleAddAsBackground}
                  disabled={loading}
                  className="h-10 rounded-xl bg-neutral-900 text-white font-bold text-[12px] hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <Maximize2 size={13} strokeWidth={2.5} />
                  Set BG
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!imageUrl && (
          <div className="flex flex-col items-center justify-center text-center py-8 opacity-40">
            <ImagePlus size={32} className="mb-3 text-neutral-400" strokeWidth={1.2} />
            <p className="text-[12px] font-medium text-neutral-500 max-w-[160px] leading-relaxed">
              Type a prompt above and hit Generate
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
