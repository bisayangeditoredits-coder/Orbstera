'use client';

import { useEffect, useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import type { EditorToolId, SlideElement } from '@/types';
import { EDITOR_TOOLS, TOOL_GROUP_ORDER, VIEW_TOOL_GRID } from '@/lib/editor-tools';
import { cn } from '@/lib/cn';

export function Toolbar() {
  const presentation = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const activeTool = usePresentationStore((s) => s.editor.activeTool);
  const showGrid = usePresentationStore((s) => s.editor.showGrid);
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  const addElement = usePresentationStore((s) => s.addElement);
  const selectElement = usePresentationStore((s) => s.selectElement);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const slide = presentation?.slides[currentSlideIndex];

  const addImageFromFile = (file: File, at?: { x: number; y: number; elementId?: string }) => {
    if (!slide) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = 560;
        const ratio = Math.min(maxW / img.width, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const x = at ? at.x : (1280 - w) / 2;
        const y = at ? at.y : (720 - h) / 2;
        
        if (at?.elementId) {
          usePresentationStore.getState().updateElement(slide.id, at.elementId, {
            src,
            width: w,
            height: h,
          });
          selectElement(at.elementId);
        } else {
          const imgEl: SlideElement = {
            id: `el-image-${currentSlideIndex}-${Date.now()}`,
            type: 'image',
            x: Math.round(Math.max(0, Math.min(1280 - w, x))),
            y: Math.round(Math.max(0, Math.min(720 - h, y))),
            width: w,
            height: h,
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: (slide.elements?.length || 0) + 1,
            src,
          };
          addElement(slide.id, imgEl);
          selectElement(imgEl.id);
        }
        setEditorState({ activeTool: 'select' });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleToolClick = (toolId: EditorToolId) => {
    if (!slide) return;
    if (toolId === 'select') {
      selectElement(null);
      setEditorState({ activeTool: 'select' });
      return;
    }
    if (toolId === 'gen-fill') {
      selectElement(null);
      setEditorState({ activeTool: 'gen-fill', generativeFillTarget: null });
      return;
    }
    if (toolId === 'image') {
      // Open file picker immediately — no canvas click needed
      fileInputRef.current?.click();
      return;
    }
    setEditorState({ activeTool: toolId });
  };

  useEffect(() => {
    const onPickImage = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number; elementId?: string }>).detail;
      fileInputRef.current?.click();
      if (detail && typeof detail.x === 'number') {
        (fileInputRef.current as HTMLInputElement & { _placeAt?: { x: number; y: number; elementId?: string } })._placeAt = {
          x: detail.x,
          y: detail.y,
          elementId: detail.elementId,
        };
      }
    };
    window.addEventListener('orbstera:pick-image', onPickImage);
    return () => window.removeEventListener('orbstera:pick-image', onPickImage);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!e.key) return;
      const key = e.key.toLowerCase();
      if (key === 'v') handleToolClick('select');
      if (key === 't') handleToolClick('text');
      if (key === 'i') handleToolClick('image');
      if (key === 'r') handleToolClick('rect');
      if (key === 'o' || key === 'c') handleToolClick('circle');
      if (key === 'l') handleToolClick('line');
      if (key === 'g' && e.shiftKey) {
        e.preventDefault();
        handleToolClick('gen-fill');
      } else if (key === 'g' && !e.ctrlKey && !e.metaKey) {
        setEditorState({ showGrid: !showGrid });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, showGrid]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!slide) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) addImageFromFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  const toolsByGroup = TOOL_GROUP_ORDER.map((group) => ({
    group,
    tools: EDITOR_TOOLS.filter((t) => t.group === group),
  })).filter((g) => g.tools.length > 0);

  return (
    <div
      id="tour-toolbar"
      className="editor-tool-rail shrink-0 flex flex-row md:flex-col items-center md:items-stretch z-20"
      style={{
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const input = e.target as HTMLInputElement & { _placeAt?: { x: number; y: number; elementId?: string } };
          const at = input._placeAt;
          delete input._placeAt;
          if (file) addImageFromFile(file, at);
          e.target.value = '';
        }}
      />

      {/* Main tool list */}
      <div className="flex md:flex-col flex-1 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-none px-2 py-3 gap-0 max-md:w-full max-md:justify-center">
        {toolsByGroup.map(({ group, tools }, gi) => (
          <div key={group} className="flex md:flex-col items-center">
            {gi > 0 && (
              <div className="max-md:w-px max-md:h-5 md:w-6 md:h-px bg-gray-200 shrink-0 md:my-2 max-md:mx-2" aria-hidden />
            )}
            <div className="flex md:flex-col items-center gap-0.5">
              {tools.map((tool) => {
                const isActive = activeTool === tool.id;
                return (
                  <ToolButton
                    key={tool.id}
                    tool={tool}
                    isActive={isActive}
                    onClick={() => handleToolClick(tool.id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section: grid */}
      <div className="md:border-t md:border-gray-100 flex md:flex-col items-center px-2 py-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            const next = !showGrid;
            setEditorState({ showGrid: next, snapToGrid: next });
          }}
          title={`${VIEW_TOOL_GRID.label} (${VIEW_TOOL_GRID.shortcut})`}
          className={cn(
            'relative flex items-center justify-center rounded-lg transition-all duration-150 group touch-manipulation',
            'h-9 w-9 md:w-9',
          )}
          style={showGrid ? {
            background: 'rgba(99,102,241,0.1)',
            color: '#4f46e5',
          } : {
            color: '#9ca3af',
          }}
        >
          <span
            className={cn(
              'absolute inset-0 rounded-lg transition-opacity duration-150',
              showGrid ? 'opacity-0' : 'opacity-0 group-hover:opacity-100',
            )}
            style={{ background: '#f3f4f6' }}
            aria-hidden
          />
          <VIEW_TOOL_GRID.icon size={16} strokeWidth={1.75} className="relative z-10" />
        </button>
      </div>
    </div>
  );
}

/* ─── Individual tool button ─── */
interface ToolButtonProps {
  tool: { id: string; icon: React.ElementType; label: string; shortcut?: string };
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ tool, isActive, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tool.shortcut ? `${tool.label}  ·  ${tool.shortcut}` : tool.label}
      className={cn(
        'relative flex items-center justify-center rounded-lg transition-all duration-[120ms] touch-manipulation select-none group',
        'h-9 w-9',
      )}
      style={isActive ? {
        background: '#4f46e5',
        color: '#ffffff',
        boxShadow: '0 1px 6px rgba(79,70,229,0.4)',
      } : {
        color: '#6b7280',
        background: 'transparent',
      }}
    >
      {/* Hover layer — only when inactive */}
      {!isActive && (
        <span
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ background: '#f3f4f6' }}
          aria-hidden
        />
      )}

      <tool.icon
        size={16}
        strokeWidth={isActive ? 2.1 : 1.75}
        className="relative z-10"
      />
    </button>
  );
}
