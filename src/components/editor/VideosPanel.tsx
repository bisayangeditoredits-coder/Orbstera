'use client';

import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Video as VideoIcon, Loader2, X, Plus } from '@/components/icons/lucide';
import { PanelHeaderIcon, PanelCloseIcon, panelCloseButtonClass } from '@/components/icons/panel-chrome';

const PEXELS_API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY || '';

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string; // Thumbnail
  duration: number;
  user: { name: string; };
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
};

export function VideosPanel({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('nature');
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const searchVideos = async (searchQuery: string, pageNum = 1) => {
    if (!PEXELS_API_KEY) { setError('Missing Pexels API Key.'); return; }
    if (!searchQuery.trim()) return;
    if (pageNum === 1) { setLoading(true); setVideos([]); } else { setLoadingMore(true); }
    setError('');
    setLastSearchedQuery(searchQuery);
    
    try {
      const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&page=${pageNum}&per_page=15`, {
        headers: {
          Authorization: PEXELS_API_KEY
        }
      });
      if (!res.ok) throw new Error('Failed to fetch videos. Check your API key.');
      const data = await res.json();
      if (pageNum === 1) { setVideos(data.videos || []); } else { setVideos(prev => [...prev, ...(data.videos || [])]); }
      setHasMore(data.page < data.total_results / 15);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { if (PEXELS_API_KEY) searchVideos('nature'); }, []);

  const handleAddVideo = (video: PexelsVideo) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    // Find the best quality MP4 file (prefer hd, fallback to sd)
    const file = video.video_files.find(f => f.quality === 'hd' && f.file_type === 'video/mp4') 
              || video.video_files.find(f => f.quality === 'sd' && f.file_type === 'video/mp4')
              || video.video_files[0];
              
    if (!file) return;

    const MAX_W = 800, MAX_H = 450;
    let w = file.width || 800, h = file.height || 450;
    if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
    if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H; }

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      x: (1280 - w) / 2, 
      y: (720 - h) / 2,
      width: w, 
      height: h, 
      src: file.link,
      content: video.image, // Store thumbnail as content for editor display
      zIndex: 100,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <PanelHeaderIcon icon={VideoIcon} className="from-teal-50 to-teal-50/80 border-teal-200/60" iconClassName="text-teal-600" />
            <div>
              <h2 className="text-[14px] font-bold text-neutral-900 leading-tight">Stock Videos</h2>
              <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Powered by Pexels</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className={panelCloseButtonClass} aria-label="Close panel">
              <PanelCloseIcon icon={X} />
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
              onKeyDown={(e) => e.key === 'Enter' && searchVideos(query, 1)}
              placeholder="Search videos (e.g. nature, abstract)..."
              className="w-full h-9 bg-neutral-50 border border-neutral-200 rounded-lg pl-8 pr-3 text-[12px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400/50 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {!PEXELS_API_KEY ? (
          <div className="flex flex-col items-center justify-center text-center h-full p-4 gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <VideoIcon size={18} className="text-teal-500" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-neutral-800">API Key Required</p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px] leading-relaxed">
                Add <code className="bg-neutral-100 px-1 rounded text-[10px] text-teal-700">NEXT_PUBLIC_PEXELS_API_KEY</code> to your .env file to enable video search.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-teal-500" size={22} />
          </div>
        ) : error ? (
          <div className="text-[12px] text-red-500 text-center p-4 bg-red-50 rounded-xl border border-red-100">
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="columns-2 gap-2 space-y-2">
              <AnimatePresence>
                {videos.map((video, i) => (
                  <motion.div
                    key={`${video.id}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative group cursor-pointer break-inside-avoid rounded-xl overflow-hidden bg-neutral-100 mb-2 border border-neutral-200/50 hover:border-teal-300 hover:shadow-md transition-all duration-200"
                    onClick={() => handleAddVideo(video)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.image}
                      alt="Pexels Video"
                      className="w-full h-auto object-cover group-hover:scale-[1.05] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-teal-600 scale-0 group-hover:scale-100 transition-transform duration-200 shadow-sm">
                        <Plus size={16} strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 pt-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="flex items-center justify-between text-white/90">
                        <p className="text-[9px] font-bold truncate pr-2">By {video.user.name}</p>
                        <span className="text-[9px] font-mono shrink-0">{video.duration}s</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {videos.length > 0 && hasMore && (
              <button
                onClick={() => searchVideos(lastSearchedQuery, page + 1)}
                disabled={loadingMore}
                className="w-full py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-[12px] font-bold hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center justify-center gap-2"
              >
                {loadingMore ? <Loader2 size={13} className="animate-spin text-teal-500" /> : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
