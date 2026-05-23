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
} from './planner-utils';
import { cn } from '@/lib/cn';

type Message = { role: string; content: string };
type MobileTab = 'chat' | 'outline';

export function PlannerShell() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topic = searchParams.get('topic')?.trim() || '';
  const sessionIdParam = searchParams.get('sessionId')?.trim() || null;

  const setEditorState = usePresentationStore((s) => s.setEditorState);

  const [messages, setMessages] = useState<Message[]>([]);
  const [outlineSlides, setOutlineSlides] = useState<OutlineSlide[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<'free' | 'pro'>('free');
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  const [slideNotes, setSlideNotes] = useState<Record<number, string>>({});

  const initStartedRef = useRef(false);
  const prevSlideCountRef = useRef(0);

  const hasAssistantReply = messages.some((m) => m.role === 'assistant' && m.content.trim());
  const canGenerate = outlineSlides.length > 0 || (hasAssistantReply && !loading);
  const stepIndex = !hasAssistantReply ? 0 : outlineSlides.length > 0 ? 2 : 1;
  const showMobileOutlineBanner =
    outlineSlides.length > 0 && mobileTab === 'chat';

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

        if (res.status === 401) {
          window.location.href = '/login?next=/planner';
          return;
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
          if (res.status === 402) {
            throw new Error(
              errData.message || 'Not enough credits. Open your dashboard to upgrade or wait for reset.',
            );
          }
          throw new Error(errData.detail || errData.message || errData.error || 'Chat API failed');
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
        if (sessionIdParam) {
          // Attempt to resume existing session
          const { data: existingMessages } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sessionIdParam)
            .order('created_at', { ascending: true });

          if (existingMessages && existingMessages.length > 0) {
            setSessionId(sessionIdParam);
            setMessages(existingMessages as Message[]);
            return; // Exit early, no need to send initial prompt
          }
        }

        // Otherwise create new session
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
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .filter((block) => block.split(': ')[1]?.trim())
      .join('\n\n');

    // Add notes to the slides outline block
    const annotatedSlides = outlineSlides.map((s) => ({
      ...s,
      description: slideNotes[s.number]
        ? `${s.description ? s.description + ' | ' : ''}User Notes: ${slideNotes[s.number]}`
        : s.description,
    }));
    
    const outlineBlock = formatOutlineForContext(annotatedSlides);
    const fullContext = [chatContext, outlineBlock].filter(Boolean).join('\n\n');

    setEditorState({
      copilotContext: fullContext,
      plannerHandoff: {
        topic,
        sessionId,
        outlineSlideCount: outlineSlides.length > 0 ? outlineSlides.length : undefined,
      },
    });
    router.push('/editor?copilot_approved=true');
  };

  if (!topic) {
    return <PlannerOnboarding />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 selection:bg-primary/10">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(15,23,42,0.08),transparent)]"
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
      <div className="flex shrink-0 border-b border-slate-200 bg-white px-4 py-2 md:hidden">
        <div className="flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
          {(['chat', 'outline'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={cn(
                'flex-1 rounded-lg py-2 text-xs font-bold capitalize transition',
                mobileTab === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600',
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

      <div className="relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-0 md:flex-row">
        {/* Chat column — includes composer */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col border-r border-slate-200 bg-white md:max-w-[48%] lg:max-w-[46%]',
            mobileTab !== 'chat' && 'hidden md:flex',
          )}
        >
          <PlannerChat messages={messages} loading={loading} topic={topic} onQuickReply={handleQuickReply} />

          {showMobileOutlineBanner && (
            <button
              type="button"
              onClick={() => setMobileTab('outline')}
              className="mx-4 mb-2 flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-xs font-bold text-slate-700 md:hidden"
            >
              {outlineSlides.length} slide{outlineSlides.length === 1 ? '' : 's'} ready - View
              outline
            </button>
          )}

          <PlannerComposer
            input={input}
            loading={loading}
            hasAssistantReply={hasAssistantReply}
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
            canGenerate={canGenerate}
            slideNotes={slideNotes}
            onGenerate={handleGenerate}
            onReorder={setOutlineSlides}
            onUpdateSlideNotes={(num, notes) => setSlideNotes((p) => ({ ...p, [num]: notes }))}
          />
        </div>
      </div>
    </div>
  );
}
