'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePresentationStore } from '@/store/usePresentationStore';
import { Send, Loader2, Sparkles, CheckCircle2, ArrowRight, Crown, Zap } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';

function PlannerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTopic = searchParams.get('topic') || '';
  
  const setEditorState = usePresentationStore((s) => s.setEditorState);
  
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [planTier, setPlanTier] = useState<'free' | 'pro'>('free');
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Initialize session and send first message automatically
  useEffect(() => {
    if (!initialTopic) return;
    
    const initChat = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { user } } = await supabase.auth.getUser();
      let sid = null;
      if (user) {
        const { data: session } = await supabase.from('chat_sessions').insert({
          user_id: user.id,
          title: initialTopic.substring(0, 50)
        }).select('id').single();
        if (session) sid = session.id;
      }
      setSessionId(sid);
      
      const firstMessage = {
        role: 'user', 
        content: `I want to create a presentation about: "${initialTopic}". Please suggest a slide-by-slide outline.`
      };
      
      setMessages([firstMessage]);
      await streamResponse([firstMessage], sid);
    };
    
    initChat();
  }, [initialTopic]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const streamResponse = async (history: {role: string, content: string}[], sId: string | null) => {
    setLoading(true);
    try {
      const res = await fetch('/api/planner/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, sessionId: sId, topic: initialTopic }),
      });
      // Read the tier badge from the response header
      const tier = res.headers.get('X-Planner-Plan');
      if (tier === 'pro' || tier === 'free') setPlanTier(tier);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.detail || errData.error || 'Chat API failed');
      }
      if (!res.body) throw new Error('No body');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const token = data.choices[0]?.delta?.content || '';
              
              setMessages(prev => {
                const newMessages = [...prev];
                const last = newMessages[newMessages.length - 1];
                last.content += token;
                return newMessages;
              });
            } catch (e) {}
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${e.message || 'Please try again.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const newMsg = { role: 'user', content: input.trim() };
    const newHistory = [...messages, newMsg];
    setMessages(newHistory);
    setInput('');
    await streamResponse(newHistory, sessionId);
  };

  const handleApprove = () => {
    const chatContext = messages.map(m => m.role.toUpperCase() + ': ' + m.content).join('\n\n');
    setEditorState({ 
      copilotContext: chatContext,
    });
    router.push('/editor?copilot_approved=true');
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-sky-100">
      <header className="flex-none h-16 bg-white/80 backdrop-blur-xl border-b border-black/[0.04] px-6 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.02)] z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-[15px] tracking-tight">Orbstera Copilot</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-slate-500 font-medium">AI Presentation Strategist</p>
              {planTier === 'pro' ? (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  <Crown size={8} /> PRO AI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                  <Zap size={8} /> FREE AI
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleApprove}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-full text-[13px] font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          Skip & Generate
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-8 pb-24">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isLastAssistantMsg = i === messages.length - 1 && msg.role === 'assistant';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-[24px] p-5 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-br-[8px] shadow-slate-900/10' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-[8px]'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3 text-sky-600 font-semibold text-[11px] uppercase tracking-widest">
                        <Sparkles size={12} /> Copilot
                      </div>
                    )}
                    <div className="text-[14px] whitespace-pre-wrap leading-relaxed">
                      {msg.content || (msg.role === 'assistant' && loading && i === messages.length - 1 ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 size={16} className="animate-spin" /> Thinking...
                        </div>
                      ) : '')}
                    </div>

                    {/* INLINE GENERATE BUTTON FOR THE LAST AI MESSAGE */}
                    {isLastAssistantMsg && !loading && (
                      <motion.div 
                        initial={{ opacity: 0, marginTop: 0 }}
                        animate={{ opacity: 1, marginTop: 24 }}
                        transition={{ delay: 0.5 }}
                        className="pt-4 border-t border-slate-100"
                      >
                        <button
                          onClick={handleApprove}
                          className="w-full group relative flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-6 py-3.5 rounded-xl text-[14px] font-bold transition-all shadow-[0_8px_20px_rgba(56,189,248,0.25)] hover:shadow-[0_12px_28px_rgba(56,189,248,0.35)] overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                          <CheckCircle2 size={18} />
                          Generate Presentation with this Outline
                          <ArrowRight size={16} className="ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      <div className="flex-none p-4 sm:p-6 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent sticky bottom-0">
        <div className="max-w-3xl mx-auto relative shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[20px] bg-white border border-slate-200 p-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="E.g. Add a slide for Market Research..."
            className="w-full bg-transparent border-none py-4 pl-5 pr-16 text-[14px] font-medium text-slate-700 placeholder:text-slate-400 focus:ring-0 resize-none h-14"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 w-10 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-[14px] flex items-center justify-center transition-all shadow-sm"
          >
            {loading ? <Loader2 size={16} className="animate-spin text-slate-400" /> : <Send size={16} className="ml-0.5" />}
          </button>
        </div>
        <div className="text-center mt-3">
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">Orbstera AI can make mistakes. Review the outline before generating.</span>
        </div>
      </div>
    </div>
  );
}

// ── Suspense wrapper (required for useSearchParams in Next.js static builds) ──
export default function PlannerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading Copilot…</p>
        </div>
      </div>
    }>
      <PlannerClient />
    </Suspense>
  );
}
