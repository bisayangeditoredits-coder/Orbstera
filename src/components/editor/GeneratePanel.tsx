'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { usePresentationStore } from '@/store/usePresentationStore';
import { PresentationData } from '@/types';
import { VoiceOrb } from '@/components/editor/VoiceOrb';
import {
  Sparkles, X, ChevronDown, Loader2, Wand2,
  Zap, Gauge, Crown, Globe, ArrowRight,
  Save, Trash2, Download, AlertCircle, Plus, Mic, MicOff
} from 'lucide-react';

interface GeneratePanelProps {
  onClose?: () => void;
}

const EXAMPLE_PROMPTS = [
  'Create a 12-slide Series A pitch deck for an AI robotics startup with a dark cyber theme',
  'Build a product launch deck for a fintech SaaS app targeting enterprise companies',
  'Design a quarterly business review with KPIs, growth metrics, and roadmap',
  'Create a portfolio presentation for a UX design agency, creative and vibrant',
  'Build a go-to-market strategy deck for a health-tech startup',
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'creative', label: 'Creative' },
  { value: 'bold', label: 'Bold' },
  { value: 'casual', label: 'Casual' },
  { value: 'minimal', label: 'Minimal' },
];

const SLIDE_COUNTS = [2, 5, 10, 15, 20, 25, 30];

