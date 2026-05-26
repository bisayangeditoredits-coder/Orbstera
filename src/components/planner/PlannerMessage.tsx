'use client';

import { Loader2, Sparkles, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import { renderMarkdownLite } from './planner-utils';
import { useRef } from 'react';

type PlannerMessageProps = {
  role: string;
  content: string;
  isStreaming?: boolean;
  isLast?: boolean;
  onQuickReply?: (text: string) => void;
};

const PRESET_COLORS = [
  '#0f172a', // slate-900
  '#0009fa', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
];

export function PlannerMessage({ role, content, isStreaming, isLast, onQuickReply }: PlannerMessageProps) {
  const isUser = role === 'user';
  const wrapperClass = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const colorInputRef = useRef<HTMLInputElement>(null);

  const asksForColor = !isUser && !isStreaming && isLast && (content.toLowerCase().includes('color') || content.toLowerCase().includes('hex'));

  const bubble = (
    <div className="flex flex-col gap-2 max-w-[92%] sm:max-w-[85%]">
      <div
        className={`${
          isUser
            ? 'rounded-2xl rounded-br-md bg-slate-900 px-5 py-4 text-white shadow-md shadow-slate-900/15 self-end'
            : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white px-5 py-4 shadow-sm self-start break-words overflow-x-auto max-w-full'
        } ${isStreaming && !isUser ? 'transition-[min-height] duration-150 ease-out' : ''}`}
      >
        {!isUser && (
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
            <Sparkles size={12} strokeWidth={1.75} />
            Copilot
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{content}</p>
        ) : content ? (
          <div className="planner-markdown planner-markdown-stream">
            {renderMarkdownLite(content)}
            {isStreaming && (
              <span
                className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-px rounded-full bg-slate-500 align-middle motion-safe:animate-pulse"
                aria-hidden
              />
            )}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin text-primary" />
            Thinking…
          </div>
        ) : null}
      </div>

      {asksForColor && onQuickReply && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 mt-1 px-1 self-start flex-wrap"
        >
          {PRESET_COLORS.map((hex) => (
            <button
              key={hex}
              onClick={() => onQuickReply(hex)}
              className="w-8 h-8 rounded-full border border-slate-200/50 shadow-sm transition hover:scale-110 active:scale-95"
              style={{ backgroundColor: hex }}
              title={`Use ${hex}`}
              aria-label={`Select color ${hex}`}
            />
          ))}
          
          <div className="relative group ml-1">
            <button
              onClick={() => colorInputRef.current?.click()}
              className="flex w-8 h-8 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition group-hover:border-slate-400 group-hover:text-slate-600"
              title="Custom color"
            >
              <Palette size={14} />
            </button>
            <input
              ref={colorInputRef}
              type="color"
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              onChange={(e) => {
                if (e.target.value) onQuickReply(e.target.value);
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );

  if (isStreaming) {
    return <div className={wrapperClass}>{bubble}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const }}
      className={wrapperClass}
    >
      {bubble}
    </motion.div>
  );
}
