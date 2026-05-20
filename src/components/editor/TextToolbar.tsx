import React from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import { useShallow } from 'zustand/react/shallow';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Maximize2, MoveVertical, Square } from 'lucide-react';

export function TextToolbar() {
  const { presentation, currentSlideIndex, editor, updateElement } = usePresentationStore(
    useShallow((s) => ({
      presentation: s.presentation,
      currentSlideIndex: s.currentSlideIndex,
      editor: s.editor,
      updateElement: s.updateElement,
    }))
  );

  const slide = presentation?.slides[currentSlideIndex];
  const selectedId = editor.selectedElementId;
  const selectedEl = slide?.elements?.find((el) => el.id === selectedId);

  if (!selectedEl || selectedEl.type !== 'text') return null;

  const mode = selectedEl.textResizeMode || 'autoWidth';
  const textStyle = selectedEl.textStyle || {};
  const isBold = textStyle.fontWeight === 'bold';
  const isItalic = textStyle.fontStyle === 'italic';

  const updateResizeMode = (newMode: 'autoWidth' | 'autoHeight' | 'fixed') => {
    updateElement(slide!.id, selectedEl.id, { textResizeMode: newMode }, true);
  };

  const toggleBold = () => {
    updateElement(slide!.id, selectedEl.id, { 
      textStyle: { ...textStyle, fontWeight: isBold ? 'normal' : 'bold' } 
    }, true);
  };

  const toggleItalic = () => {
    updateElement(slide!.id, selectedEl.id, { 
      textStyle: { ...textStyle, fontStyle: isItalic ? 'normal' : 'italic' } 
    }, true);
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    updateElement(slide!.id, selectedEl.id, { 
      textStyle: { ...textStyle, textAlign: align } 
    }, true);
  };

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-xl border border-black/10 rounded-2xl px-3 py-2 shadow-lg pointer-events-auto">
      <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl">
        <button
          onClick={() => updateResizeMode('autoWidth')}
          title="Auto Width"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'autoWidth' ? 'bg-white text-primary shadow-sm' : 'text-black/60 hover:text-black hover:bg-black/5'
          }`}
        >
          <Type size={14} />
          Auto Width
        </button>
        <button
          onClick={() => updateResizeMode('autoHeight')}
          title="Auto Height"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'autoHeight' ? 'bg-white text-primary shadow-sm' : 'text-black/60 hover:text-black hover:bg-black/5'
          }`}
        >
          <MoveVertical size={14} />
          Auto Height
        </button>
        <button
          onClick={() => updateResizeMode('fixed')}
          title="Fixed Size"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'fixed' ? 'bg-white text-primary shadow-sm' : 'text-black/60 hover:text-black hover:bg-black/5'
          }`}
        >
          <Square size={14} />
          Fixed
        </button>
      </div>

      <div className="w-[1px] h-6 bg-black/10 mx-1" />

      <div className="flex items-center gap-1">
        <button onClick={toggleBold} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isBold ? 'bg-black/10 text-black' : 'text-black/60 hover:bg-black/5'}`}>
          <Bold size={15} />
        </button>
        <button onClick={toggleItalic} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isItalic ? 'bg-black/10 text-black' : 'text-black/60 hover:bg-black/5'}`}>
          <Italic size={15} />
        </button>
      </div>

      <div className="w-[1px] h-6 bg-black/10 mx-1" />

      <div className="flex items-center gap-1">
        <button onClick={() => setAlign('left')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${textStyle.textAlign === 'left' || !textStyle.textAlign ? 'bg-black/10 text-black' : 'text-black/60 hover:bg-black/5'}`}>
          <AlignLeft size={15} />
        </button>
        <button onClick={() => setAlign('center')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${textStyle.textAlign === 'center' ? 'bg-black/10 text-black' : 'text-black/60 hover:bg-black/5'}`}>
          <AlignCenter size={15} />
        </button>
        <button onClick={() => setAlign('right')} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${textStyle.textAlign === 'right' ? 'bg-black/10 text-black' : 'text-black/60 hover:bg-black/5'}`}>
          <AlignRight size={15} />
        </button>
      </div>
    </div>
  );
}
