/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, Plus, Sparkles, Grid3X3 } from 'lucide-react';

export function IconsPanel({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState('');
  const [iconifyIcons, setIconifyIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  // ── Iconify search ─────────────────────────────────────────────────────────
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
      setIconifyIcons(data.icons || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (iconifyIcons.length === 0) {
      searchIconify('interface');
    }
  }, [iconifyIcons.length]);

  // ── Add to canvas ──────────────────────────────────────────────────────────
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

        {/* Search */}
        <div className="px-4 pb-3 pt-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                searchIconify(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') searchIconify(query);
              }}
              placeholder="Search 200k+ icons..."
              className="w-full h-9 bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Icon Grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key="iconify-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-neutral-300" size={22} />
              </div>
            ) : error ? (
              <div className="text-[12px] text-red-500 text-center p-4 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            ) : iconifyIcons.length === 0 ? (
              <div className="text-[12px] text-neutral-400 text-center py-8">No icons found</div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {iconifyIcons.map((iconName) => {
                  const [prefix, name] = iconName.split(':');
                  const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg`;
                  return (
                    <motion.button
                      key={iconName}
                      type="button"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleAddIconify(iconName)}
                      title={name.replace(/-/g, ' ')}
                      className="aspect-square bg-neutral-50 border border-neutral-100 hover:border-indigo-300 hover:bg-indigo-50/50 rounded-xl flex items-center justify-center transition-all duration-150 group relative"
                    >
                      <img
                        src={svgUrl}
                        alt={iconName}
                        className="w-6 h-6 opacity-60 group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white scale-0 group-hover:scale-100 transition-transform duration-200 flex items-center justify-center">
                        <Plus size={8} strokeWidth={3} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer badge ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between">
        <span className="text-[10px] text-neutral-400">
          Powered by Iconify
        </span>
        <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-semibold">
          <Sparkles size={10} />
          Click to add
        </div>
      </div>
    </div>
  );
}
