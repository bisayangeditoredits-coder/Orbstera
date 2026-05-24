'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import { usePresentationStore } from '@/store/usePresentationStore';
import {
  Type, Square, ImageIcon, Minus, ChevronDown,
  Clock, Grid3x3, Map, SpellCheck, GitBranch,
  LayoutGrid, BookOpen, Smile, Star, Clapperboard,
  Shapes, Upload, QrCode, BarChart2, Sparkles, Flag,
  Circle, Triangle, Heart, Diamond, UserCircle2,
  Layout,
} from 'lucide-react';
import type { EditorToolId } from '@/types';

// ── Inline quick-shapes for the Shapes dropdown ───────────────────────────────
const QUICK_SHAPES: {
  name: string;
  svgPath: string;
  nativeType?: 'rect' | 'circle' | 'triangle' | 'star';
  color: string;
}[] = [
  { name: 'Rectangle', svgPath: 'M0 0 L100 0 L100 100 L0 100 Z', nativeType: 'rect',     color: '#60a5fa' },
  { name: 'Circle',    svgPath: 'M50,0 A50,50 0 1,1 50,100 A50,50 0 1,1 50,0 Z', nativeType: 'circle',   color: '#34d399' },
  { name: 'Triangle',  svgPath: 'M50 0 L100 100 L0 100 Z',        nativeType: 'triangle', color: '#f472b6' },
  { name: 'Star',      svgPath: 'M50,5 L61,35 L95,35 L68,57 L79,91 L50,70 L21,91 L32,57 L5,35 L39,35 Z', nativeType: 'star', color: '#fbbf24' },
  { name: 'Diamond',   svgPath: 'M50 0 L100 50 L50 100 L0 50 Z',  color: '#a78bfa' },
  { name: 'Heart',     svgPath: 'M50,90 C50,90 10,60 10,35 C10,15 35,15 50,35 C65,15 90,15 90,35 C90,60 50,90 50,90 Z', color: '#f87171' },
  { name: 'Pentagon',  svgPath: 'M50 0 L100 38 L81 100 L19 100 L0 38 Z', color: '#fb923c' },
  { name: 'Hexagon',   svgPath: 'M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z', color: '#38bdf8' },
  { name: 'Callout',   svgPath: 'M50 10 C20 10 0 25 0 50 C0 65 10 78 25 85 L20 100 L40 90 C43 90 47 90 50 90 C80 90 100 75 100 50 C100 25 80 10 50 10 Z', color: '#94a3b8' },
];

// ── Primary bar items ─────────────────────────────────────────────────────────
const PRIMARY_ITEMS: {
  tool?: EditorToolId;
  panel?: string;
  icon: React.ElementType;
  label: string;
  dividerAfter?: boolean;
  hasDropdown?: 'shapes' | 'image';
}[] = [
  { panel: 'layouts',   icon: Layout,       label: 'Layouts', dividerAfter: true },
  { tool: 'text',  icon: Type,      label: 'Text' },
  { tool: 'rect',  icon: Square,    label: 'Shape' },
  { tool: 'image', icon: ImageIcon, label: 'Image', hasDropdown: 'image', dividerAfter: true },
  { panel: 'photos',    icon: ImageIcon,    label: 'Photos' },
  { panel: 'icons',     icon: Star,         label: 'Icons' },
  { panel: 'shapes',    icon: Shapes,       label: 'Shapes', hasDropdown: 'shapes' },
  { panel: 'giphy',     icon: Smile,        label: 'Giphy' },
  { panel: 'videos',    icon: Clapperboard, label: 'Video', dividerAfter: true },
  { panel: 'wikipedia', icon: BookOpen,     label: 'Wiki' },
  { panel: 'grammar',   icon: SpellCheck,   label: 'Grammar' },
  { panel: 'ai',        icon: Sparkles,     label: 'AI Image', dividerAfter: true },
  { tool: 'divider',    icon: Minus,        label: 'Line' },
];

// ── More-menu items (QR + Map moved to Image dropdown) ───────────────────────
const MORE_ITEMS: { panel: string; icon: React.ElementType; label: string }[] = [
  { panel: 'apps',       icon: LayoutGrid, label: 'Apps' },
  { panel: 'charts',     icon: BarChart2,  label: 'Charts' },
  { panel: 'timeline',   icon: Clock,      label: 'Timeline' },
  { panel: 'svgpattern', icon: Grid3x3,    label: 'Patterns' },
  { panel: 'mermaid',    icon: GitBranch,  label: 'Diagram' },
];

