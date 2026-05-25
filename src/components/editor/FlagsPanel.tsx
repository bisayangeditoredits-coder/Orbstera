'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Flag, Loader2, X, Plus } from 'lucide-react';

export function FlagsPanel({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState('');
  const [countries, setCountries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  useEffect(() => {
    fetch('https://flagcdn.com/en/codes.json')
      .then(res => res.json())
      .then(data => {
        setCountries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredCountries = useMemo(() => {
    const q = query.toLowerCase();
    return Object.entries(countries)
      .filter(([code, name]) => name.toLowerCase().includes(q) || code.includes(q))
      .slice(0, 50); // Limit to 50 to prevent huge rendering
  }, [countries, query]);

  const handleAddFlag = (code: string) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    // Load the actual image to get its real aspect ratio
    const imgUrl = `https://flagcdn.com/w640/${code}.png`;
    const img = new window.Image();
    img.onload = () => {
      // Use real dimensions, capped to a sensible slide size
      const maxW = 340;
      const ratio = img.naturalHeight / img.naturalWidth;
      const w = maxW;
      const h = Math.round(maxW * ratio);
      addElement(slideId, {
        id: `el-flag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        x: Math.round((1280 - w) / 2),
        y: Math.round((720 - h) / 2),
        width: w,
        height: h,
        src: imgUrl,
        zIndex: 100,
      } as any);
    };
    img.onerror = () => {
      // Fallback: use 3:2 ratio if image load fails
      addElement(slideId, {
        id: `el-flag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        x: Math.round((1280 - 340) / 2),
        y: Math.round((720 - 227) / 2),
        width: 340,
        height: 227,
        src: imgUrl,
        zIndex: 100,
      } as any);
    };
    img.src = imgUrl;
  };


  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <Flag size={16} className="text-green-600" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-neutral-900 leading-tight">Country Flags</h2>
              <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Powered by FlagCDN</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all flex items-center justify-center"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full h-9 bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 text-[12px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-neutral-300" size={22} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {filteredCountries.map(([code, name], i) => (
                <motion.div
                  key={code}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15, delay: i * 0.01 }}
                  className="relative group cursor-pointer aspect-[3/2] rounded-xl overflow-hidden bg-white border border-neutral-200/80 hover:border-green-300 hover:shadow-md transition-all duration-200 flex items-center justify-center"
                  onClick={() => handleAddFlag(code)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://flagcdn.com/w160/${code}.png`}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-700 scale-0 group-hover:scale-100 transition-transform duration-200 shadow-sm">
                      <Plus size={16} strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 pt-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-[9px] font-bold text-white truncate text-center">{name}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
