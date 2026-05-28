'use client';

import { useState, useEffect } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Video as VideoIcon, Loader2, X, Plus, GripVertical } from 'lucide-react';

const PEXELS_API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY || '';

// Key used for drag-and-drop payload
export const DRAG_TYPE_PEXELS_VIDEO = 'application/x-orbstera-pexels-video';

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
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

/** Picks the best quality MP4 file from a Pexels video */
function pickBestFile(video: PexelsVideo) {
  return (
    video.video_files.find((f) => f.quality === 'hd' && f.file_type === 'video/mp4') ||
    video.video_files.find((f) => f.quality === 'sd' && f.file_type === 'video/mp4') ||
    video.video_files.find((f) => f.file_type === 'video/mp4') ||
    video.video_files[0]
  );
}

/** Ensures Pexels video link is treated as a video by appending .mp4 extension if needed */
export function normalizeVideoSrc(link: string): string {
  if (!link) return link;
  const base = link.split('?')[0];
  const qs = link.includes('?') ? link.slice(link.indexOf('?')) : '';
  if (base.endsWith('.mp4')) return link;
  return `${base}.mp4${qs}`;
}

export function VideosPanel({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('nature');
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [draggingId, setDraggingId] = useState<number | null>(null);

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
      const res = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&page=${pageNum}&per_page=15`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );
      if (!res.ok) throw new Error('Failed to fetch videos. Check your API key.');
      const data = await res.json();
      if (pageNum === 1) {
        setVideos(data.videos || []);
      } else {
        setVideos((prev) => [...prev, ...(data.videos || [])]);
      }
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

  const insertVideo = (video: PexelsVideo, dropX?: number, dropY?: number) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    const file = pickBestFile(video);
    if (!file) return;

    const SLIDE_W = 1280, SLIDE_H = 720;
    const MAX_W = 800, MAX_H = 450;
    let w = file.width || video.width || 800;
    let h = file.height || video.height || 450;
    if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
    if (h > MAX_H) { w = w * (MAX_H / h); h = MAX_H; }

    const x = dropX != null
      ? Math.max(0, Math.min(SLIDE_W - w, dropX - w / 2))
      : (SLIDE_W - w) / 2;
    const y = dropY != null
      ? Math.max(0, Math.min(SLIDE_H - h, dropY - h / 2))
      : (SLIDE_H - h) / 2;

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      x,
      y,
      width: w,
      height: h,
      src: normalizeVideoSrc(file.link),
      zIndex: 100,
    });
  };

  const handleAddVideo = (video: PexelsVideo) => insertVideo(video);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, video: PexelsVideo) => {
    setDraggingId(video.id);
    const file = pickBestFile(video);
    if (!file) return;
    const payload = JSON.stringify({
      videoId: video.id,
      link: normalizeVideoSrc(file.link),
      thumbnail: video.image,
      width: file.width || video.width,
      height: file.height || video.height,
      duration: video.duration,
    });
    e.dataTransfer.setData(DRAG_TYPE_PEXELS_VIDEO, payload);
    e.dataTransfer.effectAllowed = 'copy';
    // Build a small drag ghost using an offscreen canvas (120×68px)
    // We use an offscreen canvas because the browser needs a DOM element
    // that is already painted — a newly created Image that hasn't loaded
    // yet results in the full DOM node being used as the ghost (very large).
    const GHOST_W = 120;
    const GHOST_H = 68;
    try {
      // Find the already-rendered <img> element inside the card being dragged
      const cardEl = (e.currentTarget as HTMLElement);
      const renderedImg = cardEl.querySelector('img') as HTMLImageElement | null;
      const canvas = document.createElement('canvas');
      canvas.width = GHOST_W;
      canvas.height = GHOST_H;
      canvas.style.position = 'fixed';
      canvas.style.top = '-9999px';
      canvas.style.left = '-9999px';
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (renderedImg && renderedImg.complete && renderedImg.naturalWidth > 0) {
          ctx.drawImage(renderedImg, 0, 0, GHOST_W, GHOST_H);
        } else {
          // Fallback: dark card with play icon
          ctx.fillStyle = '#1e2430';
          ctx.fillRect(0, 0, GHOST_W, GHOST_H);
          ctx.fillStyle = 'rgba(56,189,248,0.9)';
          ctx.beginPath();
          ctx.arc(GHOST_W / 2, GHOST_H / 2, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(GHOST_W / 2 - 6, GHOST_H / 2 - 8);
          ctx.lineTo(GHOST_W / 2 + 10, GHOST_H / 2);
          ctx.lineTo(GHOST_W / 2 - 6, GHOST_H / 2 + 8);
          ctx.closePath();
          ctx.fill();
        }
        // Overlay rounded border
        ctx.strokeStyle = 'rgba(56,189,248,0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, GHOST_W - 2, GHOST_H - 2);
      }
      e.dataTransfer.setDragImage(canvas, GHOST_W / 2, GHOST_H / 2);
      // Clean up the canvas after drag starts
      setTimeout(() => { canvas.remove(); }, 0);
    } catch {
      // Silently ignore — browser will use default ghost
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
              <VideoIcon size={16} className="text-teal-600" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-neutral-900 leading-tight">Stock Videos</h2>
              <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Powered by Pexels · Drag to canvas</p>
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
          <div className="flex flex-col gap-3">
            <div className="columns-2 gap-2 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`relative rounded-xl bg-neutral-100 overflow-hidden ${i % 2 === 0 ? 'h-[140px]' : 'h-[180px]'}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-sweep" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-[12px] text-red-500 text-center p-4 bg-red-50 rounded-xl border border-red-100">
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 pt-10 opacity-70">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <VideoIcon size={20} className="text-neutral-400" />
            </div>
            <p className="text-[13px] font-bold text-neutral-600">No videos found</p>
            <p className="text-[11px] text-neutral-400 mt-1 max-w-[180px] mx-auto">
              Try searching for "abstract", "nature", or "office".
            </p>
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
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLDivElement>, video)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`relative group cursor-grab active:cursor-grabbing break-inside-avoid rounded-xl overflow-hidden bg-neutral-100 mb-2 border transition-all duration-200 ${
                      draggingId === video.id
                        ? 'border-teal-400 shadow-lg shadow-teal-500/20 scale-[0.97] opacity-70'
                        : 'border-neutral-200/50 hover:border-teal-300 hover:shadow-md'
                    }`}
                    onClick={() => handleAddVideo(video)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.image}
                      alt="Pexels Video"
                      className="w-full h-auto object-cover group-hover:scale-[1.05] transition-transform duration-500"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-teal-600 scale-0 group-hover:scale-100 transition-transform duration-200 shadow-sm">
                        <Plus size={16} strokeWidth={2.5} />
                      </div>
                    </div>
                    {/* Drag hint icon */}
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-5 h-5 rounded bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <GripVertical size={10} className="text-white" />
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
