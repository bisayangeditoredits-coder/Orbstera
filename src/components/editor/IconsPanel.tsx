/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { usePanelStore } from '@/store/usePanelStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, Plus, Sparkles, Grid3X3 } from 'lucide-react';

export function IconsPanel({ onClose }: { onClose?: () => void }) {
  const { query, iconifyIcons } = usePanelStore((s) => s.icons);
  const patchIcons = usePanelStore((s) => s.patchIcons);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const searchIconify = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery)}&limit=90`
      );
      if (!res.ok) throw new Error('Failed to fetch icons');
      const data = await res.json();
      patchIcons({ iconifyIcons: data.icons || [] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (iconifyIcons.length === 0) {
      searchIconify('interface');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddIconify = (iconName: string) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;
    const [prefix, name] = iconName.split(':');
    const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=%231a1a2e`;
    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image', x: 560, y: 290, width: 120, height: 120,
      src: svgUrl, zIndex: 100, visible: true, opacity: 1, locked: false,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
              <Grid3X3 size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900 leading-tight">Icons</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                200k+ Iconify icons
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all flex items-center justify-center"
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
              onChange={(e) => patchIcons({ query: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && searchIconify(query)}
              placeholder="Search icons (e.g. arrow, star)..."
              className="w-full h-9 bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-neutral-300" size={22} />
          </div>
        ) : error ? (
          <div className="text-[12px] text-red-500 text-center p-4 bg-red-50 rounded-xl border border-red-100">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <AnimatePresence>
              {iconifyIcons.map((iconName) => {
                const [prefix, name] = iconName.split(':');
                const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=%231a1a2e`;
                return (
                  <motion.button
                    key={iconName}
                    type="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-square rounded-xl border border-neutral-100 bg-neutral-50 hover:bg-indigo-50 hover:border-indigo-200 flex items-center justify-center p-2 transition-all group"
                    onClick={() => handleAddIconify(iconName)}
                    title={iconName}
                  >
                    <img src={svgUrl} alt="" className="w-7 h-7 object-contain group-hover:scale-110 transition-transform" />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && iconifyIcons.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center text-center h-40 gap-2 text-neutral-400">
            <Sparkles size={20} />
            <p className="text-[12px]">Search to find icons</p>
          </div>
        )}
      </div>
    </div>
  );
}
