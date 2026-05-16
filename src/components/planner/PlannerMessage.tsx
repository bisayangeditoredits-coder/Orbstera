'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { renderMarkdownLite } from './planner-utils';

type PlannerMessageProps = {
  role: string;
  content: string;
  isStreaming?: boolean;
};

export function PlannerMessage({ role, content, isStreaming }: PlannerMessageProps) {
  const isUser = role === 'user';
  const wrapperClass = `flex ${isUser ? 'justify-end' : 'justify-start'}`;

  const bubble = (
    <div
      className={`max-w-[92%] sm:max-w-[85%] ${
        isUser
          ? 'rounded-2xl rounded-br-md bg-neutral-950 px-5 py-4 text-white shadow-md shadow-neutral-950/10'
          : 'rounded-2xl rounded-bl-md border border-white/80 bg-white px-5 py-4 shadow-sm'
      } ${isStreaming && !isUser ? 'transition-[min-height] duration-150 ease-out' : ''}`}
    >
      {!isUser && (
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
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
              className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-px rounded-full bg-primary align-middle motion-safe:animate-pulse"
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
