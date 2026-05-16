'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { renderMarkdownLite, stripOutlineLinesForDisplay } from './planner-utils';

type PlannerMessageProps = {
  role: string;
  content: string;
  isStreaming?: boolean;
};

export function PlannerMessage({ role, content, isStreaming }: PlannerMessageProps) {
  const isUser = role === 'user';
  const displayContent = isUser ? content : stripOutlineLinesForDisplay(content);

  const Wrapper = isStreaming ? 'div' : motion.div;
  const wrapperProps = isStreaming
    ? { className: `flex ${isUser ? 'justify-end' : 'justify-start'}` }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
        className: `flex ${isUser ? 'justify-end' : 'justify-start'}`,
      };

  return (
    <Wrapper {...wrapperProps}>
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
          <p className="text-[14px] leading-relaxed">{content}</p>
        ) : displayContent ? (
          <div className="planner-markdown planner-markdown-stream">
            {renderMarkdownLite(displayContent)}
          </div>
        ) : content && isStreaming ? (
          <p className="text-[14px] leading-relaxed text-slate-500 italic">
            Building your slide outline…
          </p>
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin text-primary" />
            Thinking…
          </div>
        ) : null}

        {!isUser && isStreaming && (displayContent || content) && (
          <span
            className="mt-2 inline-block h-4 w-0.5 rounded-full bg-primary motion-safe:animate-pulse"
            aria-hidden
          />
        )}
      </div>
    </Wrapper>
  );
}
