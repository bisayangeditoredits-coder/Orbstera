'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCircle2, Loader2, X, Plus, RefreshCw } from 'lucide-react';

const STYLES: { id: string; label: string }[] = [
  { id: 'adventurer',  label: 'Adventurer' },
  { id: 'avataaars',   label: 'Avataaars' },
  { id: 'bottts',      label: 'Bottts' },
  { id: 'fun-emoji',   label: 'Fun Emoji' },
  { id: 'micah',       label: 'Micah' },
  { id: 'notionists',  label: 'Notionists' },
  { id: 'lorelei',     label: 'Lorelei' },
  { id: 'pixel-art',   label: 'Pixel Art' },
  { id: 'croodles',    label: 'Croodles' },
];

/** Fetch an SVG from DiceBear and convert it to a data: URL so Konva can render it */
async function svgUrlToDataUrl(svgUrl: string): Promise<string> {
  const res = await fetch(svgUrl);
  const svgText = await res.text();
  // Encode as base64 data URL
  const b64 = btoa(unescape(encodeURIComponent(svgText)));
  return `data:image/svg+xml;base64,${b64}`;
}

export function AvatarsPanel({ onClose }: { onClose?: () => void }) {
  const [seed, setSeed]             = useState('');
  const [activeStyle, setActiveStyle] = useState('bottts');
  const [avatarUrls, setAvatarUrls] = useState<string[]>([]);
  const [inserting, setInserting]   = useState<string | null>(null);

  const addElement        = usePresentationStore((s) => s.addElement);
  const selectElement     = usePresentationStore((s) => s.selectElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation      = usePresentationStore((s) => s.presentation);

  // Regenerate avatar URLs whenever seed or style changes
  useEffect(() => {
    const baseSeed = seed.trim() || `random-${Math.random().toString(36).substr(2, 6)}`;
    const urls = Array.from({ length: 12 }, (_, i) =>
      `https://api.dicebear.com/7.x/${activeStyle}/svg?seed=${encodeURIComponent(baseSeed + i)}&size=256`
    );
    setAvatarUrls(urls);
  }, [seed, activeStyle]);

  const randomize = useCallback(() => {
    setSeed(Math.random().toString(36).substr(2, 8));
  }, []);

  const handleAddAvatar = useCallback(async (svgUrl: string) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    setInserting(svgUrl);
    try {
      // Convert SVG to data URL so Konva/canvas can render it cross-origin
      const dataUrl = await svgUrlToDataUrl(svgUrl);

      // Load the data URL as an image to get real dimensions
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const size = 240; // desired size on slide
          const ratio = img.naturalHeight > 0 ? img.naturalHeight / img.naturalWidth : 1;
          const w = size;
          const h = Math.round(size * ratio);
          addElement(slideId, {
            id: `el-avatar-${Date.now()}`,
            type: 'image',
            x: Math.round((1280 - w) / 2),
            y: Math.round((720 - h) / 2),
            width: w,
            height: h,
            src: dataUrl,
            zIndex: 100,
            visible: true, opacity: 1, locked: false,
          } as any);
          resolve();
        };
        img.onerror = () => {
          // Fallback — insert with square dimensions
          addElement(slideId, {
            id: `el-avatar-${Date.now()}`,
            type: 'image',
            x: Math.round((1280 - 240) / 2),
            y: Math.round((720 - 240) / 2),
            width: 240, height: 240,
            src: dataUrl,
            zIndex: 100,
            visible: true, opacity: 1, locked: false,
          } as any);
          resolve();
        };
        img.src = dataUrl;
      });
    } catch {
      // silent fail
    } finally {
      setInserting(null);
    }
  }, [addElement, currentSlideIndex, presentation]);

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] overflow-hidden">

      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
              <UserCircle2 size={16} className="text-orange-500" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-neutral-900 leading-tight">Avatars</h2>
              <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Powered by DiceBear</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={randomize}
              title="Randomize"
              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center"
            >
              <RefreshCw size={13} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all flex items-center justify-center"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Style filter — wrapping grid, no overflow */}
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveStyle(s.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  activeStyle === s.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Seed input */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Type a name to generate variations…"
              className="w-full h-9 bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 text-[12px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-orange-300 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Avatar grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-10" style={{ scrollbarWidth: 'none' }}>
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {avatarUrls.map((url, i) => {
              const isLoading = inserting === url;
              return (
                <motion.div
                  key={url}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.18, delay: i * 0.025 }}
                  className="relative group cursor-pointer aspect-square rounded-2xl overflow-hidden bg-white border border-neutral-200 hover:border-orange-300 hover:shadow-md transition-all duration-200 flex items-center justify-center p-2"
                  onClick={() => !inserting && handleAddAvatar(url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Avatar"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors duration-200 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-600 scale-0 group-hover:scale-100 transition-transform duration-200 shadow-sm">
                      {isLoading
                        ? <Loader2 size={14} className="animate-spin text-orange-500" />
                        : <Plus size={15} strokeWidth={2.5} />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <p className="text-[10px] text-neutral-400 text-center mt-4">
          Click any avatar to add it to your slide
        </p>
      </div>
    </div>
  );
}
