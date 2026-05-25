'use client';

import { usePresentationStore } from '@/store/usePresentationStore';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon, Star, Smile, Video as YoutubeIcon, BarChart3, QrCode,
  ImagePlus, BookOpen, SpellCheck, X, Grid3x3, LayoutTemplate,
  UserCircle2, Flag, Clapperboard, Smartphone
} from '@/components/icons/lucide';

const APPS = [
  { id: 'photos',         icon: ImageIcon,        label: 'Photos',     color: '#0ea5e9', bg: '#e0f2fe' },
  { id: 'videos',         icon: Clapperboard,     label: 'Stock Video',color: '#0d9488', bg: '#ccfbf1' },
  { id: 'mockups',        icon: Smartphone,       label: 'Mockups',    color: '#4f46e5', bg: '#e0e7ff' },
  { id: 'avatars',        icon: UserCircle2,      label: 'Avatars',    color: '#f97316', bg: '#ffedd5' },
  { id: 'flags',          icon: Flag,             label: 'Flags',      color: '#16a34a', bg: '#dcfce7' },
  { id: 'icons',          icon: Star,             label: 'Icons',      color: '#f59e0b', bg: '#fef3c7' },
  { id: 'giphy',          icon: Smile,            label: 'Giphy',      color: '#ec4899', bg: '#fce7f3' },
  { id: 'video',          icon: YoutubeIcon,      label: 'YouTube',    color: '#ef4444', bg: '#fee2e2' },
  { id: 'charts',         icon: BarChart3,        label: 'Charts',     color: '#10b981', bg: '#d1fae5' },
  { id: 'qr',             icon: QrCode,           label: 'QR Code',    color: '#8b5cf6', bg: '#ede9fe' },
  { id: 'pollinations',   icon: ImagePlus,        label: 'AI Image',   color: '#6366f1', bg: '#eef2ff' },
  { id: 'wikipedia',      icon: BookOpen,         label: 'Wiki',       color: '#78716c', bg: '#f5f5f4' },
  { id: 'wordsuggester',  icon: SpellCheck,       label: 'Words',      color: '#14b8a6', bg: '#ccfbf1' },
];

export function AppsPanel({ onClose }: { onClose?: () => void }) {
  const setActivePanel = usePresentationStore((s) => s.setActivePanel);

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] overflow-hidden">
      <div className="shrink-0 bg-white border-b border-neutral-100 px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-bold text-neutral-900 tracking-tight">Apps & Elements</h2>
          <p className="text-[11px] text-neutral-400 font-medium mt-0.5">Discover more tools</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all flex items-center justify-center">
            <X size={15} />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ scrollbarWidth: 'none' }}>
        <div className="grid grid-cols-2 gap-3">
          {APPS.map((app, i) => {
            const Icon = app.icon;
            return (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => setActivePanel(app.id as any)}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-neutral-200/80 hover:border-neutral-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110" style={{ background: app.bg }}>
                  <Icon size={20} style={{ color: app.color }} strokeWidth={2.2} />
                </div>
                <span className="text-[11.5px] font-bold text-neutral-700 group-hover:text-neutral-900">
                  {app.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
