'use client';

import { usePresentationStore } from '@/store/usePresentationStore';
import { Triangle, X, Shapes } from 'lucide-react';
import type { ShapeStyle } from '@/types';

type ShapeDef = {
  name: string;
  path: string;
  nativeType?: 'rect' | 'circle' | 'triangle' | 'star';
};

// Paths are designed for a 100x100 viewBox.
const SHAPES_LIBRARY: { category: string; shapes: ShapeDef[] }[] = [
  {
    category: 'Basic Shapes',
    shapes: [
      { name: 'Rectangle', path: 'M0 0 L100 0 L100 100 L0 100 Z', nativeType: 'rect' as const },
      { name: 'Circle', path: 'M50,0 A50,50 0 1,1 50,100 A50,50 0 1,1 50,0 Z', nativeType: 'circle' as const },
      { name: 'Triangle', path: 'M50 0 L100 100 L0 100 Z', nativeType: 'triangle' as const },
      { name: 'Star', path: 'M50,5 L61,35 L95,35 L68,57 L79,91 L50,70 L21,91 L32,57 L5,35 L39,35 Z', nativeType: 'star' as const },
    ]
  },
  {
    category: 'Polygons',
    shapes: [
      { name: 'Diamond', path: 'M50 0 L100 50 L50 100 L0 50 Z' },
      { name: 'Parallelogram', path: 'M25 0 L100 0 L75 100 L0 100 Z' },
      { name: 'Trapezoid', path: 'M20 0 L80 0 L100 100 L0 100 Z' },
      { name: 'Pentagon', path: 'M50 0 L100 38 L81 100 L19 100 L0 38 Z' },
      { name: 'Hexagon', path: 'M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z' },
      { name: 'Octagon', path: 'M30 0 L70 0 L100 30 L100 70 L70 100 L30 100 L0 70 L0 30 Z' },
    ]
  },
  {
    category: 'Symbols',
    shapes: [
      { name: 'Heart', path: 'M50,90 C50,90 10,60 10,35 C10,15 35,15 50,35 C65,15 90,15 90,35 C90,60 50,90 50,90 Z' },
      { name: 'Cross', path: 'M35 0 L65 0 L65 35 L100 35 L100 65 L65 65 L65 100 L35 100 L35 65 L0 65 L0 35 L35 35 Z' },
      { name: 'Shield', path: 'M10 0 L90 0 L90 40 C90 75 50 100 50 100 C50 100 10 75 10 40 Z' },
      { name: 'Chevron', path: 'M0 0 L50 50 L0 100 L30 100 L80 50 L30 0 Z' },
      { name: 'Ribbon', path: 'M0 20 L100 20 L100 80 L50 60 L0 80 Z' },
      { name: 'Ticket', path: 'M0 0 L100 0 L100 100 L0 100 Z M 0 30 A 20 20 0 0 1 0 70 Z M 100 30 A 20 20 0 0 0 100 70 Z' },
    ]
  },
  {
    category: 'Speech Bubbles',
    shapes: [
      { name: 'Oval Callout', path: 'M50 10 C20 10 0 25 0 50 C0 65 10 78 25 85 L20 100 L40 90 C43 90 47 90 50 90 C80 90 100 75 100 50 C100 25 80 10 50 10 Z' },
      { name: 'Rect Callout', path: 'M10 10 L90 10 L90 70 L50 70 L20 100 L30 70 L10 70 Z' },
      { name: 'Cloud', path: 'M70 75 L30 75 C15 75 10 65 10 55 C10 45 20 40 25 40 C25 25 40 15 55 20 C70 15 85 25 85 40 C95 40 95 55 85 65 C85 70 80 75 70 75 Z' },
    ]
  }
];

export function ShapesPanel({ onClose }: { onClose?: () => void }) {
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const handleAddShape = (pathData: string, shapeName: string, nativeType?: 'rect' | 'circle' | 'triangle' | 'star') => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'shape',
      shapeType: nativeType || 'path',
      content: nativeType ? undefined : pathData, // Store the SVG path data only if it's a custom path
      x: 540,
      y: 260,
      width: 200,
      height: 200,
      shapeStyle: {
        fill: '#38BDF8', // Default blue color
        stroke: 'transparent',
        strokeWidth: 0,
        cornerRadius: nativeType === 'rect' ? 8 : 0, // slight rounding for standard rects
      },
      zIndex: 100,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
              <Shapes size={16} className="text-pink-500" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-neutral-900 leading-tight">Advanced Shapes</h2>
              <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Fully customizable SVG paths</p>
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {SHAPES_LIBRARY.map((cat) => (
          <div key={cat.category} className="mb-6">
            <h3 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3 px-1">
              {cat.category}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {cat.shapes.map((shape) => (
                <button
                  key={shape.name}
                  onClick={() => handleAddShape(shape.path, shape.name, shape.nativeType)}
                  className="group flex flex-col items-center justify-center gap-2 p-3 bg-white rounded-xl border border-neutral-200/60 hover:border-pink-300 hover:shadow-md hover:bg-pink-50/30 transition-all"
                  title={shape.name}
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm group-hover:scale-110 transition-transform">
                      <path d={shape.path} fill="#38BDF8" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-500 group-hover:text-pink-600">
                    {shape.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-2 p-4 rounded-xl bg-neutral-100 border border-neutral-200/60">
          <p className="text-[11px] text-neutral-500 leading-relaxed text-center">
            Click any shape to add it to your slide. You can then change its color, outline, and shadow using the <strong>Properties Panel</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
