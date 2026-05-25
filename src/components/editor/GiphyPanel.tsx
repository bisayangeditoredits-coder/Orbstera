/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, X, Plus, Smile } from 'lucide-react';

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || '';

type GiphyGif = {
  id: string;
  images: {
    fixed_height: { url: string; width: string; height: string; };
    original: { url: string; width: string; height: string; };
  };
  title: string;
};

export function GiphyPanel({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [mode, setMode] = useState<'gifs' | 'stickers'>('gifs');
  
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const fetchGifs = async (searchQuery: string, newOffset = 0, currentMode = mode) => {
    if (!GIPHY_API_KEY) { setError('Missing Giphy API Key.'); return; }
    if (newOffset === 0) { setLoading(true); setGifs([]); } else { setLoadingMore(true); }
    setError('');
    try {
      const endpoint = searchQuery.trim() ? 'search' : 'trending';
      const baseUrl = `https://api.giphy.com/v1/${currentMode}/${endpoint}`;
      const url = `${baseUrl}?api_key=${GIPHY_API_KEY}&limit=20&offset=${newOffset}${searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery)}` : ''}`;
      const res = await fetch(url);
      if (res.status === 401 || res.status === 403) throw new Error('API_KEY_INVALID');
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      if (newOffset === 0) { setGifs(data.data || []); } else { setGifs(prev => [...prev, ...(data.data || [])]); }
      setHasMore(data.pagination.total_count > newOffset + 20);
      setOffset(newOffset);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchGifs('', 0, mode); }, [mode]);

  const handleAddGif = (gif: GiphyGif) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;
    const MAX_W = 400, MAX_H = 400;
    let w = parseInt(gif.images.original.width) || 300;
    let h = parseInt(gif.images.original.height) || 300;
    if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
    if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H; }
    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image', x: (1280 - w) / 2, y: (720 - h) / 2,
      width: w, height: h, src: gif.images.original.url, zIndex: 100,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
              <Smile size={16} className="text-neutral-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900 leading-tight">Giphy</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">GIFs & Stickers</p>
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

        <div className="px-4 pb-4 space-y-2.5">
          {/* Mode toggle */}
          <div className="flex bg-neutral-100 p-0.5 rounded-lg">
            <button
              onClick={() => setMode('gifs')}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-all ${mode === 'gifs' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              GIFs
            </button>
            <button
              onClick={() => setMode('stickers')}
              className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-all ${mode === 'stickers' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Stickers
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchGifs(query, 0, mode)}
              placeholder={`Search ${mode}...`}
              className="w-full h-9 bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {!GIPHY_API_KEY || error === 'API_KEY_INVALID' ? (
          <div className="flex flex-col items-center justify-center text-center h-full p-4 gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Smile size={18} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-neutral-700">API Key Required</p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px] leading-relaxed">
                Get a free key from <strong>developers.giphy.com</strong> and add it as <code className="bg-neutral-100 px-1 rounded text-[10px]">NEXT_PUBLIC_GIPHY_API_KEY</code>.
              </p>
            </div>
            <a
              href="https://developers.giphy.com/dashboard/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[12px] font-semibold rounded-lg transition-colors"
            >
              Get Free API Key
            </a>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-neutral-300" size={22} />
          </div>
        ) : error ? (
          <div className="text-[12px] text-red-500 text-center p-4 bg-red-50 rounded-xl border border-red-100">
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="columns-2 gap-2 space-y-2">
              <AnimatePresence>
                {gifs.map((gif, i) => (
                  <motion.div
                    key={`${gif.id}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative group cursor-pointer break-inside-avoid rounded-xl overflow-hidden bg-neutral-100 mb-2 border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all duration-200 min-h-[80px] flex items-center justify-center"
                    onClick={() => handleAddGif(gif)}
                  >
                    <img
                      src={gif.images.fixed_height.url}
                      alt={gif.title || 'GIF'}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-neutral-800 scale-0 group-hover:scale-100 transition-transform duration-200 shadow-sm">
                        <Plus size={16} strokeWidth={2.5} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {gifs.length > 0 && hasMore && (
              <button
                onClick={() => fetchGifs(query, offset + 20, mode)}
                disabled={loadingMore}
                className="w-full py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 text-[12px] font-medium hover:bg-neutral-100 transition-all flex items-center justify-center gap-2"
              >
                {loadingMore ? <Loader2 size={13} className="animate-spin" /> : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
