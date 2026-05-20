'use client';

import { ListTree, Sparkles, ArrowRight } from 'lucide-react';

export function PlannerOutline() {
  return (
    <div className="relative flex h-full w-full flex-col bg-white">
      {/* Dotted Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-6">
          <div className="flex items-center gap-2 text-neutral-900">
            <ListTree size={18} className="text-primary" />
            <h2 className="text-[15px] font-bold">Live outline</h2>
          </div>
          <p className="mt-1 text-[13px] text-neutral-400">
            please create a ppt presentation about graphic design please
          </p>
        </div>

        {/* Empty State Center */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center pb-24">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50/50 text-primary">
            <Sparkles size={28} strokeWidth={1.5} />
          </div>
          <h3 className="mb-3 text-[18px] font-bold text-neutral-900">
            Outline builds here
          </h3>
          <p className="mb-10 max-w-sm text-[13px] leading-relaxed text-neutral-500">
            As Copilot plans your deck, each slide appears as a card you can review before generating.
          </p>

          <div className="flex flex-col items-start gap-4 text-left">
            {[
              'Describe your topic in chat',
              'Review slides as they appear',
              'Click Generate deck when ready',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50/50 text-[11px] font-bold text-primary">
                  {i + 1}
                </div>
                <span className="text-[13px] text-neutral-400">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Sticky Action */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-12 pb-6 px-8">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-[14px] font-bold text-white shadow-[0_8px_16px_-4px_rgba(59,130,246,0.3)] transition-all hover:bg-primaryHover active:scale-[0.99]">
            <Sparkles size={16} />
            <span>Generate deck</span>
            <ArrowRight size={16} className="ml-1 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
}
