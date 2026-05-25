/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Wand2, X, Image as ImageIcon, Loader2, Sparkles } from '@/components/icons/lucide';
import { PanelHeaderIcon, PanelCloseIcon, panelCloseButtonClass } from '@/components/icons/panel-chrome';

export function AIPanel({ onClose }: { onClose?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const generateImage = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const imageUrl = `/api/pollinations?prompt=${encodeURIComponent(prompt.trim())}`;
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    if (currentSlideIndex === null || !presentation || !previewUrl) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;
    const img = new window.Image();
    img.onload = () => {
      const MAX_W = 600, MAX_H = 500;
      let w = img.width || 600, h = img.height || 600;
      if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H; }
      addElement(slideId, {
        id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'image', x: (1280 - w) / 2, y: (720 - h) / 2,
        width: w, height: h, src: previewUrl, zIndex: 100,
      });
      setPrompt(''); setPreviewUrl('');
    };
    img.src = previewUrl;
  };

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <PanelHeaderIcon icon={Sparkles} iconClassName="text-neutral-600" />
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900 leading-tight">AI Image Gen</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">Powered by Pollinations · Free</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className={panelCloseButtonClass} aria-label="Close panel">
              <PanelCloseIcon icon={X} />
            </button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-2.5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateImage(); } }}
            placeholder="Describe what you want to generate..."
            className="w-full h-[88px] bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 transition-all resize-none"
          />
          <button
            type="button"
            onClick={generateImage}
            disabled={loading || !prompt.trim()}
            className="w-full h-10 rounded-xl bg-neutral-900 text-white text-[13px] font-semibold hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Generating...</>
            ) : (
              <><Wand2 size={14} /> Generate Image</>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col">
        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-full aspect-square bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200">
              <img src={previewUrl} alt="Generated AI" className="w-full h-full object-cover" />
            </div>
            <button
              type="button"
              onClick={handleAddImage}
              className="w-full h-10 rounded-xl bg-neutral-900 text-white text-[13px] font-semibold hover:bg-neutral-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ImageIcon size={14} /> Add to Canvas
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-full py-10 gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Sparkles size={20} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-neutral-700">Bring your ideas to life</p>
              <p className="text-[12px] text-neutral-400 mt-1 max-w-[200px] leading-relaxed">
                Describe what you want to see and the AI will draw it instantly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
