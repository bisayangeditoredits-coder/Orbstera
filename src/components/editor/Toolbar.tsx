'use client';

import { useEffect, useRef } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { SlideElement } from '@/types';
import {
  MousePointer2, Type, Image as ImageIcon, Square, Circle,
  Triangle, BarChart2, Undo2, Redo2, Grid3X3, Star, Minus,
  ArrowRight, PenLine, Upload, Sparkles,
} from 'lucide-react';

const TOOLBAR_TOOLS = [
  { id: 'select',   icon: MousePointer2, label: 'Select (V)',    separator: false },
  { id: 'gen-fill', icon: Sparkles,      label: 'Generative Fill', separator: true },
  { id: 'text',     icon: Type,          label: 'Text (T)',      separator: false },
  { id: 'image',    icon: ImageIcon,     label: 'Image (I)',     separator: true  },
  { id: 'rect',     icon: Square,        label: 'Rectangle (R)', separator: false },
  { id: 'circle',   icon: Circle,        label: 'Circle (C)',    separator: false },
  { id: 'triangle', icon: Triangle,      label: 'Triangle',      separator: false },
  { id: 'star',     icon: Star,          label: 'Star',          separator: false },
  { id: 'line',     icon: Minus,         label: 'Line (L)',      separator: false },
  { id: 'arrow',    icon: ArrowRight,    label: 'Arrow',         separator: true  },
  { id: 'chart',    icon: BarChart2,     label: 'Chart',         separator: false },
];

