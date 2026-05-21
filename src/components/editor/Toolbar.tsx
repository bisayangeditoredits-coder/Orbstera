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

  const addImageFromFile = (file: File, at?: { x: number; y: number }) => {
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
      setEditorState({ activeTool: 'image' });
      return;
    }

    setEditorState({ activeTool: toolId });
  };

  useEffect(() => {
    const onPickImage = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number }>).detail;
      fileInputRef.current?.click();
      if (detail && typeof detail.x === 'number') {
        (fileInputRef.current as HTMLInputElement & { _placeAt?: { x: number; y: number } })._placeAt = {
          x: detail.x,
          y: detail.y,
        };
      }
    };
    window.addEventListener('orbstera:pick-image', onPickImage);
    return () => window.removeEventListener('orbstera:pick-image', onPickImage);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
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
      className="editor-tool-rail shrink-0 flex flex-row md:flex-col items-center md:items-stretch gap-0 border-r border-neutral-200/80 bg-[#FAFBFC] z-20"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const input = e.target as HTMLInputElement & { _placeAt?: { x: number; y: number } };
          const at = input._placeAt;
          delete input._placeAt;
          if (file) addImageFromFile(file, at);
          e.target.value = '';
        }}
      />

      <div className="flex md:flex-col flex-1 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-none py-2 px-1.5 md:px-2 md:py-3 gap-0.5 md:gap-1 max-md:w-full max-md:justify-center">
        {toolsByGroup.map(({ group, tools }, gi) => (
          <div key={group} className="flex md:flex-col items-center gap-0.5">
            {gi > 0 && (
              <div
                className="max-md:w-px max-md:h-7 md:w-full md:h-px bg-neutral-200/90 my-0.5 md:my-1 shrink-0"
                aria-hidden
              />
            )}
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolClick(tool.id)}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                className={cn(
                  'relative flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-md transition-colors touch-manipulation',
                  activeTool === tool.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900',
                )}
              >
                <tool.icon size={18} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="hidden md:block w-full h-px bg-neutral-200/90 mx-2 shrink-0" />

      <div className="flex md:flex-col items-center gap-0.5 p-1.5 md:p-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            const next = !showGrid;
            setEditorState({ showGrid: next, snapToGrid: next });
          }}
          title={`${VIEW_TOOL_GRID.label} (${VIEW_TOOL_GRID.shortcut})`}
          className={cn(
            'flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-md transition-colors',
            showGrid ? 'bg-primary/10 text-primary' : 'text-neutral-500 hover:bg-neutral-100',
          )}
        >
          <VIEW_TOOL_GRID.icon size={18} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
