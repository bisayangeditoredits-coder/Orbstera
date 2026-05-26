'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { PlannerMessage } from './PlannerMessage';

type Message = { role: string; content: string };

type PlannerChatProps = {
  messages: Message[];
  loading: boolean;
  topic: string;
  onQuickReply?: (text: string) => void;
};

const NEAR_BOTTOM_THRESHOLD = 96;

export function PlannerChat({ messages, loading, topic, onQuickReply }: PlannerChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);

  const updateStickToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    },
    [],
  );

  const scheduleScrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      if (!stickToBottomRef.current) return;
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        scrollToBottom(behavior);
      });
    },
    [scrollToBottom],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateStickToBottom, { passive: true });
    return () => el.removeEventListener('scroll', updateStickToBottom);
  }, [updateStickToBottom]);

  useEffect(() => {
    scheduleScrollToBottom(loading ? 'auto' : 'smooth');
  }, [messages, loading, scheduleScrollToBottom]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  if (messages.length === 0 && !loading) {
    return (
      <div className="custom-scrollbar flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-700">
          <Sparkles size={28} strokeWidth={1.75} />
        </div>
        <h2 className="mt-6 font-space-grotesk text-xl font-bold text-slate-900">
          Refine your story
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
          {topic
            ? `Planning "${topic}". Copilot will propose a slide outline—you can adjust it in the chat.`
            : 'Ask Copilot to plan your deck, then generate when the outline looks right.'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      data-lenis-prevent
      className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-white px-4 py-6 [-webkit-overflow-scrolling:touch] sm:px-6"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const isStreaming = loading && isLast && msg.role === 'assistant';
          return (
            <PlannerMessage
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={isStreaming}
              isLast={isLast}
              onQuickReply={onQuickReply}
            />
          );
        })}
        <div ref={endRef} className="h-1" aria-hidden />
      </div>
    </div>
  );
}
