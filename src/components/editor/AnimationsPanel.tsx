'use client';

import { usePresentationStore } from '@/store/usePresentationStore';
import { PPT_STYLE_ENTRANCE_OPTIONS, PPT_ANIMATION_HINT } from '@/lib/editor/pptAnimationCatalog';
import { MousePointer2, Play, Info } from 'lucide-react';
import type { AnimationEntrance } from '@/types';

export function AnimationsPanel() {
  const store = usePresentationStore();
  const currentSlide = store.presentation?.slides[store.currentSlideIndex];
  const selectedId = store.editor.selectedElementId;
  const selectedEl = currentSlide?.elements?.find((el) => el.id === selectedId);

  const upd = (updates: any) => {
    if (!currentSlide || !selectedId) return;
    const existingAnim = selectedEl?.animation || {};
    store.updateElement(currentSlide.id, selectedId, {
      animation: { ...existingAnim, ...updates }
    });
  };

  if (!selectedEl) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-neutral-400">
        <MousePointer2 className="mb-4 h-10 w-10 opacity-20" />
        <p className="text-sm font-medium">No element selected</p>
        <p className="mt-1 text-xs opacity-70">Click an image, shape, or text to add motion</p>
      </div>
    );
  }

  const anim = (selectedEl.animation || {}) as Partial<import('@/types').AnimationConfig>;
  const currentEntrance = anim.entrance || 'none';
  const duration = anim.duration ?? 800;
  const delay = anim.delay ?? 0;

  return (
    <div className="flex h-full flex-col bg-neutral-50/50">
      <div className="shrink-0 p-4 pb-0">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-800">
          Motion & Animation
        </h2>
        <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed">
          Bring your presentation to life with cinematic entrances.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Entrance Effect
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PPT_STYLE_ENTRANCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => upd({ entrance: opt.value })}
                className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all ${
                  currentEntrance === opt.value
                    ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-sm'
                    : 'border-neutral-200/80 bg-white hover:border-indigo-300 hover:bg-neutral-50'
                }`}
              >
                <span className={`text-xs font-semibold ${currentEntrance === opt.value ? 'text-indigo-700' : 'text-neutral-700'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {currentEntrance !== 'none' && (
          <div className="space-y-5 rounded-xl border border-neutral-100/80 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Duration
                </label>
                <span className="text-xs font-medium text-neutral-600">{(duration / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="100" max="3000" step="100"
                value={duration}
                onChange={(e) => upd({ duration: parseInt(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Delay
                </label>
                <span className="text-xs font-medium text-neutral-600">{(delay / 1000).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0" max="5000" step="100"
                value={delay}
                onChange={(e) => upd({ delay: parseInt(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}

        <div className="rounded-lg bg-blue-50/50 p-3 flex gap-2 items-start border border-blue-100/50">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            {PPT_ANIMATION_HINT}
          </p>
        </div>
      </div>
    </div>
  );
}
