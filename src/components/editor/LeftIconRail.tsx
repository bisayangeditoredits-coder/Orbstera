import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Grid3x3 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { EditorToolId } from '@/types';

const RAIL_ITEMS = [
  { id: 'templates', icon: '/sidebar-toolbar-icons/design.png',  label: 'Design',   panel: 'generate' as const },
  { id: 'gen-fill',  icon: '/sidebar-toolbar-icons/ai fill.png', label: 'AI Fill',  tool: 'gen-fill' as EditorToolId },
  { id: 'recraft',   icon: '/sidebar-toolbar-icons/recraft.png', label: 'Recraft',  tool: 'recraft' as EditorToolId },
  { id: 'select',    icon: '/sidebar-toolbar-icons/select.png',  label: 'Select',   tool: 'select' as EditorToolId },
  { id: 'text',      icon: '/sidebar-toolbar-icons/text.png',    label: 'Text',     tool: 'text' as EditorToolId },
  { id: 'uploads',   icon: '/sidebar-toolbar-icons/uploads.png', label: 'Uploads',  tool: 'image' as EditorToolId },
  { id: 'layers',    icon: '/sidebar-toolbar-icons/layers.png',  label: 'Layers',   panel: 'layers' as const },
  { id: 'design',    icon: '/sidebar-toolbar-icons/style.png',   label: 'Style',    panel: 'design' as const },
  { id: 'notes',     icon: '/sidebar-toolbar-icons/notes.png',   label: 'Notes',    panel: 'notes' as const },
] as const;

export function LeftIconRail() {
  const setEditorState  = usePresentationStore((s) => s.setEditorState);
  const activeTool      = usePresentationStore((s) => s.editor.activeTool);
  const showGrid        = usePresentationStore((s) => s.editor.showGrid);
  const activePanel     = usePresentationStore((s) => s.activePanel);
  const isPanelOpen     = usePresentationStore((s) => s.isPanelOpen);
  const setActivePanel  = usePresentationStore((s) => s.setActivePanel);
  const setPanelOpen    = usePresentationStore((s) => s.setPanelOpen);

  const [showAiTip, setShowAiTip] = useState(false);
  const [tipPos, setTipPos] = useState({ top: 0, left: 0 });
  const aiVideoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAiMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.top;
    const left = rect.right + 8;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setTipPos({ top, left });
      setShowAiTip(true);
      const vid = aiVideoRef.current;
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    }, 1000);
  };
  const handleAiMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowAiTip(false);
  };

  const handleItem = (item: typeof RAIL_ITEMS[number]) => {
    if ('panel' in item && item.panel) {
      setActivePanel(item.panel);
      setPanelOpen(true);
      return;
    }
    if ('tool' in item && item.tool) {
      if (item.tool === 'gen-fill') {
        setEditorState({ activeTool: 'gen-fill', generativeFillTarget: null });
      } else if (item.tool === 'image') {
        // Open file picker immediately — no placeholder
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('orbstera:pick-image', { detail: { x: 360, y: 225 } }));
        }
        return;
      } else {
        setEditorState({ activeTool: item.tool as EditorToolId });
      }
      setPanelOpen(false);
    }
  };

  return (
    <aside
      className="shrink-0 flex flex-col items-center border-r border-neutral-200 bg-white z-20 select-none"
      style={{ width: 64 }}
    >
      <div className="flex-1 flex flex-col items-center gap-0 py-2 w-full overflow-y-auto scrollbar-none">
        {RAIL_ITEMS.map((item) => {
          const isToolActive  = 'tool' in item && item.tool && activeTool === item.tool && !isPanelOpen;
          const isPanelActive = 'panel' in item && item.panel && activePanel === item.panel && isPanelOpen;
          const isActive = isToolActive || isPanelActive;
          const isAiFill = item.id === 'gen-fill';

          return (
            <div
              key={item.id}
              className="relative w-full"
              onMouseEnter={isAiFill ? handleAiMouseEnter : undefined}
              onMouseLeave={isAiFill ? handleAiMouseLeave : undefined}
            >
              <button
                type="button"
                onClick={() => handleItem(item)}
                title={item.label}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1.5 w-full py-3.5 transition-all duration-150 cursor-pointer group',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100',
                )}
              >
                {isActive && (
                  <span className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-6 rounded-r-full",
                    isAiFill ? "bg-gradient-to-b from-[#5B7CFF] to-primary" : "bg-primary"
                  )} />
                )}

                <div className={cn(
                  "flex flex-col items-center gap-1.5",
                  isAiFill && "group-hover:scale-[1.05] transition-transform duration-200"
                )}>
                  {/* Custom PNG icon */}
                  <img
                    src={item.icon}
                    alt={item.label}
                    width={22}
                    height={22}
                    style={{
                      width: 22,
                      height: 22,
                      objectFit: 'contain',
                      transition: 'filter 0.15s ease, opacity 0.15s ease',
                      filter: isActive
                        ? 'invert(30%) sepia(100%) saturate(500%) hue-rotate(200deg) brightness(1.1)'
                        : 'invert(55%) sepia(0%) saturate(0%) brightness(0.7)',
                    }}
                    className="group-hover:[filter:invert(25%)_sepia(10%)_saturate(200%)_brightness(0.4)]"
                  />
                  <span className={cn(
                    "text-[9.5px] font-semibold tracking-wide leading-none text-center px-1",
                    isAiFill
                      ? isActive
                        ? "text-[#5B7CFF]"
                        : "text-neutral-400 group-hover:text-[#5B7CFF] transition-colors"
                      : ""
                  )}>
                    {item.label}
                  </span>
                </div>
              </button>

              {isAiFill && typeof window !== 'undefined' && createPortal(
                <motion.div
                  aria-hidden={!showAiTip}
                  animate={{
                    opacity: showAiTip ? 1 : 0,
                    x: showAiTip ? 0 : -4,
                    scale: showAiTip ? 1 : 0.97,
                  }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={{ top: tipPos.top, left: tipPos.left }}
                  className={cn(
                    'fixed z-[9999] bg-white p-2 rounded-lg shadow-xl border border-neutral-200 w-[280px] pointer-events-none origin-left',
                    !showAiTip && 'invisible',
                  )}
                >
                  <div className="mb-2 mt-0.5 px-0.5 text-left">
                    <h4 className="text-[11px] font-bold text-neutral-900 leading-none">Generative Fill</h4>
                    <p className="text-[9px] text-neutral-500 mt-1 leading-none">AI-powered image generation</p>
                  </div>
                  <div className="rounded-md overflow-hidden bg-neutral-900 relative aspect-[4/3]">
                    <video
                      ref={aiVideoRef}
                      src="/Video_Demo-tools/Genfill_VIDEO-DEMO.mp4"
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>,
                document.body,
              )}
            </div>
          );
        })}
      </div>

      {/* Grid toggle at bottom */}
      <div className="shrink-0 border-t border-neutral-200 py-1 w-full">
        <button
          type="button"
          title="Toggle Grid"
          onClick={() => setEditorState({ showGrid: !showGrid, snapToGrid: !showGrid })}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 w-full py-3 transition-all duration-150',
            showGrid ? 'text-primary bg-primary/10' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100',
          )}
        >
          <Grid3x3 size={20} strokeWidth={showGrid ? 2 : 1.6} />
          <span className="text-[9.5px] font-semibold tracking-wide leading-none">Grid</span>
        </button>
      </div>
    </aside>
  );
}
