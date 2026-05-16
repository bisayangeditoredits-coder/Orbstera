'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { usePresentationStore } from '@/store/usePresentationStore';
import { PlannerHeader } from './PlannerHeader';
import { PlannerChat } from './PlannerChat';
import { PlannerOutlinePanel } from './PlannerOutlinePanel';
import { PlannerComposer } from './PlannerComposer';
import { PlannerOnboarding } from './PlannerOnboarding';
import {
  type OutlineSlide,
  getMergedOutlineSlides,
  formatOutlineForContext,
  stripOutlineLinesForDisplay,
} from './planner-utils';
import { cn } from '@/lib/cn';

type Message = { role: string; content: string };
type MobileTab = 'chat' | 'outline';

export function PlannerShell() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topic = searchParams.get('topic')?.trim() || '';

  const setEditorState = usePresentationStore((s) => s.setEditorState);

  const [messages, setMessages] = useState<Message[]>([]);
  const [outlineSlides, setOutlineSlides] = useState<OutlineSlide[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<'free' | 'pro'>('free');
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  const initStartedRef = useRef(false);
  const prevSlideCountRef = useRef(0);

  const hasAssistantReply = messages.some((m) => m.role === 'assistant' && m.content.trim());
  const canGenerate = outlineSlides.length > 0;
  const stepIndex = !hasAssistantReply ? 0 : outlineSlides.length > 0 ? 2 : 1;

  // Sticky outline: merge across messages, never flash empty while loading
  useEffect(() => {
    const merged = getMergedOutlineSlides(messages);
    setOutlineSlides((prev) => {
      if (merged.length > 0) return merged;
      if (loading && prev.length > 0) return prev;
      return merged;
    });
  }, [messages, loading]);

  // Auto-switch mobile tab when first slide appears
  useEffect(() => {
    if (outlineSlides.length > 0 && prevSlideCountRef.current === 0) {
      setMobileTab('outline');
    }
    prevSlideCountRef.current = outlineSlides.length;
  }, [outlineSlides.length]);

  const streamResponse = useCallback(
    async (history: Message[], sId: string | null, topicLabel: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/planner/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, sessionId: sId, topic: topicLabel }),
        });

        const tier = res.headers.get('X-Planner-Plan');
        if (tier === 'pro' || tier === 'free') setPlanTier(tier);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errData.detail || errData.error || 'Chat API failed');
        }
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let pendingTokens = '';
        let flushRaf: number | null = null;

        const flushPendingTokens = () => {
          flushRaf = null;
          if (!pendingTokens) return;
          const chunk = pendingTokens;
          pendingTokens = '';
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            const last = next[lastIdx];
            if (last?.role === 'assistant') {
              next[lastIdx] = { ...last, content: last.content + chunk };
            }
            return next;
          });
        };

        const queueToken = (token: string) => {
          pendingTokens += token;
          if (flushRaf === null) {
            flushRaf = requestAnimationFrame(flushPendingTokens);
          }
        };

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const data = JSON.parse(line.slice(6));
              const token = data.choices?.[0]?.delta?.content || '';
              if (!token) continue;
              queueToken(token);
            } catch {
              /* ignore partial JSON */
            }
          }
        }

        // Flush remaining buffer
        if (sseBuffer.startsWith('data: ') && sseBuffer !== 'data: [DONE]') {
          try {
            const data = JSON.parse(sseBuffer.slice(6));
            const token = data.choices?.[0]?.delta?.content || '';
            if (token) queueToken(token);
          } catch {
            /* ignore */
          }
        }

        if (flushRaf !== null) {
          cancelAnimationFrame(flushRaf);
          flushRaf = null;
        }
        flushPendingTokens();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Please try again.';
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          const last = next[lastIdx];
          if (last?.role === 'assistant') {
            next[lastIdx] = {
              ...last,
              content: last.content.trim()
                ? `${last.content}\n\n(Sorry — connection interrupted: ${msg})`
                : `Sorry, something went wrong: ${msg}`,
            };
            return next;
          }
          return [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${msg}` }];
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!topic || initStartedRef.current) return;
    initStartedRef.current = true;

    const initChat = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let sid: string | null = null;
      if (user) {
        const { data: session } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id, title: topic.substring(0, 50) })
          .select('id')
          .single();
        if (session) sid = session.id;
      }
      setSessionId(sid);

      const firstMessage: Message = {
        role: 'user',
        content: `I want to create a presentation about: "${topic}". Please suggest a slide-by-slide outline.`,
      };

      setMessages([firstMessage]);
      await streamResponse([firstMessage], sid, topic);
    };

    void initChat();
  }, [topic, streamResponse]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const newMsg: Message = { role: 'user', content: trimmed };
      const newHistory = [...messages, newMsg];
      setMessages(newHistory);
      setInput('');
      await streamResponse(newHistory, sessionId, topic);
    },
    [loading, messages, sessionId, topic, streamResponse],
  );

  const handleSend = () => sendMessage(input);
  const handleQuickReply = (text: string) => sendMessage(text);

  const handleGenerate = () => {
    const chatContext = messages
      .map((m) => {
        const content =
          m.role === 'assistant' ? stripOutlineLinesForDisplay(m.content) : m.content;
        return `${m.role.toUpperCase()}: ${content}`;
      })
      .filter((block) => block.split(': ')[1]?.trim())
      .join('\n\n');

    const outlineBlock = formatOutlineForContext(outlineSlides);
    const fullContext = [chatContext, outlineBlock].filter(Boolean).join('\n\n');

    setEditorState({ copilotContext: fullContext });
    router.push('/editor?copilot_approved=true');
  };

  if (!topic) {
    return <PlannerOnboarding />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F0F7FF] font-sans text-slate-900 selection:bg-primary/10">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.1),transparent)]"
        aria-hidden
      />

      <PlannerHeader
        topic={topic}
        planTier={planTier}
        stepIndex={stepIndex}
        canGenerate={canGenerate}
        onGenerate={handleGenerate}
      />

      {/* Mobile tabs */}
      <div className="flex shrink-0 border-b border-white/50 bg-white/50 px-4 py-2 md:hidden">
        <div className="flex w-full rounded-xl bg-white/80 p-1 shadow-sm">
          {(['chat', 'outline'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-bold capitalize transition',
                mobileTab === tab ? 'bg-primary text-white shadow-sm' : 'text-slate-600',
              )}
            >
              {tab}
              {tab === 'outline' && outlineSlides.length > 0 && (
                <span className="ml-1 opacity-80">({outlineSlides.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Chat column — includes composer */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col border-r border-white/50 md:max-w-[48%] lg:max-w-[46%]',
            mobileTab !== 'chat' && 'hidden md:flex',
          )}
        >
          <PlannerChat messages={messages} loading={loading} topic={topic} />
          <PlannerComposer
            input={input}
            loading={loading}
            onInputChange={setInput}
            onSend={handleSend}
            onQuickReply={handleQuickReply}
          />
        </div>

        {/* Outline column */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-hidden md:min-w-[52%] lg:min-w-[54%]',
            mobileTab !== 'outline' && 'hidden md:block',
          )}
        >
          <PlannerOutlinePanel
            slides={outlineSlides}
            loading={loading}
            topic={topic}
          />
        </div>
      </div>
    </div>
  );
}
