'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { SurveyModal } from './SurveyModal';
import { usePresentationStore } from '@/store/usePresentationStore';
import { PresentationData } from '@/types';
import { normalizePresentationPayload } from '@/lib/ai/orchestration';
import { extractDeckJsonFromModelOutput } from '@/lib/ai/openrouter';
import {
  createEditorSpeechRecognition,
  resolveEditorSpeechLang,
  resetEditorSpeechSession,
  flushEditorSpeechInterim,
} from '@/lib/editor-speech';
import { explainGetUserMediaError, explainRecognitionStartError } from '@/lib/mic-access';
import { VoiceOrb } from '@/components/editor/VoiceOrb';
import {
  Sparkles, X, ChevronDown, Loader2, Wand2,
  Crown, Globe, ArrowRight,
  Save, Trash2, Download, AlertCircle, Plus, Mic, MicOff,
  Briefcase, Palette, Zap, Minus, BookOpen, FlaskConical
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

const SLIDE_COUNTS = [2, 5, 10, 15, 20, 25, 30, 35, 40];

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', Icon: Briefcase },
  { id: 'creative',     label: 'Creative',     Icon: Palette },
  { id: 'bold',         label: 'Bold & Impact', Icon: Zap },
  { id: 'minimal',      label: 'Minimal',       Icon: Minus },
  { id: 'storytelling', label: 'Storytelling',  Icon: BookOpen },
  { id: 'technical',    label: 'Technical',     Icon: FlaskConical },
];

const THEME_OPTIONS = [
  { id: 'modern-dark',  label: 'Obsidian Night', desc: 'Deep dark with neon accents', preview: 'bg-gradient-to-br from-[#05050A] to-[#1a1a2e]' },
  { id: 'corporate',   label: 'Executive Blue',  desc: 'Clean corporate authority',  preview: 'bg-gradient-to-br from-[#0F4C81] to-[#1a6bb0]' },
  { id: 'gradient',    label: 'Aurora',          desc: 'Vivid gradient spectacle',   preview: 'bg-gradient-to-br from-[#7928CA] to-[#FF0080]' },
  { id: 'minimal',     label: 'Paper White',     desc: 'Ultra-clean minimalism',     preview: 'bg-gradient-to-br from-white to-[#F1F5F9] border border-black/10' },
  { id: 'warm',        label: 'Sunset Gold',     desc: 'Warm, premium editorial',    preview: 'bg-gradient-to-br from-[#B45309] to-[#F59E0B]' },
  { id: 'tech',        label: 'Cyber Grid',      desc: 'Futuristic tech aesthetic',  preview: 'bg-gradient-to-br from-[#0D1117] to-[#00FF88]/40' },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'es', label: 'Spanish',   flag: '🇪🇸' },
  { code: 'fr', label: 'French',    flag: '🇫🇷' },
  { code: 'de', label: 'German',    flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', label: 'Chinese',   flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese',  flag: '🇯🇵' },
  { code: 'ar', label: 'Arabic',    flag: '🇸🇦' },
];

function CollapsibleSection({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-neutral-50/90 transition-colors rounded-2xl"
      >
        <ChevronDown
          size={15}
          className={`shrink-0 mt-0.5 text-neutral-400 transition-transform duration-200 ${expanded ? 'rotate-180' : 'rotate-0'}`}
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.14em]">{title}</div>
          {!expanded && (
            <div className="text-[11px] font-medium text-neutral-700 mt-0.5 truncate pr-1">{summary}</div>
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-2.5">
          <div className="border-t border-black/[0.05] pt-2.5">{children}</div>
        </div>
      )}
    </div>
  );
}

