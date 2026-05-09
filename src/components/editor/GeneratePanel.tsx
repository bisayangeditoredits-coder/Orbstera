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

      <div id="tour-generate" className="flex flex-col h-full bg-white text-black overflow-hidden relative">
        {/* Global Hidden Input for Technical Attachments */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pptx,.pdf,.docx,.txt" 
          className="hidden" 
        />      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-borderSubtle bg-white/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-black tracking-tight">AI Generation</h2>
              <p className="text-[10px] font-medium text-textMuted uppercase tracking-widest">Powered by Orvixes Gen 4</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-hoverSurface text-textMuted transition-all">
              <X size={18} />
            </button>
          )}
        </div>
        
        {/* Modern Tabs */}
        <div className="px-6 pb-4">
          <div className="p-1 bg-panel rounded-2xl flex gap-1 border border-borderSubtle shadow-inner">
            <button 
              onClick={() => setActiveTab('create')}
              className={`flex-1 text-[12px] font-bold py-2.5 rounded-xl transition-all ${
                activeTab === 'create' 
                  ? 'bg-white text-primary shadow-premium border border-borderSubtle' 
                  : 'text-textSecondary hover:text-black hover:bg-white/40'
              }`}
            >
              Create New
            </button>
            <button 
              onClick={() => setActiveTab('enhance')}
              className={`flex-1 text-[12px] font-bold py-2.5 rounded-xl transition-all ${
                activeTab === 'enhance' 
                  ? 'bg-white text-primary shadow-premium border border-borderSubtle' 
                  : 'text-textSecondary hover:text-black hover:bg-white/40'
              }`}
            >
              Enhancer
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 space-y-8">
        {/* Intelligence Mode (Compact) */}
        <div className="space-y-2">
           <label className="text-[9px] font-black text-textMuted uppercase tracking-[0.2em] block">Intelligence</label>
           <div className="grid grid-cols-3 gap-1.5">
            {[
              { value: 'standard', label: 'Std', icon: <Zap size={12} />, free: true },
              { value: 'fast', label: 'Fast', icon: <Gauge size={12} />, free: false },
              { value: 'premium', label: 'Elite', icon: <Crown size={12} />, free: false },
            ].map((m) => {
              const isLocked = !isPaid && !m.free;
              const isActive = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => !isLocked && setMode(m.value as any)}
                  title={isLocked ? 'Upgrade to Pro to unlock' : undefined}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[9px] font-bold transition-all border relative ${
                    isLocked
                      ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                      : isActive
                      ? 'bg-primary/5 text-primary border-primary/20 shadow-sm'
                      : 'bg-white text-textSecondary border-borderSubtle hover:border-primary/10'
                  }`}
                >
                  {m.icon}
                  <span className="uppercase tracking-widest">{m.label}</span>
                  {isLocked && <Crown size={8} className="absolute top-1.5 right-1.5 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
        {activeTab === 'create' ? (
          <>
            {/* Prompt Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-textMuted uppercase tracking-[0.2em] block">Your Vision</label>
                {/* Voice Protocol badge */}
                <span className="text-[9px] font-bold text-primary/60 uppercase tracking-wider flex items-center gap-1">
                  <Mic size={9} /> Voice Protocol {!isPaid && <Crown size={8} className="text-amber-400" />}
                </span>
              </div>
              <div className="animated-border shadow-[0_32px_64px_-16px_rgba(59,130,246,0.2)]">
                <div className="bg-white p-5 flex flex-col min-h-[130px] transition-all rounded-[22px] relative overflow-hidden">
                  {/* ✨ Voice Orb overlay — replaces textarea while listening */}
                  <VoiceOrb
                    isListening={isListening}
                    transcript={voiceTranscript}
                    onStop={toggleVoice}
                  />
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? '🎤 Listening... speak your vision' : 'Describe your presentation topic...'}
                    className={`w-full flex-1 bg-transparent text-black placeholder:text-textMuted/40 resize-none focus:outline-none font-medium transition-all duration-300 ${
                      prompt.length > 200 ? 'text-[11px] leading-tight' :
                      prompt.length > 80  ? 'text-[14px] leading-snug' :
                      'text-[18px] leading-relaxed'
                    }`}
                  />

                  {/* Bottom toolbar */}
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-black/[0.03]">
                    <div className="flex items-center gap-3">
                      {/* Attach button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 rounded-xl bg-[#F8F9FA] border border-black/[0.04] flex items-center justify-center text-black/40 hover:text-primary hover:bg-primary/[0.04] hover:border-primary/20 transition-all shadow-sm group"
                        title="Attach Reference Document"
                      >
                        <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
                      </button>

                      {/* Voice Protocol Mic */}
                      <button
                        onClick={toggleVoice}
                        title={!isPaid ? 'Voice Protocol — Pro members only' : isListening ? 'Stop listening' : 'Start voice input'}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm relative ${
                          !isPaid
                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                            : isListening
                            ? 'bg-red-50 border-red-200 text-red-500 animate-pulse'
                            : 'bg-[#F8F9FA] border-black/[0.04] text-black/40 hover:text-primary hover:bg-primary/[0.04] hover:border-primary/20'
                        }`}
                      >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        {!isPaid && <Crown size={8} className="absolute -top-1 -right-1 text-amber-400" />}
                      </button>

                      {selectedFile && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 shadow-sm group"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight truncate max-w-[120px]">
                            {selectedFile.name}
                          </span>
                          <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-emerald-200/50 rounded-md transition-colors">
                            <X size={10} className="text-emerald-700" />
                          </button>
                        </motion.div>
                      )}
                    </div>

                    <div className="text-[10px] font-bold text-black/10 uppercase tracking-[0.2em]">
                      Neural Prompt v4
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tone Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-textMuted uppercase tracking-[0.2em] block">Narrative Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all border ${
                      tone === t.value
                        ? 'bg-black text-white border-black shadow-premium'
                        : 'bg-white border-borderSubtle text-textSecondary hover:border-black/20'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide Count — gated by plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-textMuted uppercase tracking-[0.2em]">Density (Slides)</label>
                {!isPaid
                  ? <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1"><Crown size={10} /> Free: max 5</span>
                  : <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Max {maxSlidesForPlan} slides</span>
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {SLIDE_COUNTS.filter(n => n <= maxSlidesForPlan || !isPaid).map((n) => {
                  const isLocked = n > maxSlidesForPlan;
                  return (
                    <button
                      key={n}
                      onClick={() => !isLocked && setSlideCount(n)}
                      title={isLocked ? `Upgrade to unlock ${n} slides` : `Generate ${n} slides`}
                      className={`flex-1 min-w-[40px] h-11 rounded-xl text-[12px] font-black transition-all flex items-center justify-center border relative ${
                        isLocked
                          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                          : slideCount === n
                          ? 'bg-primary text-white border-primary shadow-premium'
                          : 'bg-white border-borderSubtle text-textSecondary hover:border-primary/20'
                      }`}
                    >
                      {n}
                      {isLocked && <Crown size={8} className="absolute top-1 right-1 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </>
        ) : (
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative border-2 border-dashed border-borderSubtle rounded-[32px] p-12 flex flex-col items-center justify-center gap-5 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all bg-white"
            >
              <div className="w-16 h-16 rounded-[22px] bg-panel flex items-center justify-center group-hover:scale-110 transition-transform shadow-premium">
                <Globe size={32} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-bold text-black">{selectedFile ? selectedFile.name : 'Upload Presentation'}</p>
                <p className="text-[12px] text-textMuted mt-1">Drop PPTX to enhance with AI design</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-red-50 border border-red-100 text-[12px] text-red-600 font-medium">
            {error}
          </motion.div>
        )}
      </div>

      {/* Original Button Loading State (Overlay removed) */}

      {/* Consistent Luxury CTA */}
      <div className="shrink-0 p-8 border-t border-black/[0.03] bg-white relative z-50">
        <button
          onClick={handleGenerateClick}
          disabled={(activeTab === 'create' ? !prompt.trim() : !selectedFile) || isLoading}
          className="group relative w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_12px_24px_-8px_rgba(59,130,246,0.5)] disabled:opacity-30 disabled:shadow-none transition-all duration-300 active:scale-[0.96] overflow-hidden"
        >
          <div className="relative flex items-center justify-center gap-3">
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin text-white/80" />
                <span className="text-[15px] font-bold tracking-tight">Orchestrating...</span>
              </>
            ) : (
              <>
                <span className="text-[15px] font-bold tracking-tight">Generate Presentation</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
        </button>
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
                  You already have <strong>{presentation?.slides.length ?? 0} slide{(presentation?.slides.length ?? 0) !== 1 ? 's' : ''}</strong>. Generate {slideCount} more and add them, or replace everything with a fresh deck.
                </p>
              </div>

              <div className="w-full flex flex-col gap-2">
                {/* ADD TO EXISTING */}
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    executeGenerate('append');
                  }}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-primary text-white text-[13px] font-bold shadow-premium hover:bg-primary/90 transition-colors"
                >
                  <Plus size={16} />
                  Add {slideCount} Slide{slideCount !== 1 ? 's' : ''} to Existing
                </button>
                {/* REPLACE ALL */}
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
    </div>
    </>
  );
}
