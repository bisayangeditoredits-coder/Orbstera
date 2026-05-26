/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '@/store/usePresentationStore';
import {
  Sparkles, Wand2, RefreshCw, Maximize2, Minimize2,
  FileText, Palette, ChevronRight, Loader2, CheckCircle,
  Copy, X, BrainCircuit, Target, TrendingUp, Smile,
  BookOpen, Zap, Volume2, AlignLeft, Globe, Stars,
  MessageSquare, ArrowRight, Layers, RotateCcw, Type,
} from 'lucide-react';

// ─── API helper ───────────────────────────────────────────────────────────────
async function callMagicEdit(
  prompt: string,
  element: Record<string, unknown>,
  slideContext: Record<string, unknown>,
) {
  const res = await fetch('/api/magic-edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, element, slideContext }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data as { content?: string };
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, iconUrl, title, subtitle }: {
  icon?: React.ElementType;
  iconUrl?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      {iconUrl ? (
        <img src={iconUrl} alt={title} className="mt-0.5 h-7 w-7 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-black/5" />
      ) : Icon ? (
        <div className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
          <Icon size={13} className="text-white" strokeWidth={2.5} />
        </div>
      ) : null}
      <div>
        <p className="text-[12px] font-bold text-neutral-800 leading-tight">{title}</p>
        {subtitle && <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 h-px bg-neutral-100" />
      {label && <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300">{label}</span>}
      <div className="flex-1 h-px bg-neutral-100" />
    </div>
  );
}

// ─── AI Result Card ───────────────────────────────────────────────────────────
function ResultCard({ text, onApply, onDiscard }: {
  text: string;
  onApply?: () => void;
  onDiscard: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', damping: 22, stiffness: 320 }}
      className="rounded-2xl overflow-hidden border border-indigo-100 mb-3"
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 60%, #FDF4FF 100%)' }}
    >
      <div className="h-[3px]" style={{ background: 'linear-gradient(90deg,#6366F1,#8B5CF6,#A855F7)' }} />
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-indigo-500">
            <Stars size={9} /> AI Result
          </span>
          <button onClick={onDiscard} className="h-5 w-5 flex items-center justify-center rounded-md text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100 transition-all">
            <X size={11} />
          </button>
        </div>
        <p className="text-[11.5px] text-indigo-900 leading-relaxed whitespace-pre-wrap max-h-[140px] overflow-y-auto custom-scrollbar">
          {text}
        </p>
        <div className="flex gap-1.5">
          {onApply && (
            <button
              onClick={onApply}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
            >
              <CheckCircle size={11} strokeWidth={2.5} /> Apply to Slide
            </button>
          )}
          <button
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-white/80 px-3 py-2 text-[11px] font-bold text-indigo-600 hover:bg-white transition-all active:scale-[0.97] shrink-0"
          >
            {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 1. SLIDE AI ACTIONS ─────────────────────────────────────────────────────
// Always visible — works on the current slide regardless of selection
const SLIDE_ACTIONS = [
  {
    id: 'notes'    as const, icon: FileText,    label: 'Write Speaker Notes',
    desc: 'Generates notes you can read while presenting',
    color: '#0009fa',
  },
  {
    id: 'improve'  as const, icon: Stars,        label: 'Improve This Slide',
    desc: 'Strengthens the title, bullets, and overall message',
    color: '#8B5CF6',
  },
  {
    id: 'simplify' as const, icon: Minimize2,    label: 'Simplify Content',
    desc: 'Removes clutter so the key point is crystal-clear',
    color: '#10B981',
  },
  {
    id: 'expand'   as const, icon: Maximize2,    label: 'Expand & Add Detail',
    desc: 'Adds depth, sub-points, and supporting examples',
    color: '#F59E0B',
  },
  {
    id: 'suggest'  as const, icon: BrainCircuit, label: 'Suggest Next Slide',
    desc: 'AI recommends what the following slide should cover',
    color: '#EC4899',
  },
] as const;

type SlideActionId = typeof SLIDE_ACTIONS[number]['id'];

function SlideActions() {
  const { presentation, currentSlideIndex, updateSlide } = usePresentationStore();
  const [loading, setLoading] = useState<SlideActionId | null>(null);
  const [result, setResult] = useState<{ id: SlideActionId; text: string; applied?: boolean } | null>(null);

  const slide = presentation?.slides[currentSlideIndex];

  const run = useCallback(async (id: SlideActionId) => {
    if (!slide || loading) return;
    setLoading(id);
    setResult(null);

    const ctx = {
      title: slide.title,
      bullets: slide.elements?.filter(e => e.type === 'text').map(e => e.content).filter(Boolean),
      notes: slide.speakerNotes,
      deckTitle: presentation?.title,
    };

    const PROMPTS: Record<SlideActionId, string> = {
      notes:    'Write detailed, engaging speaker notes for this slide (150-250 words). Include talking points, transition cues, and delivery tips.',
      improve:  'Rewrite this slide\'s title and bullet points to be more impactful, clear, and memorable. Show the improved versions.',
      simplify: 'Tell me exactly what to remove or shorten on this slide so the core message is immediately obvious.',
      expand:   'Suggest 4-5 specific bullet points, facts, or examples that would meaningfully deepen this slide\'s content.',
      suggest:  'Suggest 3 great ideas for the NEXT slide: give each a title and 2-3 key points.',
    };

    try {
      const data = await callMagicEdit(
        `${PROMPTS[id]}\n\nSlide: ${JSON.stringify(ctx)}`,
        { type: 'text', content: JSON.stringify(ctx) },
        ctx,
      );
      const text = data.content || '';
      let applied = false;
      if (id === 'notes' && slide && text) {
        updateSlide(slide.id, { speakerNotes: text });
        applied = true;
      }
      setResult({ id, text, applied });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }, [slide, loading, presentation, updateSlide]);

  return (
    <div>
      <SectionHeading
        iconUrl="/ui-icons/ai-wand.png"
        title="Slide Actions"
        subtitle="AI works on your current slide as a whole"
      />

      {/* Current slide chip */}
      {slide?.title && (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-2.5 py-2 mb-3">
          <Layers size={11} className="shrink-0 text-neutral-400" />
          <p className="text-[10.5px] font-semibold text-neutral-600 truncate">{slide.title}</p>
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <ResultCard
            text={result.text}
            onDiscard={() => setResult(null)}
          />
        )}
      </AnimatePresence>

      {/* Action list */}
      <div className="space-y-1.5">
        {SLIDE_ACTIONS.map(({ id, icon: Icon, label, desc, color }) => (
          <button
            key={id}
            onClick={() => run(id)}
            disabled={!!loading}
            className="group w-full flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left hover:border-neutral-200 hover:shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
              {loading === id
                ? <Loader2 size={15} className="animate-spin" style={{ color }} />
                : <Icon size={15} style={{ color }} strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-bold text-neutral-800 leading-tight">{label}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">{desc}</p>
            </div>
            <ChevronRight size={13} className="shrink-0 text-neutral-300 group-hover:text-neutral-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 2. TEXT REWRITE ──────────────────────────────────────────────────────────
// Only shows when a text element is selected
const REWRITE_PRESETS = [
  { id: 'rephrase',     icon: RefreshCw,  label: 'Rephrase',       color: '#6366F1', prompt: 'Rephrase this to sound fresh while keeping the exact same meaning.' },
  { id: 'shorten',      icon: Minimize2,  label: 'Shorten',        color: '#06B6D4', prompt: 'Make this more concise and punchy. Remove all fluff.' },
  { id: 'expand',       icon: Maximize2,  label: 'Expand',         color: '#8B5CF6', prompt: 'Expand this with more detail and depth.' },
  { id: 'professional', icon: Target,     label: 'Professional',   color: '#0EA5E9', prompt: 'Rewrite in a polished, executive business tone.' },
  { id: 'casual',       icon: Smile,      label: 'Casual',         color: '#10B981', prompt: 'Rewrite in a warm, conversational tone.' },
  { id: 'persuasive',   icon: TrendingUp, label: 'Persuasive',     color: '#F59E0B', prompt: 'Rewrite to be highly persuasive and action-driving.' },
  { id: 'story',        icon: BookOpen,   label: 'Storytelling',   color: '#EC4899', prompt: 'Rewrite as an engaging narrative that people remember.' },
  { id: 'bold',         icon: Zap,        label: 'Bold & Punchy',  color: '#EF4444', prompt: 'Make this bold, punchy, and high-impact like a headline.' },
  { id: 'simpler',      icon: Volume2,    label: 'Simplify',       color: '#14B8A6', prompt: 'Rewrite using simple, jargon-free words anyone can understand.' },
  { id: 'academic',     icon: AlignLeft,  label: 'Academic',       color: '#64748B', prompt: 'Rewrite in a formal, scholarly academic tone.' },
] as const;

const TRANSLATE_LANGS = [
  { code: 'es', flag: 'ðŸ‡ªðŸ‡¸', label: 'Spanish'    },
  { code: 'fr', flag: 'ðŸ‡«ðŸ‡·', label: 'French'     },
  { code: 'de', flag: 'ðŸ‡©ðŸ‡ª', label: 'German'     },
  { code: 'ja', flag: 'ðŸ‡¯ðŸ‡µ', label: 'Japanese'   },
  { code: 'zh', flag: 'ðŸ‡¨ðŸ‡³', label: 'Chinese'    },
  { code: 'ko', flag: 'ðŸ‡°ðŸ‡·', label: 'Korean'     },
  { code: 'pt', flag: 'ðŸ‡§ðŸ‡·', label: 'Portuguese' },
  { code: 'ar', flag: 'ðŸ‡¸ðŸ‡¦', label: 'Arabic'     },
  { code: 'it', flag: 'ðŸ‡®ðŸ‡¹', label: 'Italian'    },
  { code: 'ru', flag: 'ðŸ‡·ðŸ‡º', label: 'Russian'    },
];

function TextRewriteSection() {
  const { presentation, currentSlideIndex, editor, updateElement } = usePresentationStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string } | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showTranslate, setShowTranslate] = useState(false);

  const slide = presentation?.slides[currentSlideIndex];
  const selectedId = editor.selectedElementId;
  const selectedEl = selectedId ? slide?.elements?.find(e => e.id === selectedId) : null;
  const textContent = selectedEl?.content || '';

  const run = useCallback(async (promptText: string, actionId: string) => {
    if (!textContent.trim() || loading) return;
    setLoading(actionId);
    setResult(null);
    try {
      const ctx = { deckTitle: presentation?.title, slideTitle: slide?.title, palette: presentation?.colorPalette };
      const data = await callMagicEdit(
        `${promptText}\n\nOriginal text:\n"${textContent}"`,
        selectedEl as unknown as Record<string, unknown>,
        ctx,
      );
      if (data.content) setResult({ text: data.content });
    } catch (e) { console.error(e); }
    finally { setLoading(null); }
  }, [textContent, loading, selectedEl, presentation?.title, presentation?.colorPalette, slide?.title]);

  const apply = () => {
    if (!result || !slide || !selectedId) return;
    updateElement(slide.id, selectedId, { content: result.text });
    setResult(null);
  };

  return (
    <div>
      <SectionHeading
        iconUrl="/ui-icons/sparkles.png"
        title="Rewrite Text"
        subtitle="AI rewrites the selected text element"
      />

      {/* Original text preview */}
      <div className="rounded-xl border border-neutral-100 bg-white px-3 py-2.5 mb-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Selected Text</p>
        <p className="text-[11.5px] text-neutral-700 leading-relaxed line-clamp-2">{textContent || '(empty)'}</p>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <ResultCard text={result.text} onApply={apply} onDiscard={() => setResult(null)} />
        )}
      </AnimatePresence>

      {/* Preset chips — 2 col grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {REWRITE_PRESETS.map(({ id, icon: Icon, label, color, prompt }) => (
          <button
            key={id}
            onClick={() => run(prompt, id)}
            disabled={!!loading}
            className="group flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-2.5 py-2 text-left hover:border-neutral-200 hover:shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center" style={{ background: `${color}15` }}>
              {loading === id
                ? <Loader2 size={11} className="animate-spin" style={{ color }} />
                : <Icon size={11} strokeWidth={2} style={{ color }} />}
            </div>
            <span className="text-[11px] font-semibold text-neutral-700 truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Custom instruction */}
      <div className="flex gap-1.5 mb-3">
        <input
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && customPrompt.trim()) run(customPrompt, 'custom'); }}
          placeholder='Custom: e.g. "Sound like Steve Jobs"'
          className="flex-1 h-9 rounded-xl border border-neutral-200 bg-white px-3 text-[11px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
        />
        <button
          onClick={() => customPrompt.trim() && run(customPrompt, 'custom')}
          disabled={!customPrompt.trim() || !!loading}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-white disabled:opacity-40 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
        >
          {loading === 'custom' ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={15} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Translate collapsible */}
      <div className="rounded-xl border border-neutral-100 bg-white overflow-hidden">
        <button
          onClick={() => setShowTranslate(v => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-neutral-50 transition-colors"
        >
          <Globe size={13} className="text-blue-400 shrink-0" />
          <span className="flex-1 text-[11px] font-semibold text-neutral-700 text-left">Translate to another language</span>
          <motion.div animate={{ rotate: showTranslate ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronRight size={13} className="text-neutral-400" />
          </motion.div>
        </button>
        <AnimatePresence>
          {showTranslate && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="border-t border-neutral-100 px-3 pb-3 pt-2">
                <div className="grid grid-cols-5 gap-1.5">
                  {TRANSLATE_LANGS.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => run(`Translate this to ${lang.label}. Return ONLY the translated text.`, `t-${lang.code}`)}
                      disabled={!!loading}
                      className="flex flex-col items-center gap-0.5 rounded-lg border border-neutral-100 bg-white py-2 hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-40"
                    >
                      <span className="text-base leading-none">{lang.flag}</span>
                      <span className="text-[8.5px] font-semibold text-neutral-500 truncate w-full text-center">
                        {loading === `t-${lang.code}` ? '…' : lang.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── 3. AI CHAT ───────────────────────────────────────────────────────────────
interface ChatMsg { role: 'user' | 'ai'; text: string; ts: number; }

const STARTER_PROMPTS = [
  'What should I add to make this slide more engaging?',
  'Give me a strong opening hook for this presentation',
  'What\'s missing from this deck?',
  'Write me a 30-second pitch based on this presentation',
];

function AIChatSection() {
  const { presentation, currentSlideIndex } = usePresentationStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const slide = presentation?.slides[currentSlideIndex];

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(p => [...p, { role: 'user', text, ts: Date.now() }]);
    setInput('');
    setLoading(true);

    const ctx = `Deck: "${presentation?.title}". Slide: "${slide?.title}". Content: ${slide?.elements?.filter(e => e.type === 'text').map(e => e.content).filter(Boolean).join(' | ')}`;

    try {
      const data = await callMagicEdit(
        `You are a concise AI presentation coach. Context: ${ctx}\nUser: ${text}\nCoach:`,
        { type: 'text', content: text },
        { deckTitle: presentation?.title, slideTitle: slide?.title },
      );
      setMessages(p => [...p, { role: 'ai', text: data.content || 'No response.', ts: Date.now() }]);
    } catch {
      setMessages(p => [...p, { role: 'ai', text: 'Something went wrong. Try again.', ts: Date.now() }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [loading, presentation, slide]);

  return (
    <div>
      <SectionHeading
        iconUrl="/ui-icons/ai-brain.png"
        title="Ask AI Coach"
        subtitle="Ask anything about your presentation"
      />

      {/* Chat history */}
      <div className="min-h-0 overflow-y-auto custom-scrollbar space-y-2 mb-3" style={{ maxHeight: 220 }}>
        {messages.length === 0 ? (
          <div className="space-y-1.5">
            {STARTER_PROMPTS.map((p, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => send(p)}
                className="w-full text-left rounded-xl border border-neutral-100 bg-white px-3 py-2.5 text-[11px] font-medium text-neutral-600 hover:border-indigo-200 hover:text-indigo-700 hover:bg-indigo-50/60 transition-all active:scale-[0.98]"
              >
                {p}
              </motion.button>
            ))}
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <motion.div
                key={msg.ts}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'ai' ? (
                  <img src="/ui-icons/ai-brain.png" alt="AI" className="h-6 w-6 rounded-lg shrink-0 object-cover shadow-sm" />
                ) : (
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold bg-neutral-200 text-neutral-500">
                    You
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3 py-2.5 max-w-[84%] text-[11px] leading-relaxed ${
                    msg.role === 'ai' ? 'rounded-tl-sm text-indigo-900' : 'rounded-tr-sm text-white shadow-sm'
                  }`}
                  style={msg.role === 'ai'
                    ? { background: 'linear-gradient(135deg,#EEF2FF,#F5F3FF)' }
                    : { background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <img src="/ui-icons/ai-brain.png" alt="AI" className="h-6 w-6 rounded-lg shrink-0 object-cover shadow-sm" />
                <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'linear-gradient(135deg,#EEF2FF,#F5F3FF)' }}>
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
                        className="h-1.5 w-1.5 rounded-full bg-indigo-400"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-1.5">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            title="Clear chat"
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:text-neutral-600 transition-all"
          >
            <RotateCcw size={13} />
          </button>
        )}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send(input); } }}
          placeholder="Ask anything…"
          className="flex-1 h-9 rounded-xl border border-neutral-200 bg-white px-3 text-[11px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-white disabled:opacity-40 active:scale-95 transition-all shadow-md"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={15} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}

// ─── Models footer ────────────────────────────────────────────────────────────
function ModelsBadge() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-neutral-100 bg-white px-3 py-2.5">
      <img src="/ui-icons/ai-brain.png" alt="AI" className="h-4 w-4 rounded-md object-cover opacity-60" />
      <p className="text-[9.5px] font-semibold text-neutral-400">
        Powered by <span className="text-neutral-600 font-bold">GPT-5.5</span> Â· <span className="text-neutral-600 font-bold">Claude Opus 4</span> Â· <span className="text-neutral-600 font-bold">FLUX Kontext</span>
      </p>
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────
export function AIToolsPanel() {
  const { editor, presentation, currentSlideIndex } = usePresentationStore();
  const slide = presentation?.slides[currentSlideIndex];
  const selectedId = editor.selectedElementId;
  const selectedEl = selectedId ? slide?.elements?.find(e => e.id === selectedId) : null;
  const isTextSelected = selectedEl?.type === 'text';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F7F8FA]">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white border-b border-neutral-100">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg,#6366F1,#8B5CF6,#A855F7)' }} />
        <div className="flex items-center gap-2.5 px-3 py-3">
          <div className="relative h-8 w-8 shrink-0">
            <div className="absolute inset-0 rounded-xl opacity-40 blur-md bg-indigo-500" />
            <img src="/ui-icons/sparkles.png" alt="AI Tools" className="relative h-8 w-8 rounded-xl object-cover shadow-sm ring-1 ring-black/5" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-bold text-neutral-900 leading-tight">AI Tools</h3>
            <p className="text-[9.5px] text-neutral-400 font-semibold">GPT-5.5 Â· Claude Opus 4 Â· FLUX</p>
          </div>
          {/* Context indicator */}
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold border ${
            isTextSelected
              ? 'bg-violet-50 border-violet-100 text-violet-600'
              : 'bg-indigo-50 border-indigo-100 text-indigo-500'
          }`}>
            {isTextSelected ? <><Type size={9} /> Text</> : <><Layers size={9} /> Slide</>}
          </div>
        </div>
      </header>

      {/* ── Scrollable content ───────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain custom-scrollbar p-3 space-y-0" data-lenis-prevent>

        {/* ── SECTION 1: Slide-level AI ─────────────────────────── */}
        <SlideActions />

        <Divider label="text element" />

        {/* ── SECTION 2: Text rewrite (context-aware) ──────────── */}
        {isTextSelected ? (
          <TextRewriteSection />
        ) : (
          /* Placeholder when no text selected */
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/60 px-4 py-6 text-center">
            <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center mx-auto mb-2.5">
              <Wand2 size={18} className="text-neutral-300" strokeWidth={1.5} />
            </div>
            <p className="text-[11.5px] font-bold text-neutral-500">Select a text element</p>
            <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
              Click any text on the canvas to unlock<br />AI rewrite & translate tools
            </p>
          </div>
        )}

        <Divider label="ai coach" />

        {/* ── SECTION 3: Chat ──────────────────────────────────── */}
        <AIChatSection />

        {/* ── Footer: Models info ──────────────────────────────── */}
        <div className="pt-2">
          <ModelsBadge />
        </div>
      </div>
    </div>
  );
}
