'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';

export function PlannerOnboarding() {
  const router = useRouter();
  const [topic, setTopic] = useState('');

  const start = () => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    router.push(`/planner?topic=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F0F7FF] px-6">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/70 bg-white p-8 shadow-xl sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles size={28} strokeWidth={1.75} />
        </div>
        <h1 className="mt-6 text-center font-space-grotesk text-2xl font-bold text-slate-900 sm:text-3xl">
          What&apos;s your presentation about?
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
          Copilot will plan a slide-by-slide outline with you before generating your deck.
        </p>
        <div className="mt-8 animated-border shadow-[0_24px_48px_-20px_rgba(59,130,246,0.22)]">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                start();
              }
            }}
            placeholder="E.g. Pitch deck for a sustainable fashion startup…"
            rows={3}
            className="w-full resize-none border-none bg-transparent px-4 py-3.5 text-[14px] text-textMain placeholder:text-textMuted focus:outline-none focus:ring-4 focus:ring-primary/10 rounded-[18px]"
          />
        </div>
        <button
          type="button"
          onClick={start}
          disabled={!topic.trim()}
          className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primaryHover disabled:opacity-50"
        >
          Start planning
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