export function GeneratePanel({ onClose }: GeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'standard' | 'fast' | 'premium'>('standard');
  const [tone, setTone] = useState('professional');
  const [slideCount, setSlideCount] = useState(5);
  const [language, setLanguage] = useState('English');
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isPaid = userPlan === 'pro' || userPlan === 'creator_pro';
  const isCreatorPro = userPlan === 'creator_pro';
  // Plan-based max slides (mirrors server MAX_SLIDES)
  const maxSlidesForPlan = isCreatorPro ? 30 : isPaid ? 25 : 5;

  // ── Voice Protocol ──────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const toggleVoice = () => {
    if (!isPaid) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Voice not supported in this browser.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setVoiceTranscript(transcript);
      setPrompt(transcript);
    };
    recognition.onend = () => { setIsListening(false); setVoiceTranscript(''); };
    recognition.onerror = () => { setIsListening(false); setVoiceTranscript(''); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setVoiceTranscript('');
  };

  const [activeTab, setActiveTab] = useState<'create' | 'enhance'>('create');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [streamedSlides, setStreamedSlides] = useState<{id: string, title: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guard: auto-trigger from URL params fires exactly once
  const hasAutoTriggered = useRef(false);

  const { presentation, setPresentation, setActivePanel, setEditorState, editor } = usePresentationStore();
  const isLoading = editor.isGenerating;
  const searchParams = useSearchParams();

  // Fetch user plan on mount to drive UI gating
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single();
          if (profile?.plan) setUserPlan(profile.plan.toLowerCase());
        }
      } catch (_) {}
    };
    fetchPlan();
  }, []);

  // Auto-trigger from URL params — runs exactly ONCE on mount
  useEffect(() => {
    if (hasAutoTriggered.current) return;

    const urlPrompt  = searchParams.get('prompt');
    const urlFileName = searchParams.get('fileName');
    const urlMode    = searchParams.get('mode') as 'create' | 'enhance' | null;

    if (urlMode) {
      setActiveTab(urlMode === 'enhance' ? 'enhance' : 'create');
    }

    if (urlPrompt && urlMode !== 'enhance') {
      hasAutoTriggered.current = true;  // lock before async work
      setPrompt(urlPrompt);
      if (urlFileName) setSelectedFile({ name: urlFileName } as File);

      const timer = setTimeout(() => {
        executeGenerate('replace', urlPrompt);
      }, 600);
      return () => clearTimeout(timer);
    } else if (urlFileName) {
      hasAutoTriggered.current = true;
      setSelectedFile({ name: urlFileName } as File);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps = mount only, no re-trigger on re-render

  const handleGenerateClick = () => {
    if (presentation && presentation.slides.length > 0) {
      setShowConfirm(true);
    } else {
      executeGenerate('replace');
    }
  };

  // appendMode: 'replace' = wipe & replace, 'append' = add to existing deck
  const executeGenerate = async (appendMode: 'replace' | 'append' = 'replace', overridePrompt?: string) => {
    const targetPrompt = overridePrompt || prompt;
    if (activeTab === 'create') {
      const trimmed = targetPrompt.trim();
      if (!trimmed || isLoading) return;

      // For 'replace' mode, wipe the existing presentation immediately
      if (appendMode === 'replace') {
        setPresentation({ title: 'Generating...', theme: 'modern-dark', colorPalette: ['#05050A', '#FFFFFF', '#7B61FF', '#C0C0D0'], fontPairing: { heading: 'Space Grotesk', body: 'Inter' }, slides: [] });
      }

      setEditorState({ isGenerating: true });
      setError('');
      setStreamedSlides([]);

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: trimmed, mode, slideCount, tone, language }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 403 && errData.error === 'LIMIT_REACHED') {
            setShowUpgradeModal(true);
            setEditorState({ isGenerating: false });
            return;
          }
          throw new Error(errData.error || errData.message || 'Generation failed');
        }
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let processedSlideCount = 0;

        const streamSlide = usePresentationStore.getState().streamSlide;
        const storeSetPresentation = usePresentationStore.getState().setPresentation;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content || '';
                accumulatedText += content;

                // ── Extract Reasoning (e.g. from DeepSeek R1 <think> tags) ──
                const thoughtMatch = accumulatedText.match(/<(?:think|thought)>([\s\S]*?)(?:<\/(?:think|thought)>|$)/i);
                if (thoughtMatch && thoughtMatch[1]) {
                  setEditorState({ reasoning: thoughtMatch[1].trim() });
                }

                const slideRegex = /\{[^{}]*"type":\s*"[^"]+"[^{}]*\}/g;
                const matches = accumulatedText.match(slideRegex) || [];

                if (matches.length > processedSlideCount) {
                  for (let i = processedSlideCount; i < matches.length; i++) {
                    try {
                      const slideObj = JSON.parse(matches[i]);
                      if (slideObj.type && slideObj.title) {
                        streamSlide(slideObj);
                        setStreamedSlides(prev => [...prev, { id: slideObj.id || `s-${i}`, title: slideObj.title }]);
                        processedSlideCount++;
                      }
                    } catch (e) {}
                  }
                }
              } catch (e) {}
            }
          }
        }

        // Final attempt to parse full JSON — in append mode merge slides instead of replacing
        try {
          // Strip out <think>...</think> tags completely so it doesn't break JSON.parse
          const textWithoutTags = accumulatedText.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, '');
          
          // Find the first { and last } to ignore conversational text from free models
          const firstBrace = textWithoutTags.indexOf('{');
          const lastBrace = textWithoutTags.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            const cleanJson = textWithoutTags.substring(firstBrace, lastBrace + 1);
            const finalData = JSON.parse(cleanJson);
            
            if (finalData.slides) {
              if (appendMode === 'append') {
                // Merge: keep existing slides and push new ones on top
                const existingSlides = usePresentationStore.getState().presentation?.slides || [];
                storeSetPresentation({ ...finalData, slides: [...existingSlides, ...finalData.slides] });
              } else {
                storeSetPresentation(finalData);
              }
            } else {
               throw new Error('JSON parsed but no slides array found.');
            }
          } else {
            throw new Error('No valid JSON object found in response.');
          }
        } catch (e) {
          console.error('Final JSON parse failed:', e, accumulatedText);
          throw new Error('The AI generated an invalid format. Please try again.');
        }

        setActivePanel('layers');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setEditorState({ isGenerating: false });
      }
    } else {
      // Enhance Mode
      if (!selectedFile || isLoading) return;
      setEditorState({ isGenerating: true });
      setError('');

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('mode', mode);

        const res = await fetch('/api/enhance-ppt', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Enhancement failed');
        }

        const data: PresentationData = await res.json();
        setPresentation(data);
        setActivePanel('layers');
        // Don't call onClose so the layers panel stays open
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please check your Cloudflare R2 settings or file format.');
      } finally {
        setEditorState({ isGenerating: false });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerateClick();
    }
  };

  const fillExample = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  return (
    <>
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden text-center text-white"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-primary" />
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black font-space-grotesk mb-2">Limit Reached</h2>
              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                You've used all 3 of your free monthly AI presentations. To continue building amazing decks and unlock elite models like Claude 3.5 Sonnet, please upgrade your account.
              </p>
              <div className="flex flex-col gap-3">
                <a href="/pricing" className="w-full py-3.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
                  <Crown size={18} /> Upgrade to Pro
                </a>
                <button onClick={() => setShowUpgradeModal(false)} className="w-full py-3.5 bg-white/5 text-white/50 hover:bg-white/10 font-bold rounded-xl transition-colors">
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="tour-generate" className="flex flex-col h-full bg-white text-black overflow-hidden relative border-l border-black/[0.04]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-6 bg-white z-20">
          <h2 className="text-[14px] font-bold text-black tracking-tight">AI Assistant</h2>
          <Sparkles size={16} className="text-primary" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-20 flex flex-col gap-8 mt-2">
          
          {/* Prompt Area */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest text-center">
              Your Prompt
            </label>
            <div className="w-full bg-[#F8F9FA] rounded-2xl p-5 min-h-[140px] flex flex-col relative transition-all border border-transparent focus-within:border-primary/20 focus-within:bg-white focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your presentation topic in a few words..."
                className="w-full flex-1 bg-transparent text-[13px] text-black placeholder:text-black/30 resize-none focus:outline-none font-medium leading-relaxed text-center"
              />
            </div>
          </div>

          {/* Tone Selection */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-[10px] font-bold text-black/40 uppercase tracking-widest text-center">
              Tone
            </label>
            <div className="flex items-center justify-center gap-2">
              {[
                { value: 'professional', label: 'Professional' },
                { value: 'creative', label: 'Creative' },
                { value: 'minimal', label: 'Minimal' }
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-5 py-2 rounded-full text-[12px] font-bold transition-all border ${
                    tone === t.value
                      ? 'bg-[#3B82F6] text-white border-[#3B82F6] shadow-md shadow-blue-500/20'
                      : 'bg-white border-black/10 text-black/60 hover:border-black/20 hover:text-black'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-50 border border-red-100 text-[12px] text-red-600 font-medium text-center">
              {error}
            </motion.div>
          )}

          {/* Generate Button */}
          <div className="mt-2 flex justify-center">
            <button
              onClick={handleGenerateClick}
              disabled={!prompt.trim() || isLoading}
              className="w-full max-w-[280px] h-12 rounded-full bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] font-bold text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Presentation'
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Save/Discard/Append Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-white/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 border border-borderSubtle shadow-premium flex flex-col items-center text-center gap-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-[20px] font-bold text-black tracking-tight">What would you like to do?</h3>
                <p className="text-[13px] text-textSecondary leading-relaxed px-2">
                  You already have <strong>{presentation?.slides.length ?? 0} slide{(presentation?.slides.length ?? 0) !== 1 ? 's' : ''}</strong>. Generate 5 more and add them, or replace everything with a fresh deck.
                </p>
              </div>

              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    executeGenerate('append');
                  }}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-primary text-white text-[13px] font-bold shadow-premium hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} />
                  Add 5 Slides to Existing
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    executeGenerate('replace');
                  }}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-panel text-textSecondary text-[13px] font-bold hover:bg-red-50 hover:text-red-500 transition-colors border border-borderSubtle"
                >
                  <Trash2 size={16} />
                  Replace All with New Deck
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-2 text-[11px] font-bold text-textMuted uppercase tracking-widest mt-2"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