export function GeneratePanel({ onClose }: GeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [showSurvey, setShowSurvey] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isPaid = userPlan === 'student_pro' || userPlan === 'pro' || userPlan === 'creator_pro';
  const isCreatorPro = userPlan === 'creator_pro';
  // Plan-based max slides (mirrors server MAX_SLIDES)
  const maxSlidesForPlan = isCreatorPro ? 40 : isPaid ? 25 : 5;

  // ── Voice Protocol (Web Speech API — same robustness as homepage) ──
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const shouldBeListeningRef = useRef(false);
  const speechLangRef = useRef(resolveEditorSpeechLang());
  const voicePromptPrefixRef = useRef('');
  const voiceStartBusyRef = useRef(false);

  const ensureVoiceRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    recognitionRef.current = createEditorSpeechRecognition({
      shouldBeListeningRef,
      speechLangRef,
      promptPrefixRef: voicePromptPrefixRef,
      onTranscript: (text) => {
        setVoiceTranscript(text);
        setPrompt(text);
      },
      onListeningEnd: () => setIsListening(false),
      onErrorMessage: (msg) => {
        setError(msg);
        setTimeout(() => setError(''), 5500);
      },
    });
    return recognitionRef.current;
  };

  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggleVoice = async () => {
    if (isListening) {
      shouldBeListeningRef.current = false;
      try {
        flushEditorSpeechInterim(recognitionRef.current);
      } catch {
        /* noop */
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        /* noop */
      }
      setIsListening(false);
      return;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Voice needs HTTPS or localhost.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const rec = ensureVoiceRecognition();
    if (!rec) {
      setError('Voice not supported in this browser. Try Chrome or Edge.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (voiceStartBusyRef.current) return;
    voiceStartBusyRef.current = true;
    speechLangRef.current = resolveEditorSpeechLang();
    resetEditorSpeechSession(rec);
    voicePromptPrefixRef.current = prompt;
    setVoiceTranscript(prompt);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Microphone is not available in this browser. Try Chrome or Edge.');
        setTimeout(() => setError(''), 6000);
        return;
      }

      let tempStream: MediaStream;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (gumErr) {
        console.error('[Voice] getUserMedia:', gumErr);
        shouldBeListeningRef.current = false;
        setIsListening(false);
        const hint = explainGetUserMediaError(gumErr);
        setError(hint || 'Could not open the microphone.');
        setTimeout(() => setError(''), 7000);
        return;
      }

      tempStream.getTracks().forEach((t) => t.stop());
      await new Promise((resolve) => setTimeout(resolve, 150));

      try {
        rec.stop();
      } catch {
        /* not running */
      }
      shouldBeListeningRef.current = true;
      rec.lang = speechLangRef.current;
      try {
        rec.start();
      } catch (recErr) {
        console.error('[Voice] recognition.start:', recErr);
        shouldBeListeningRef.current = false;
        setIsListening(false);
        const hint = explainRecognitionStartError(recErr);
        setError(hint || 'Speech recognition failed to start. Try again in a moment.');
        setTimeout(() => setError(''), 6000);
        return;
      }
      setIsListening(true);
    } finally {
      voiceStartBusyRef.current = false;
    }
  };

  const [activeTab, setActiveTab] = useState<'create' | 'enhance'>('create');
  const [expandDensity, setExpandDensity] = useState(true);
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [expandTone, setExpandTone] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('Obsidian Night');
  const [expandTheme, setExpandTheme] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [expandLanguage, setExpandLanguage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [streamedSlides, setStreamedSlides] = useState<{id: string, title: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guard: auto-trigger from URL params fires exactly once
  const hasAutoTriggered = useRef(false);

  const { presentation, setPresentation, setActivePanel, setEditorState, editor } = usePresentationStore();
  const isLoading = editor.isGenerating;

  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Fetch user plan and survey status on mount
  useEffect(() => {
    const fetchUser = async (retryCount = 0) => {
      setIsProfileLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Check user_metadata first for fastest response after payment
          if (user.user_metadata?.plan) {
            setUserPlan(user.user_metadata.plan.toLowerCase());
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('plan, survey_completed')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            setProfileData(profile);
            if (profile.plan) setUserPlan(profile.plan.toLowerCase());
          } else if (retryCount < 3 && searchParams.get('payment') === 'success') {
            // If payment was successful but profile isn't updated yet, retry after a short delay
            setTimeout(() => fetchUser(retryCount + 1), 2000);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchUser();
  }, [searchParams]); // Re-run if URL params change (e.g. after payment redirect)

  // Auto-trigger from URL params — runs exactly ONCE on mount or when profile is loaded
  useEffect(() => {
    if (hasAutoTriggered.current) return;
    if (isProfileLoading) return;

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
      setTimeout(() => {
        handleGenerateClick(urlPrompt);
      }, 50);
    } else if (urlFileName) {
      hasAutoTriggered.current = true;
      setSelectedFile({ name: urlFileName } as File);
      setTimeout(() => {
        handleGenerateClick();
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfileLoading, searchParams]);

  const handleGenerateClick = (overridePrompt?: string) => {
    const targetPrompt = overridePrompt || prompt;
    // ── AUTH GATE ──
    if (!user) {
      // Encode prompt to pass it through login
      const encodedPrompt = encodeURIComponent(targetPrompt);
      router.push(`/login?redirect=/editor&prompt=${encodedPrompt}&mode=create`);
      return;
    }

    // ── SURVEY GATE ──
    // Hard bypass if completed in this session (LocalStorage) OR already in profileData
    const hasCompletedInSession = typeof window !== 'undefined' && localStorage.getItem(`survey_done_${user?.id}`) === 'true';
    
    if (user && !isProfileLoading) {
      const isDoneInDB = profileData?.survey_completed;
      if (!isDoneInDB && !hasCompletedInSession) {
        setShowSurvey(true);
        return;
      }
    }

    if (presentation && presentation.slides.length > 0) {
      setShowConfirm(true);
    } else {
      executeGenerate('replace', targetPrompt);
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
        setPresentation({
          title: 'Generating...',
          theme: 'modern-dark',
          colorPalette: ['#05050A', '#FFFFFF', '#3B82F6', '#94A3B8'],
          fontPairing: { heading: 'Space Grotesk', body: 'Inter' },
          animationStyle: 'cinematic-reveal',
          slides: [],
        });
      }

      setEditorState({ isGenerating: true });
      setError('');
      setStreamedSlides([]);

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmed,
            slideCount,
            tone: selectedTone.toLowerCase().replace(/ & /g, '_'),
            theme: selectedTheme,
            language: selectedLanguage,
          }),
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
        /** Incomplete SSE line when chunks split mid-line */
        let sseCarry = '';

        const streamSlide = usePresentationStore.getState().streamSlide;
        const storeSetPresentation = usePresentationStore.getState().setPresentation;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseCarry += decoder.decode(value, { stream: true });
          const lines = sseCarry.split('\n');
          sseCarry = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const json = JSON.parse(data);

                if (json.orb) {
                  const orb = json.orb as Record<string, unknown>;
                  setEditorState({
                    orchestrationPhase: String(orb.phase || ''),
                    activeModelLabel: '',
                    reasoning: typeof orb.message === 'string' ? orb.message : '',
                  });
                  continue;
                }

                const ch = json.choices?.[0] as
                  | { delta?: { content?: string }; message?: { content?: string } }
                  | undefined;
                const piece =
                  (typeof ch?.delta?.content === 'string' ? ch.delta.content : '') ||
                  (typeof ch?.message?.content === 'string' ? ch.message.content : '');
                accumulatedText += piece;

                // ── Extract Reasoning (e.g. from DeepSeek R1 thinking tags) ──
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

        // Flush last SSE line if stream ended without a trailing newline
        if (sseCarry.startsWith('data: ')) {
          const line = sseCarry;
          const data = line.slice(6);
          if (data !== '[DONE]') {
            try {
              const json = JSON.parse(data);
              if (!json.orb) {
                const ch = json.choices?.[0] as
                  | { delta?: { content?: string }; message?: { content?: string } }
                  | undefined;
                const piece =
                  (typeof ch?.delta?.content === 'string' ? ch.delta.content : '') ||
                  (typeof ch?.message?.content === 'string' ? ch.message.content : '');
                accumulatedText += piece;
              }
            } catch {
              /* ignore truncated tail */
            }
          }
        }

        // Final attempt to parse full JSON — balanced-brace extraction (nested slides safe)
        try {
          let parsedRaw = extractDeckJsonFromModelOutput(accumulatedText);

          if (!parsedRaw) {
            const streamed = usePresentationStore.getState().presentation;
            const streamedSlides = streamed?.slides ?? [];
            if (streamedSlides.length > 0) {
              const inferredTitle =
                streamed.title && streamed.title !== 'Generating...'
                  ? streamed.title
                  : streamedSlides[0]?.title || 'Presentation';
              parsedRaw = {
                title: inferredTitle,
                theme: streamed.theme || 'modern-dark',
                colorPalette: streamed.colorPalette || ['#05050A', '#F8FAFC', '#38BDF8', '#94A3B8'],
                fontPairing: streamed.fontPairing || { heading: 'Space Grotesk', body: 'Inter' },
                animationStyle: streamed.animationStyle || 'cinematic-reveal',
                slides: streamedSlides,
              } as unknown as Record<string, unknown>;
            }
          }

          if (!parsedRaw) {
            throw new Error('NO_JSON');
          }

          let finalData = normalizePresentationPayload(parsedRaw);

          setEditorState({ orchestrationPhase: 'finishing' });
          try {
            const pr = await fetch('/api/generate/polish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ presentation: finalData }),
            });
            if (pr.ok) {
              const polished = await pr.json();
              finalData = normalizePresentationPayload(polished as Record<string, unknown>);
            }
          } catch (polishErr) {
            console.warn('Polish pass skipped:', polishErr);
          }

          if (finalData.slides?.length) {
            if (appendMode === 'append') {
              const existingSlides = usePresentationStore.getState().presentation?.slides || [];
              storeSetPresentation({ ...finalData, slides: [...existingSlides, ...finalData.slides] });
            } else {
              storeSetPresentation(finalData);
            }
          } else {
            throw new Error('JSON parsed but no slides array found.');
          }
        } catch (e) {
          console.error('Final JSON parse failed:', e, accumulatedText?.slice?.(-4000));
          throw new Error(
            'Could not parse the AI response into a deck. Try again or shorten your prompt.'
          );
        }

        setActivePanel('layers');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setEditorState({
          isGenerating: false,
          orchestrationPhase: '',
          activeModelLabel: '',
        });
      }
    } else {
      // Enhance Mode
      if (!selectedFile || isLoading) return;
      setEditorState({ isGenerating: true });
      setError('');

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

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
        {showSurvey && (
          <SurveyModal 
            onComplete={() => {
              setShowSurvey(false);
              // 1. Session bypass (Instant)
              if (user?.id) {
                localStorage.setItem(`survey_done_${user.id}`, 'true');
              }
              // 2. State update
              setProfileData((prev: Record<string, unknown> | null) => ({
                ...prev,
                survey_completed: true,
              }));
              executeGenerate('replace');
            }} 
          />
        )}
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
                You've used all 3 free AI presentations (lifetime limit on the Free plan). Upgrade to keep generating full cinematic decks.
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

      <div id="tour-generate" className="flex flex-col h-full min-h-0 min-w-0 bg-[#FAFAFA] text-black overflow-hidden relative">
        {/* Global Hidden Input for Technical Attachments */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pptx,.pdf,.docx,.txt" 
          className="hidden" 
        />
      <div className="shrink-0 flex flex-col border-b border-black/[0.06] bg-white/80 backdrop-blur-xl sticky top-0 z-20 min-w-0">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-2.5 min-w-0">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/5 border border-primary/10 flex items-center justify-center shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] shrink-0">
              <Wand2 size={19} className="text-primary" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 className="text-[16px] font-semibold text-neutral-900 tracking-tight truncate leading-tight">AI Generation</h2>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[0.14em] mt-1 leading-snug">
                Automatic cinematic generation
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl border border-black/[0.06] bg-white text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 hover:border-black/[0.08] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center justify-center"
              aria-label="Close panel"
            >
              <X size={17} strokeWidth={1.75} />
            </button>
          )}
        </div>
        
        <div className="px-4 sm:px-5 pb-3 min-w-0 overflow-x-auto scrollbar-none">
          <div className="p-1 rounded-2xl flex gap-0.5 bg-neutral-100/90 border border-black/[0.05] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] min-w-0">
            <button 
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex-1 text-[12px] font-semibold py-2.5 px-3 rounded-[10px] transition-all ${
                activeTab === 'create' 
                  ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]' 
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/50'
              }`}
            >
              Create New
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('enhance')}
              className={`flex-1 text-[12px] font-semibold py-2.5 px-3 rounded-[10px] transition-all ${
                activeTab === 'enhance' 
                  ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]' 
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/50'
              }`}
            >
              Enhancer
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-3 pb-24 space-y-2.5 min-h-0">
        {activeTab === 'create' ? (
          <>
            {/* Prompt Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.16em]">Your Vision</label>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-primary/80 uppercase tracking-[0.12em]">
                  <Mic size={11} strokeWidth={1.75} className="opacity-80" aria-hidden />
                  Voice input
                </span>
              </div>
              <div className="animated-border shadow-[0_24px_48px_-20px_rgba(59,130,246,0.22)]">
                <div className="bg-white p-4 flex flex-col min-h-[112px] transition-all rounded-[22px] relative overflow-hidden">
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
                    className="w-full flex-1 bg-transparent text-[16px] text-neutral-900 placeholder:text-neutral-300 resize-none focus:outline-none font-medium leading-relaxed min-h-[4.5rem]"
                  />

                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-black/[0.05]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 rounded-xl bg-neutral-50 border border-black/[0.07] flex items-center justify-center text-neutral-500 hover:text-primary hover:bg-primary/[0.06] hover:border-primary/25 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] group"
                        title="Attach reference"
                      >
                        <Plus size={17} strokeWidth={1.75} className="group-hover:rotate-90 transition-transform duration-200" />
                      </button>

                      <button
                        type="button"
                        onClick={toggleVoice}
                        title={isListening ? 'Stop listening' : 'Voice input'}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
                          isListening
                            ? 'bg-red-50 border-red-200/80 text-red-600 ring-2 ring-red-100'
                            : 'bg-neutral-50 border-black/[0.07] text-neutral-500 hover:text-primary hover:bg-primary/[0.06] hover:border-primary/25'
                        }`}
                      >
                        {isListening ? <MicOff size={17} strokeWidth={1.75} /> : <Mic size={17} strokeWidth={1.75} />}
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

                    <div className="text-[9px] font-semibold text-neutral-300 uppercase tracking-[0.18em]">
                      Orbstera AI
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CollapsibleSection
              title="Density (Slides)"
              summary={
                `${slideCount} slide${slideCount !== 1 ? 's' : ''}` +
                (!isPaid ? ' · Free max 5' : ` · max ${maxSlidesForPlan}`)
              }
              expanded={expandDensity}
              onToggle={() => setExpandDensity((v) => !v)}
            >
              <div className="flex flex-wrap gap-1.5">
                {SLIDE_COUNTS.filter((n) => n <= maxSlidesForPlan || !isPaid).map((n) => {
                  const isLocked = n > maxSlidesForPlan;
                  return (
                    <button
                      type="button"
                      key={n}
                      onClick={() => !isLocked && setSlideCount(n)}
                      title={isLocked ? `Upgrade to unlock ${n} slides` : `Generate ${n} slides`}
                      className={`min-w-[2.25rem] flex-1 h-9 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center border relative ${
                        isLocked
                          ? 'bg-neutral-100 border-black/[0.04] text-neutral-300 cursor-not-allowed'
                          : slideCount === n
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white border-black/[0.08] text-neutral-600 hover:border-primary/30'
                      }`}
                    >
                      {n}
                      {isLocked && <Crown size={8} className="absolute top-1 right-1 text-amber-500" strokeWidth={1.75} />}
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* ── TONE & STYLE ── */}
            <CollapsibleSection
              title="Tone & Style"
              summary={selectedTone}
              expanded={expandTone}
              onToggle={() => setExpandTone((v) => !v)}
            >
              <div className="grid grid-cols-2 gap-1.5">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTone(t.label)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      selectedTone === t.label
                        ? 'bg-primary/[0.07] border-primary/30 text-primary'
                        : 'bg-white border-black/[0.07] text-neutral-600 hover:border-primary/20 hover:bg-primary/[0.03]'
                    }`}
                  >
                    <t.Icon size={13} strokeWidth={1.75} className="shrink-0" />
                    <span className="text-[11px] font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── VISUAL THEME ── */}
            <CollapsibleSection
              title="Visual Theme"
              summary={selectedTheme}
              expanded={expandTheme}
              onToggle={() => setExpandTheme((v) => !v)}
            >
              <div className="flex flex-col gap-1.5">
                {THEME_OPTIONS.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setSelectedTheme(th.label)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      selectedTheme === th.label
                        ? 'bg-primary/[0.07] border-primary/30'
                        : 'bg-white border-black/[0.07] hover:border-primary/20 hover:bg-primary/[0.03]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex-shrink-0 ${th.preview}`} />
                    <div className="min-w-0">
                      <p className={`text-[11px] font-semibold ${selectedTheme === th.label ? 'text-primary' : 'text-neutral-800'}`}>{th.label}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{th.desc}</p>
                    </div>
                    {selectedTheme === th.label && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── LANGUAGE ── */}
            <CollapsibleSection
              title="Output Language"
              summary={selectedLanguage}
              expanded={expandLanguage}
              onToggle={() => setExpandLanguage((v) => !v)}
            >
              <div className="grid grid-cols-2 gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.label)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                      selectedLanguage === lang.label
                        ? 'bg-primary/[0.07] border-primary/30 text-primary'
                        : 'bg-white border-black/[0.07] text-neutral-600 hover:border-primary/20'
                    }`}
                  >
                    <span className="text-sm">{lang.flag}</span>
                    <span className="text-[11px] font-semibold truncate">{lang.label}</span>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── AI QUICK PROMPTS ── */}
            <div className="rounded-2xl border border-black/[0.07] bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-3 py-2 border-b border-black/[0.05]">
                <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.14em]">Quick Prompts</div>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => fillExample(ex)}
                    className="w-full text-left px-3 py-2 rounded-xl text-[11px] text-neutral-600 font-medium hover:bg-primary/[0.05] hover:text-primary transition-all leading-snug group flex items-start gap-2"
                  >
                    <span className="mt-0.5 text-neutral-300 group-hover:text-primary transition-colors flex-shrink-0">→</span>
                    <span className="line-clamp-2">{ex}</span>
                  </button>
                ))}
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
      <div className="shrink-0 px-4 sm:px-5 py-3.5 border-t border-black/[0.06] bg-white relative z-50">
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={(activeTab === 'create' ? !prompt.trim() : !selectedFile) || isLoading}
          className="group relative w-full h-[3.25rem] rounded-full bg-gradient-to-b from-[#5B7CFF] to-primary hover:from-primary hover:to-[#3d5ef0] text-white shadow-[0_8px_24px_-6px_rgba(59,130,246,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset] disabled:opacity-35 disabled:shadow-none disabled:from-neutral-200 disabled:to-neutral-300 transition-all duration-200 active:scale-[0.98] overflow-hidden"
        >
          <div className="relative flex items-center justify-center gap-2.5">
            {isLoading ? (
              <>
                <Loader2 size={19} className="animate-spin text-white/90" strokeWidth={1.75} />
                <span className="text-[14px] font-semibold tracking-tight">Orchestrating…</span>
              </>
            ) : (
              <>
                <span className="text-[14px] font-semibold tracking-tight">Generate Presentation</span>
                <ArrowRight size={18} strokeWidth={1.75} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 translate-x-[-100%]" />
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