// ─── ImageDropdown ────────────────────────────────────────────────────────────
function ImageDropdown({
  onClose, onOpenPanel,
}: {
  onClose: () => void;
  onOpenPanel: (panel: string) => void;
}) {
  const fireFilePicker = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orbstera:pick-image', { detail: { x: 360, y: 225 } }));
    }
    onClose();
  };

  const items = [
    {
      icon: Upload,
      label: 'Upload from Computer',
      sub: 'JPG, PNG, GIF, SVG, WEBP',
      action: fireFilePicker,
    },
    {
      icon: Map,
      label: 'Insert a Map',
      sub: 'OpenStreetMap · Satellite · Terrain',
      action: () => { onOpenPanel('map'); onClose(); },
    },
    {
      icon: QrCode,
      label: 'Generate QR Code',
      sub: 'URL, text, contact, Wi-Fi…',
      action: () => { onOpenPanel('qr'); onClose(); },
    },
  ];


  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ type: 'spring', damping: 22, stiffness: 380 }}
      className="absolute top-full mt-1.5 z-50 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.99)',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
        width: 248,
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400 px-4 pt-3 pb-2">
        Insert Image
      </p>
      <div className="px-2 pb-2 space-y-0.5">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-neutral-200 transition-colors">
              <item.icon size={13} className="text-neutral-500" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-neutral-800 leading-tight">{item.label}</p>
              <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="h-1.5" />
    </motion.div>
  );
}

