/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Image as ImageIcon, Loader2, X, Plus } from 'lucide-react';

const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || '';

type UnsplashPhoto = {
  id: string;
  urls: { regular: string; small: string; full: string; };
  alt_description: string;
  width: number;
  height: number;
  user: { name: string; };
};

export function PhotosPanel({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('abstract background');
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const selectedElementId = usePresentationStore((s) => s.editor.selectedElementId);
  const addElement = usePresentationStore((s) => s.addElement);
  const updateElement = usePresentationStore((s) => s.updateElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const searchPhotos = async (searchQuery: string, pageNum = 1) => {
    if (!UNSPLASH_ACCESS_KEY) { setError('Missing Unsplash API Key.'); return; }
    if (!searchQuery.trim()) return;
    if (pageNum === 1) { setLoading(true); setPhotos([]); } else { setLoadingMore(true); }
    setError('');
    setLastSearchedQuery(searchQuery);
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&page=${pageNum}&per_page=30&client_id=${UNSPLASH_ACCESS_KEY}`);
      if (!res.ok) throw new Error('Failed to fetch photos. Check your API key.');
      const data = await res.json();
      if (pageNum === 1) { setPhotos(data.results || []); } else { setPhotos(prev => [...prev, ...(data.results || [])]); }
      setHasMore(data.total_pages > pageNum);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { if (UNSPLASH_ACCESS_KEY) searchPhotos('abstract background'); }, []);

  const handleAddPhoto = (photo: UnsplashPhoto) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    // Check if an image is currently selected
    const selectedEl = presentation.slides[currentSlideIndex]?.elements?.find(e => e.id === selectedElementId);
    if (selectedEl && selectedEl.type === 'image') {
      updateElement(slideId, selectedElementId!, { src: photo.urls.full });
      return;
    }

    const MAX_W = 600, MAX_H = 500;
    let w = photo.width || 400, h = photo.height || 300;
    if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
    if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H; }
    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image', x: (1280 - w) / 2, y: (720 - h) / 2,
      width: w, height: h, src: photo.urls.full, zIndex: 100,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
              <ImageIcon size={16} className="text-neutral-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900 leading-tight">Photos</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">Powered by Unsplash · Free</p>
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
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPhotos(query, 1)}
              placeholder="Search photos..."
              className="w-full h-9 bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {!UNSPLASH_ACCESS_KEY ? (
          <div className="flex flex-col items-center justify-center text-center h-full p-4 gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
              <ImageIcon size={18} className="text-neutral-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-neutral-700">API Key Required</p>
              <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px] leading-relaxed">
                Add <code className="bg-neutral-100 px-1 rounded text-[10px]">NEXT_PUBLIC_UNSPLASH_ACCESS_KEY</code> to your .env file.
              </p>
            </div>
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
                {photos.map((photo, i) => (
                  <motion.div
                    key={`${photo.id}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative group cursor-pointer break-inside-avoid rounded-xl overflow-hidden bg-neutral-100 mb-2 border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all duration-200"
                    onClick={() => handleAddPhoto(photo)}
                  >
                    <img
                      src={photo.urls.small}
                      alt={photo.alt_description || 'Photo'}
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-400"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-neutral-800 scale-0 group-hover:scale-100 transition-transform duration-200 shadow-sm">
                        <Plus size={16} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 pt-5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-[9px] text-white/80 truncate">By {photo.user.name}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {photos.length > 0 && hasMore && (
              <button
                onClick={() => searchPhotos(lastSearchedQuery, page + 1)}
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
