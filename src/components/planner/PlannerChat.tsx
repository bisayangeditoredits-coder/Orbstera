'use client';

import { Send, Wand2, Scissors, BarChart, Zap, Users, Image as ImageIcon, Briefcase } from 'lucide-react';
import { useState } from 'react';

const SUGGESTIONS = [
  { label: 'Make it shorter', icon: Scissors },
  { label: 'Add a data slide', icon: BarChart },
  { label: 'Stronger opening', icon: Zap },
  { label: 'Target investors', icon: Users },
  { label: 'More visual slides', icon: ImageIcon },
  { label: 'Add case study', icon: Briefcase },
];

export function PlannerChat() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="flex h-full w-full flex-col bg-[#F3F7FA]">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* User Message */}
          <div className="ml-auto w-[85%] rounded-2xl rounded-tr-sm bg-neutral-950 px-6 py-4 text-white shadow-sm">
            <p className="text-[14px] leading-relaxed">
              I want to create a presentation about:{' '}
              <span className="font-semibold text-white/90">
                *please create a ppt presentation about graphic design please*
              </span>
              . Please suggest a slide-by-slide outline.
            </p>
          </div>

          {/* Copilot Message */}
          <div className="mr-auto flex w-[85%] gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-black/5">
              <Wand2 size={16} className="text-primary" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white border border-black/[0.04] px-5 py-4 shadow-sm">
              <p className="text-[13px] font-semibold tracking-wide text-primary mb-2 uppercase">
                Copilot
              </p>
              <p className="text-[14px] text-neutral-600 leading-relaxed">
                Sorry, something went wrong: Not enough credits for planner messages.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <div className="mx-auto max-w-2xl">
          {/* Suggestions */}
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 shadow-sm"
              >
                <s.icon size={13} className="text-neutral-400" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="relative">
            <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 opacity-60 blur-sm" />
            <div className="relative flex min-h-[56px] items-center rounded-2xl border border-primary/20 bg-white px-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Refine the outline... (e.g. add a slide about ROI)"
                className="flex-1 bg-transparent text-[14px] text-neutral-800 placeholder:text-neutral-400 outline-none"
              />
              <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100/80 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600">
                <Send size={16} className="-ml-0.5" />
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-neutral-400">
            Orbstera AI can make mistakes. Review the outline before generating.
          </p>
        </div>
      </div>
    </div>
  );
}