// ─── ShapesDropdown ───────────────────────────────────────────────────────────
function ShapesDropdown({
  onClose, onOpenPanel,
}: {
  onClose: () => void;
  onOpenPanel: (panel: string) => void;
}) {
  const addElement        = usePresentationStore((s) => s.addElement);
  const selectElement     = usePresentationStore((s) => s.selectElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation      = usePresentationStore((s) => s.presentation);

  const handleShape = useCallback((shape: typeof QUICK_SHAPES[number]) => {
    if (currentSlideIndex === null || !presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    if (!slide) return;
    addElement(slide.id, {
      id: `el-shape-${Date.now()}`,
      type: 'shape',
      shapeType: shape.nativeType || 'path',
      content: shape.nativeType ? undefined : shape.svgPath,
      x: 440, y: 260, width: 200, height: 200,
      shapeStyle: {
        fill: shape.color,
        stroke: 'transparent',
        strokeWidth: 0,
        cornerRadius: shape.nativeType === 'rect' ? 8 : 0,
      },
      zIndex: 100,
      visible: true, opacity: 1, locked: false,
    } as any);
    selectElement(`el-shape-${Date.now() - 1}`);
    onClose();
  }, [addElement, selectElement, currentSlideIndex, presentation, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ type: 'spring', damping: 22, stiffness: 380 }}
      className="absolute top-full mt-1.5 z-50 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.99)',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
        width: 260,
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Quick shapes grid */}
      <div className="p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400 mb-2 px-1">
          Quick Insert
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {QUICK_SHAPES.map((shape) => (
            <button
              key={shape.name}
              type="button"
              onClick={() => handleShape(shape)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all group"
            >
              <div className="w-9 h-9 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full group-hover:scale-110 transition-transform">
                  <path d={shape.svgPath} fill={shape.color} />
                </svg>
              </div>
              <span className="text-[9px] font-semibold text-neutral-400 group-hover:text-neutral-700 leading-none">
                {shape.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-neutral-100 mx-3" />

      {/* Advanced shapes + Flags */}
      <div className="p-2">
        <button
          type="button"
          onClick={() => { onOpenPanel('shapes'); onClose(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all text-left group"
        >
          <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
            <Shapes size={13} className="text-neutral-500" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[12px] font-bold text-neutral-800">Advanced Shapes</p>
            <p className="text-[10px] text-neutral-400">All SVG shapes & symbols</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { onOpenPanel('flags'); onClose(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all text-left group"
        >
          <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
            <Flag size={13} className="text-neutral-500" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[12px] font-bold text-neutral-800">Country Flags</p>
            <p className="text-[10px] text-neutral-400">Browse all world flags</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { onOpenPanel('avatars'); onClose(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl hover:bg-neutral-100 transition-all text-left group"
        >
          <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition-colors">
            <UserCircle2 size={13} className="text-neutral-500" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[12px] font-bold text-neutral-800">Avatars</p>
            <p className="text-[10px] text-neutral-400">DiceBear character styles</p>
          </div>
        </button>
      </div>

      <div className="h-1.5" />
    </motion.div>
  );
}

// ─── TopInsertBar ─────────────────────────────────────────────────────────────
export function TopInsertBar() {
  const setEditorState    = usePresentationStore((s) => s.setEditorState);
  const activeTool        = usePresentationStore((s) => s.editor.activeTool);
  const addElement        = usePresentationStore((s) => s.addElement);
  const selectElement     = usePresentationStore((s) => s.selectElement);
  const presentation      = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const setActivePanel    = usePresentationStore((s) => s.setActivePanel);
  const setPanelOpen      = usePresentationStore((s) => s.setPanelOpen);
  const activePanel       = usePresentationStore((s) => s.activePanel);
  const isPanelOpen       = usePresentationStore((s) => s.isPanelOpen);

  const [showMore, setShowMore]           = useState(false);
  const [showShapes, setShowShapes]       = useState(false);
  const [showImage, setShowImage]         = useState(false);
  const [hoveredTip, setHoveredTip]       = useState<'Layouts' | 'Text' | null>(null);
  const moreRef    = useRef<HTMLDivElement>(null);
  const shapesRef  = useRef<HTMLDivElement>(null);
  const imageRef   = useRef<HTMLDivElement>(null);
  const layoutsVideoRef = useRef<HTMLVideoElement>(null);
  const textVideoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playTipVideo = (label: 'Layouts' | 'Text') => {
    const vid = label === 'Layouts' ? layoutsVideoRef.current : textVideoRef.current;
    if (!vid) return;
    vid.currentTime = 0;
    vid.play().catch(() => {});
  };

  const handleTipMouseEnter = (label: 'Layouts' | 'Text') => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredTip(label);
      playTipVideo(label);
    }, 1000);
  };
  const handleTipMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredTip(null);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current  && !moreRef.current.contains(e.target as Node))  setShowMore(false);
      if (shapesRef.current && !shapesRef.current.contains(e.target as Node)) setShowShapes(false);
      if (imageRef.current  && !imageRef.current.contains(e.target as Node))  setShowImage(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = (panel: string) => {
    setActivePanel(panel as any);
    setPanelOpen(true);
  };

  const handlePrimary = (item: typeof PRIMARY_ITEMS[number]) => {
    if (item.hasDropdown === 'shapes') {
      setShowShapes((v) => !v);
      setShowMore(false); setShowImage(false);
      return;
    }
    if (item.hasDropdown === 'image') {
      setShowImage((v) => !v);
      setShowMore(false); setShowShapes(false);
      return;
    }
    if (item.panel) {
      openPanel(item.panel);
      return;
    }
    if (item.tool === 'divider') {
      const slide = presentation?.slides[currentSlideIndex];
      if (!slide) return;
      const newId = `el-divider-${Date.now()}`;
      addElement(slide.id, {
        id: newId, type: 'shape', shapeType: 'line',
        x: 140, y: 360, width: 1000, height: 4,
        zIndex: (slide.elements?.length || 0) + 1,
        visible: true, opacity: 1, locked: false,
        shapeStyle: { fill: 'rgba(0,0,0,0.2)', stroke: 'rgba(0,0,0,0.2)', strokeWidth: 2 },
      } as any);
      selectElement(newId);
      setEditorState({ activeTool: 'select' });
      return;
    }
    if (item.tool) {
      setEditorState({ activeTool: item.tool as EditorToolId });
      setPanelOpen(false);
    }
  };

  const handleMore = (panel: string) => {
    openPanel(panel);
    setShowMore(false);
  };

  return (
    <div
      className="shrink-0 flex items-center justify-center gap-0.5 px-3 border-b border-neutral-200 bg-white z-30"
      style={{ height: 44 }}
    >
      {PRIMARY_ITEMS.map((item, idx) => {
        const Icon = item.icon;
        const isToolActive  = item.tool && item.tool !== 'divider' && activeTool === item.tool && !isPanelOpen;
        const isPanelActive = item.panel && activePanel === item.panel && isPanelOpen;
        const isShapesOpen  = item.hasDropdown === 'shapes' && showShapes;
        const isImageOpen   = item.hasDropdown === 'image'  && showImage;
        const isActive = isToolActive || isPanelActive || isShapesOpen || isImageOpen;

        // Image button — opens Upload / Map / QR dropdown
        if (item.hasDropdown === 'image') {
          return (
            <div key={idx} className="flex items-center">
              <div ref={imageRef} className="relative">
                <button
                  type="button"
                  onClick={() => handlePrimary(item)}
                  title="Image"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Icon size={14} strokeWidth={isActive ? 2 : 1.7} />
                  <span className="hidden sm:inline">Image</span>
                  <ChevronDown
                    size={11}
                    strokeWidth={2}
                    className="transition-transform duration-150"
                    style={{ transform: showImage ? 'rotate(180deg)' : 'none' }}
                  />
                </button>

                <AnimatePresence>
                  {showImage && (
                    <ImageDropdown
                      onClose={() => setShowImage(false)}
                      onOpenPanel={openPanel}
                    />
                  )}
                </AnimatePresence>
              </div>
              {item.dividerAfter && <div className="w-px h-5 bg-neutral-200 mx-1.5" />}
            </div>
          );
        }

        // Shapes button — opens shapes grid dropdown
        if (item.hasDropdown === 'shapes') {
          return (
            <div key={idx} className="flex items-center">
              <div ref={shapesRef} className="relative">
                <button
                  type="button"
                  onClick={() => handlePrimary(item)}
                  title="Shapes"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Icon size={14} strokeWidth={isActive ? 2 : 1.7} />
                  <span className="hidden sm:inline">Shapes</span>
                  <ChevronDown
                    size={11}
                    strokeWidth={2}
                    className="transition-transform duration-150"
                    style={{ transform: showShapes ? 'rotate(180deg)' : 'none' }}
                  />
                </button>

                <AnimatePresence>
                  {showShapes && (
                    <ShapesDropdown
                      onClose={() => setShowShapes(false)}
                      onOpenPanel={openPanel}
                    />
                  )}
                </AnimatePresence>
              </div>
              {item.dividerAfter && <div className="w-px h-5 bg-neutral-200 mx-1.5" />}
            </div>
          );
        }

        // Layouts & Text buttons — with resetting video tooltip
        if (item.label === 'Layouts' || item.label === 'Text') {
          return (
            <div
              key={idx}
              className="flex items-center relative"
              onMouseEnter={() => handleTipMouseEnter(item.label as 'Layouts' | 'Text')}
              onMouseLeave={handleTipMouseLeave}
            >
              <button
                type="button"
                onClick={() => handlePrimary(item)}
                title={item.label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2 : 1.7} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>

              {/* Video tooltip — kept mounted so preload works; visibility via CSS */}
              <motion.div
                aria-hidden={hoveredTip !== item.label}
                animate={{
                  opacity: hoveredTip === item.label ? 1 : 0,
                  y: hoveredTip === item.label ? 0 : -4,
                  scale: hoveredTip === item.label ? 1 : 0.97,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'absolute top-full mt-2 left-0 z-[999] bg-white p-2 rounded-lg shadow-xl border border-neutral-200 w-[280px] pointer-events-none origin-top-left',
                  hoveredTip !== item.label && 'invisible',
                )}
              >
                <div className="mb-2 mt-0.5 px-0.5">
                  <h4 className="text-[11px] font-bold text-neutral-900 leading-none">
                    {item.label === 'Layouts' ? 'Smart Layouts' : 'Text Tool'}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1 leading-none">
                    {item.label === 'Layouts' ? 'Auto-arrange slide elements' : 'Add custom text elements'}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-md overflow-hidden bg-neutral-900 relative',
                    item.label === 'Layouts' ? 'aspect-square' : 'aspect-[4/3]',
                  )}
                >
                  <video
                    ref={item.label === 'Layouts' ? layoutsVideoRef : textVideoRef}
                    src={
                      item.label === 'Layouts'
                        ? '/Video_Demo-tools/LAYOUT_TOOL.mp4'
                        : '/Video_Demo-tools/TEXT_TOOL-VIDEO-DEMO.mp4'
                    }
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              {item.dividerAfter && <div className="w-px h-5 bg-neutral-200 mx-1.5" />}
            </div>
          );
        }

        return (
          <div key={idx} className="flex items-center relative group">
            <button
              type="button"
              onClick={() => handlePrimary(item)}
              title={item.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Icon size={14} strokeWidth={isActive ? 2 : 1.7} />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
            {item.dividerAfter && <div className="w-px h-5 bg-neutral-200 mx-1.5" />}
          </div>
        );
      })}

      {/* More button */}
      <div className="w-px h-5 bg-neutral-200 mx-1" />
      <div ref={moreRef} className="relative">
        <button
          type="button"
          onClick={() => { setShowMore((v) => !v); setShowShapes(false); }}
          title="More tools"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
            showMore ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span>More</span>
          <ChevronDown
            size={12}
            strokeWidth={2}
            className="transition-transform duration-150"
            style={{ transform: showMore ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 380 }}
              className="absolute top-full mt-1.5 right-0 z-50 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                minWidth: 180,
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 px-4 pt-3 pb-1.5">
                More Tools
              </p>
              <div className="grid grid-cols-2 gap-px p-2 pt-1">
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePanel === item.panel && isPanelOpen;
                  return (
                    <button
                      key={item.panel}
                      type="button"
                      onClick={() => handleMore(item.panel)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left ${
                        isActive ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      <Icon size={14} strokeWidth={1.7} className="shrink-0" />
                      <span className="text-[12px] font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="h-2" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
