'use client';

import { 
  Send, Loader2, FileText, Copy, Layers, Sparkles, 
  Palette, BarChart3, Briefcase, GraduationCap, 
  Scissors, Rocket, Pin 
} from 'lucide-react';

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
    { label: '6 slides', icon: FileText },
    { label: '10 slides', icon: Copy },
    { label: '15 slides', icon: Layers },
    { label: 'Minimal & clean', icon: Sparkles },
    { label: 'Bold & visual', icon: Palette },
    { label: 'Data-driven', icon: BarChart3 },
    { label: 'Investor pitch', icon: Briefcase },
    { label: 'Educational', icon: GraduationCap },
  ];

  const postReplyChips = [
    { label: 'Make it shorter', icon: Scissors },
    { label: 'Add a data slide', icon: BarChart3 },
    { label: 'Stronger opening', icon: Rocket },
    { label: 'Target investors', icon: Briefcase },
    { label: 'More visual slides', icon: Palette },
    { label: 'Add case study', icon: Pin },
  ];

  const chips = hasAssistantReply ? postReplyChips : preReplyChips;

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* Smart chip hints */}
        {!hasAssistantReply && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Customize your deck
          </p>
        )}
        <div className="-mx-4 sm:-mx-6 mb-3 flex overflow-x-auto gap-2 px-4 sm:px-6 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {chips.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              disabled={loading}
              onClick={() => onQuickReply(label)}
              className="group flex whitespace-nowrap shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 disabled:opacity-50"
            >
              <Icon size={14} className="text-slate-500 transition-colors group-hover:text-slate-800" />
              {label}
            </button>
          ))}
          {/* Spacer for proper right-edge scrolling */}
          <div className="w-1 shrink-0" aria-hidden="true" />
        </div>

        {/* Text input */}
        <div className="rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_16px_32px_-20px_rgba(15,23,42,0.35)]">
          <div className="relative rounded-[14px] bg-white p-1">
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder={
                hasAssistantReply
                  ? 'Refine the outline (e.g. add a slide about ROI)'
                  : 'Describe your topic (e.g. AI in healthcare for doctors)'
              }
              rows={1}
              className="w-full resize-none rounded-xl border-none bg-transparent py-3.5 pl-4 pr-14 text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/25 transition hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
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
