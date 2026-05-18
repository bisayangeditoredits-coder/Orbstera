'use client';

import { Send, Loader2 } from 'lucide-react';

type PlannerComposerProps = {
  input: string;
  loading: boolean;
  hasAssistantReply: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onQuickReply: (text: string) => void;
};

export function PlannerComposer({
  input,
  loading,
  hasAssistantReply,
  onInputChange,
  onSend,
  onQuickReply,
}: PlannerComposerProps) {
  // ── Smart quick-reply chip groups ──────────────────────────────────────────
  // Before first AI reply: help the user shape their deck preferences
  // After reply: refine/adjust chips
  const preReplyChips = [
    { label: '6 slides', icon: '📄' },
    { label: '10 slides', icon: '📑' },
    { label: '15 slides', icon: '📋' },
    { label: 'Minimal & clean', icon: '✦' },
    { label: 'Bold & visual', icon: '🎨' },
    { label: 'Data-driven', icon: '📊' },
    { label: 'Investor pitch', icon: '💼' },
    { label: 'Educational', icon: '🎓' },
  ];

  const postReplyChips = [
    { label: 'Make it shorter', icon: '✂️' },
    { label: 'Add a data slide', icon: '📊' },
    { label: 'Stronger opening', icon: '🚀' },
    { label: 'Target investors', icon: '💼' },
    { label: 'More visual slides', icon: '🎨' },
    { label: 'Add case study', icon: '📌' },
  ];

  const chips = hasAssistantReply ? postReplyChips : preReplyChips;

  return (
    <div className="shrink-0 border-t border-white/50 bg-[#F0F7FF]/95 px-4 py-4 backdrop-blur-md sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* Smart chip hints */}
        {!hasAssistantReply && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Customize your deck →
          </p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map(({ label, icon }) => (
            <button
              key={label}
              type="button"
              disabled={loading}
              onClick={() => onQuickReply(label)}
              className="flex items-center gap-1.5 rounded-full border border-white/80 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Text input */}
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
              placeholder={hasAssistantReply ? 'Refine the outline… (e.g. add a slide about ROI)' : 'Describe your topic… (e.g. AI in healthcare for doctors)'}
              rows={1}
              className="w-full resize-none rounded-[18px] border-none bg-transparent py-3.5 pl-4 pr-14 text-[14px] font-medium text-textMain placeholder:text-textMuted focus:outline-none focus:ring-4 focus:ring-primary/10"
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
