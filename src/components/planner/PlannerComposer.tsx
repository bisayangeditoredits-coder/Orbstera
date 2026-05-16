'use client';

import { Send, Loader2 } from 'lucide-react';
import { QUICK_REPLIES } from './planner-utils';

type PlannerComposerProps = {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onQuickReply: (text: string) => void;
};

export function PlannerComposer({
  input,
  loading,
  onInputChange,
  onSend,
  onQuickReply,
}: PlannerComposerProps) {
  return (
    <div className="shrink-0 border-t border-white/50 bg-[#F0F7FF]/95 px-4 py-4 backdrop-blur-md sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_REPLIES.map((label) => (
            <button
              key={label}
              type="button"
              disabled={loading}
              onClick={() => onQuickReply(label)}
              className="rounded-full border border-white/80 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="animated-border shadow-[0_24px_48px_-20px_rgba(59,130,246,0.22)]">
          <div className="relative rounded-[20px] bg-white p-1">
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="E.g. Add a slide for market research…"
              rows={1}
              className="w-full resize-none border-none bg-transparent py-3.5 pl-4 pr-14 text-[14px] font-medium text-textMain placeholder:text-textMuted focus:outline-none focus:ring-4 focus:ring-primary/10 rounded-[18px]"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/25 transition hover:bg-primaryHover disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} className="ml-0.5" />
              )}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] font-medium tracking-wide text-slate-400">
          Orbstera AI can make mistakes. Review the outline before generating.
        </p>
      </div>
    </div>
  );
}