export function Toolbar() {
  const {
    presentation,
    currentSlideIndex,
    editor,
    setEditorState,
    addElement,
    selectElement,
    undo,
    redo,
    history,
    historyIndex,
  } = usePresentationStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const slide = presentation?.slides[currentSlideIndex];

  const addImageFromFile = (file: File) => {
    if (!slide) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      // Read natural dimensions
      const img = new window.Image();
      img.onload = () => {
        const maxW = 600;
        const ratio = Math.min(maxW / img.width, 1);
        const w = Math.round(img.width  * ratio);
        const h = Math.round(img.height * ratio);
        const sIdx = currentSlideIndex;
        const imgEl: SlideElement = {
          id:      `el-image-${sIdx}-${Date.now()}`,
          type:    'image',
          x:       (1280 - w) / 2,
          y:       (720  - h) / 2,
          width:   w,
          height:  h,
          opacity: 1,
          visible: true,
          locked:  false,
          zIndex:  (slide.elements?.length || 0) + 1,
          src,
        };
        addElement(slide.id, imgEl);
        selectElement(imgEl.id);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleToolClick = (toolId: string) => {
    if (!slide) return;

    if (toolId === 'select') { 
      selectElement(null); 
      setEditorState({ activeTool: 'select' });
      return; 
    }
    
    if (toolId === 'gen-fill') {
      selectElement(null);
      setEditorState({ activeTool: 'gen-fill' });
      return;
    }

    // Reset tool to select after clicking other insertion tools
    setEditorState({ activeTool: 'select' });

    const sIdx    = currentSlideIndex;
    const createId = (p: string) => `${p}-${sIdx}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const base = {
      id:      createId('el-tool'),
      x:       320 + Math.random() * 60,
      y:       180 + Math.random() * 60,
      opacity: 1,
      visible: true,
      locked:  false,
      zIndex:  (slide.elements?.length || 0) + 1,
    };

    let el: SlideElement | null = null;

    if (toolId === 'text') {
      el = {
        ...base, type: 'text', width: 400, height: 100,
        content: 'Edit your text',
        textStyle: {
          fontFamily: presentation?.fontPairing?.heading || 'Inter',
          fontSize:   42, fontWeight: 'bold',
          color:      presentation?.colorPalette?.[1] || '#FFFFFF',
          textAlign:  'left', lineHeight: 1.2,
        },
      };
    } else if (toolId === 'rect') {
      el = {
        ...base, type: 'shape', shapeType: 'rect', width: 300, height: 180,
        shapeStyle: { fill: presentation?.colorPalette?.[2] || '#7B61FF', stroke: 'transparent', strokeWidth: 0, cornerRadius: 12 },
      };
    } else if (toolId === 'circle') {
      el = {
        ...base, type: 'shape', shapeType: 'circle', width: 200, height: 200,
        shapeStyle: { fill: presentation?.colorPalette?.[2] || '#10B981', stroke: 'transparent', strokeWidth: 0 },
      };
    } else if (toolId === 'triangle') {
      el = {
        ...base, type: 'shape', shapeType: 'triangle', width: 220, height: 200,
        shapeStyle: { fill: presentation?.colorPalette?.[3] || '#F43F5E', stroke: 'transparent', strokeWidth: 0 },
      };
    } else if (toolId === 'star') {
      el = {
        ...base, type: 'shape', shapeType: 'star', width: 200, height: 200,
        shapeStyle: { fill: presentation?.colorPalette?.[2] || '#FBBF24', stroke: 'transparent', strokeWidth: 0 },
      };
    } else if (toolId === 'line') {
      el = {
        ...base, type: 'shape', shapeType: 'line', width: 300, height: 4,
        shapeStyle: { fill: 'transparent', stroke: presentation?.colorPalette?.[1] || '#FFFFFF', strokeWidth: 3 },
      };
    } else if (toolId === 'arrow') {
      el = {
        ...base, type: 'shape', shapeType: 'arrow', width: 300, height: 60,
        shapeStyle: { fill: presentation?.colorPalette?.[2] || '#7B61FF', stroke: 'transparent', strokeWidth: 0 },
      };
    } else if (toolId === 'image') {
      fileInputRef.current?.click();
      return;
    } else if (toolId === 'chart') {
      el = { ...base, type: 'chart', width: 500, height: 300 };
    }

    if (el) { addElement(slide.id, el); selectElement(el.id); }
  };

  // Keyboard shortcuts
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
      if (key === 'g') setEditorState({ showGrid: !editor.showGrid });
      if ((e.ctrlKey || e.metaKey) && key === 'z') { if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && key === 'y') redo();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, presentation, editor.showGrid, undo, redo]);

  // Global paste to import image from clipboard
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

  const canUndo  = historyIndex > 0;
  const canRedo  = historyIndex < history.length - 1;
  const showGrid = editor.showGrid;

  return (
    <div className="shrink-0 flex items-center justify-center py-6 bg-transparent absolute top-6 left-0 right-0 z-50 pointer-events-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) addImageFromFile(file);
          e.target.value = '';
        }}
      />

      <div id="tour-toolbar" className="flex items-center gap-1 bg-white/70 backdrop-blur-[32px] border border-black/[0.03] rounded-[28px] px-3 py-2.5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] pointer-events-auto">
        {TOOLBAR_TOOLS.map((tool) => (
          <div key={tool.id} className="flex items-center">
            {tool.separator && <div className="w-[1px] h-6 bg-black/[0.06] mx-2" />}
            <button
              onClick={() => handleToolClick(tool.id)}
              title={tool.label}
              className={`w-10 h-10 flex items-center justify-center rounded-[16px] transition-all active:scale-[0.85] relative group ${
                editor.activeTool === tool.id 
                  ? 'text-primary bg-primary/[0.08]' 
                  : 'text-black/40 hover:text-primary hover:bg-primary/[0.06]'
              }`}
            >
              <tool.icon size={17} strokeWidth={1.5} />
              <span className="absolute -top-11 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 tracking-widest shadow-xl">
                {tool.label}
              </span>
            </button>
          </div>
        ))}

        <div className="w-[1px] h-6 bg-black/[0.06] mx-2" />

        {/* Drag & Drop upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload Image (drag & drop or click)"
          className="flex items-center gap-1.5 h-10 px-3 rounded-[16px] text-black/40 hover:text-primary hover:bg-primary/[0.06] transition-all active:scale-[0.85] relative group text-[11px] font-bold"
        >
          <Upload size={15} strokeWidth={1.5} />
          <span className="hidden sm:block">Upload</span>
        </button>

        <div className="w-[1px] h-6 bg-black/[0.06] mx-2" />

        <button
          onClick={() => setEditorState({ showGrid: !showGrid })}
          title="Grid (G)"
          className={`w-10 h-10 flex items-center justify-center rounded-[16px] transition-all active:scale-[0.85] ${
            showGrid ? 'text-primary bg-primary/[0.08]' : 'text-black/40 hover:text-primary hover:bg-primary/[0.06]'
          }`}
        >
          <Grid3X3 size={17} strokeWidth={1.5} />
        </button>

        <div className="w-[1px] h-6 bg-black/[0.06] mx-2" />

        <div className="flex items-center gap-0.5">
          <button onClick={undo} disabled={!canUndo} className="w-10 h-10 flex items-center justify-center rounded-[16px] text-black/40 hover:text-primary hover:bg-primary/[0.06] transition-all active:scale-[0.85] disabled:opacity-10">
            <Undo2 size={17} strokeWidth={1.5} />
          </button>
          <button onClick={redo} disabled={!canRedo} className="w-10 h-10 flex items-center justify-center rounded-[16px] text-black/40 hover:text-primary hover:bg-primary/[0.06] transition-all active:scale-[0.85] disabled:opacity-10">
            <Redo2 size={17} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
