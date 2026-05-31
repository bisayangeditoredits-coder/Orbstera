"use client";

import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, X, Upload, Wand2, CheckCircle, Mic, MicOff, ShieldCheck, Zap, Clock3, Star, FileText } from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { explainGetUserMediaError, explainRecognitionStartError } from '@/lib/mic-access';
import { OnboardingModal } from '@/components/dashboard/OnboardingModal';
import { useCredits } from '@/hooks/useCredits';
import { SlideCountDropdown } from '@/components/SlideCountDropdown';
import { DEFAULT_SLIDE_COUNT } from '@/lib/slide-count-options';


export function HeroSection() {
  const [isPending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeMode, setActiveMode] = useState<'create' | 'enhance' | 'voice' | 'notes'>('create');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [slideCount, setSlideCount] = useState<number>(DEFAULT_SLIDE_COUNT);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const { plan, loading: creditsLoading } = useCredits();
  const isFree = !creditsLoading && (plan === 'free' || !plan);
  const FREE_MAX_SLIDES = 10;

  useEffect(() => {
    // Show onboarding on homepage load for new visitors
    const hasSeen = localStorage.getItem('orbstera_planner_onboarding');
    if (!hasSeen) {
      const timer = setTimeout(() => setShowOnboarding(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  /** Pick best BCP-47 tag for Web Speech API from the user's preferred locales (no manual picker). */
  const resolvedSpeechLang = useMemo(() => {
    if (typeof navigator === 'undefined') return 'en-US';
    const list = [...(navigator.languages || []), navigator.language].filter(Boolean);
    for (const raw of list) {
      const tag = String(raw).trim().replace(/_/g, '-');
      const lower = tag.toLowerCase();
      // Filipino / Tagalog
      if (lower.startsWith('fil') || lower.startsWith('tl')) return 'fil-PH';
      if (lower.startsWith('en-ph')) return 'en-PH';
      // Preserve other regional Englishes (en-GB, en-AU, …) for accent/model matching
      const enMatch = /^en-([a-z]{2})$/i.exec(lower);
      if (enMatch) return `en-${enMatch[1].toUpperCase()}`;
      if (lower === 'en' || lower.startsWith('en-')) break;
    }
    return 'en-US';
  }, []);

  /** Mutable lang — falls back to en-US if the engine rejects the locale */
  const speechLangRef = useRef(resolvedSpeechLang);
  speechLangRef.current = resolvedSpeechLang;

  const voiceStartBusyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbVisualRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const volumeRef = useRef(0);
  const rafScaleRef = useRef<number | null>(null);
  const smoothedVolumeRef = useRef(0);
  const motionEnergyRef = useRef(0);
  const phaseRef = useRef(0);

  // Tracks USER INTENT to listen (vs browser's internal stop/start lifecycle)
  const shouldBeListeningRef = useRef(false);
  // Accumulates finalized text across session restarts (onend → restart wipes event.results)
  const accumulatedTextRef = useRef('');
  /** Mirrors latest interim segment for synchronous flush (e.g. navigate away while speaking). */
  const interimLiveRef = useRef('');
  const typeAudioCtxRef = useRef<AudioContext | null>(null);

  const flushInterimIntoAccumulator = () => {
    const t = interimLiveRef.current.trim();
    interimLiveRef.current = '';
    setInterimTranscript('');
    if (!t) return;
    const acc = accumulatedTextRef.current;
    const spacer = acc && !acc.endsWith(' ') ? ' ' : '';
    accumulatedTextRef.current = `${acc}${spacer}${t} `;
    setPrompt(accumulatedTextRef.current.replace(/\s+/g, ' ').trimEnd());
  };

  const stopVoiceSession = () => {
    shouldBeListeningRef.current = false;
    flushInterimIntoAccumulator();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* invalid state */
    }
    stopAudioAnalysis();
    setIsListening(false);
  };

  const ensureSpeechRecognition = (): any | null => {
    if (typeof window === 'undefined') return null;
    if (recognitionRef.current) return recognitionRef.current;

    // Prefer webkit* — matches Chromium / Safari stacks reliably
    const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    try {
      rec.maxAlternatives = 5;
    } catch {
      /* older engines */
    }
    rec.lang = speechLangRef.current;

    rec.onresult = (event: any) => {
      let newFinal = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        let best = result?.[0];
        if (result?.length && result.length > 1) {
          for (let j = 1; j < result.length; j++) {
            const cand = result[j];
            if (cand && typeof cand.confidence === 'number' && typeof best?.confidence === 'number') {
              if (cand.confidence > best.confidence) best = cand;
            }
          }
        }
        const text = String(best?.transcript || '').trim();
        if (!text) continue;
        if (result.isFinal) newFinal += `${text} `;
        else interimText += `${text} `;
      }

      if (newFinal) {
        accumulatedTextRef.current += newFinal;
      }

      const finals = accumulatedTextRef.current.replace(/\s+/g, ' ').trimEnd();
      const interimNorm = interimText.replace(/\s+/g, ' ').trim();
      interimLiveRef.current = interimNorm;
      const combined = [finals, interimNorm].filter(Boolean).join(' ');
      setPrompt(combined);
      setInterimTranscript(interimNorm);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone access blocked or in use by another app.');
        shouldBeListeningRef.current = false;
        setIsListening(false);
        stopAudioAnalysis();
        setTimeout(() => setSpeechError(null), 5000);
      } else if (event.error === 'language-not-supported') {
        if (speechLangRef.current !== 'en-US') {
          speechLangRef.current = 'en-US';
          if (recognitionRef.current) {
            try {
              recognitionRef.current.lang = 'en-US';
            } catch {
              /* noop */
            }
          }
          setSpeechError('Switched to English (US) for recognition.');
          setTimeout(() => setSpeechError(null), 3500);
        }
      } else if (event.error === 'network') {
        setSpeechError('Network error. Check your connection.');
        setTimeout(() => setSpeechError(null), 4000);
      } else if (event.error === 'no-speech') {
        /* common — session continues */
      } else if (event.error === 'aborted') {
        /* own .stop() */
      } else if (event.error === 'service-not-allowed') {
        setSpeechError('Voice recognition unavailable here. Use HTTPS or Chrome / Edge.');
        shouldBeListeningRef.current = false;
        setIsListening(false);
        stopAudioAnalysis();
        setTimeout(() => setSpeechError(null), 6000);
      } else {
        console.warn('SpeechRecognition non-fatal error:', event.error);
      }
    };

    rec.onend = () => {
      if (shouldBeListeningRef.current) {
        const delayMs = 220;
        setTimeout(() => {
          if (!shouldBeListeningRef.current || !recognitionRef.current) return;
          try {
            recognitionRef.current.lang = speechLangRef.current;
            recognitionRef.current.start();
          } catch {
            /* already running */
          }
        }, delayMs);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    return rec;
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





  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
    const wideEnough = window.matchMedia?.('(min-width: 1024px)')?.matches;
    if (reduceMotion || coarsePointer || !wideEnough) return;

    let raf: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      raf = null;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (lastX - cx) / cx; // -1..1
      const dy = (lastY - cy) / cy; // -1..1


    };

    const onMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (raf == null) raf = window.requestAnimationFrame(apply);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf != null) window.cancelAnimationFrame(raf);

    };
  }, []);



  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();

      // CRITICAL: Resume context for Chrome/Edge
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.82;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const freqArray = new Uint8Array(bufferLength);
      const timeArray = new Uint8Array(analyserRef.current.fftSize);

      // ── Audio envelope loop (smooth + stable) ────────────
      const drawFrame = () => {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        if (!analyserRef.current) return;

        analyserRef.current.getByteTimeDomainData(timeArray);
        analyserRef.current.getByteFrequencyData(freqArray);

        // Blend RMS energy (stable) + spectral peak (responsive)
        let sumSquares = 0;
        for (let i = 0; i < timeArray.length; i++) {
          const sample = (timeArray[i] - 128) / 128;
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / timeArray.length);

        let maxBand = 0;
        for (let i = 2; i < bufferLength; i++) {
          if (freqArray[i] > maxBand) maxBand = freqArray[i];
        }
        const peak = maxBand / 255;

        const target = Math.min(1, rms * 1.45 + peak * 0.85);
        const prev = smoothedVolumeRef.current;
        const attack = 0.42;
        const release = 0.14;
        const next = target > prev
          ? prev + (target - prev) * attack
          : prev + (target - prev) * release;

        smoothedVolumeRef.current = next;
        motionEnergyRef.current = motionEnergyRef.current * 0.88 + Math.abs(next - prev) * 1.8;
        volumeRef.current = next;

        // Draw on canvas (if visible)
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // ... (keeping canvas logic just in case, but orb is primary now)
          }
        }
      };
      drawFrame();

      // ── Orb visuals via refs (avoids 60 React re-renders/sec) ──────────
      const updateScale = () => {
        const level = volumeRef.current;
        const energy = Math.min(1, motionEnergyRef.current);
        const el = orbVisualRef.current;
        phaseRef.current += 0.09 + energy * 0.08;
        const wave = Math.sin(phaseRef.current);
        const microPulse = wave * 0.018 * (0.3 + level);

        if (el && isListeningRef.current) {
          const scale = 1 + level * 0.42 + energy * 0.1 + microPulse;
          const tiltX = Math.sin(phaseRef.current * 0.72) * (2 + level * 3);
          const tiltY = Math.cos(phaseRef.current * 0.84) * (2 + level * 3.2);
          const glow = 26 + level * 95 + energy * 42;
          const glowOuter = 60 + level * 120;
          el.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(${scale.toFixed(4)}) translateZ(0)`;
          el.style.filter = `drop-shadow(0 0 ${Math.round(glow)}px rgba(71,59,240,0.36)) drop-shadow(0 0 ${Math.round(glowOuter)}px rgba(56,189,248,0.18)) saturate(${(1 + level * 0.32).toFixed(2)}) contrast(${(1 + level * 0.08).toFixed(2)})`;
        } else if (el) {
          // Smoothly settle instead of snapping when listening toggles off.
          el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)';
          el.style.filter = 'drop-shadow(0 0 14px rgba(0,9,250,0.12))';
        }

        const lottie = document.getElementById('voice-orb-lottie') as { speed?: number } | null;
        if (lottie) {
          lottie.speed = 0.9 + level * 1.8 + energy * 0.8;
        }

        rafScaleRef.current = requestAnimationFrame(updateScale);
      };
      updateScale();

    } catch (err) {
      console.error('Error accessing microphone for analysis', err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (rafScaleRef.current) cancelAnimationFrame(rafScaleRef.current);
    animationFrameRef.current = null;
    rafScaleRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    volumeRef.current = 0;
    smoothedVolumeRef.current = 0;
    motionEnergyRef.current = 0;
    phaseRef.current = 0;
    const el = orbVisualRef.current;
    if (el) {
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)';
      el.style.filter = 'drop-shadow(0 0 14px rgba(0,9,250,0.12))';
    }
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleListening = async () => {
    const rec = ensureSpeechRecognition();
    if (!rec) {
      setSpeechError("Your browser doesn't support voice input. Try Chrome or Edge.");
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setSpeechError('Voice Protocol needs HTTPS (or localhost).');
      setTimeout(() => setSpeechError(null), 6000);
      return;
    }

    if (isListening) {
      stopVoiceSession();
      return;
    }

    if (voiceStartBusyRef.current) return;
    voiceStartBusyRef.current = true;

    accumulatedTextRef.current = '';
    interimLiveRef.current = '';
    setPrompt('');
    setInterimTranscript('');
    setSpeechError(null);
    speechLangRef.current = resolvedSpeechLang;

    try {
      try {
        rec.lang = speechLangRef.current;
      } catch {
        /* noop */
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setSpeechError('Microphone is not available in this browser. Use Chrome or Edge.');
        setTimeout(() => setSpeechError(null), 6000);
        return;
      }

      // 1. Permission prompt + brief capture (helps Windows audio + Chrome)
      let tempStream: MediaStream;
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (gumErr) {
        console.error('[Voice] getUserMedia:', gumErr);
        shouldBeListeningRef.current = false;
        stopAudioAnalysis();
        setIsListening(false);
        const hint = explainGetUserMediaError(gumErr);
        setSpeechError(
          hint || 'Could not open the microphone. Check browser and system settings, then try again.'
        );
        setTimeout(() => setSpeechError(null), 7000);
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
      try {
        rec.start();
      } catch (recErr) {
        console.error('[Voice] recognition.start:', recErr);
        shouldBeListeningRef.current = false;
        stopAudioAnalysis();
        setIsListening(false);
        const hint = explainRecognitionStartError(recErr);
        setSpeechError(
          hint || 'Speech recognition failed to start. Wait a moment and try again.'
        );
        setTimeout(() => setSpeechError(null), 6000);
        return;
      }

      setIsListening(true);

      setTimeout(() => {
        if (shouldBeListeningRef.current) {
          startAudioAnalysis().catch((err) => console.warn('Audio analysis skipped due to lock:', err));
        }
      }, 800);
    } finally {
      voiceStartBusyRef.current = false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = () => {
    if (activeMode === 'enhance' && !selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    // Stop + flush first so effectivePrompt reflects everything heard (state updates async)
    if (isListening) {
      stopVoiceSession();
    } else {
      flushInterimIntoAccumulator();
    }

    const effectivePrompt =
      accumulatedTextRef.current.replace(/\s+/g, ' ').trim() ||
      prompt.trim() ||
      interimTranscript.trim();

    if ((activeMode === 'create' || activeMode === 'notes') && !effectivePrompt) return;
    if (activeMode === 'voice' && !effectivePrompt) {
      setSpeechError("Please say something first.");
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }

    if (activeMode === 'notes') {
      sessionStorage.setItem('orbstera_notes_import', effectivePrompt);
      startTransition(() => {
        router.push(`/planner?topic=Imported+Notes&slides=${slideCount}`);
      });
      return;
    }

    if (activeMode === 'create' || activeMode === 'voice') {
      startTransition(() => {
        router.push(`/planner?topic=${encodeURIComponent(effectivePrompt)}&slides=${slideCount}`);
      });
      return;
    }

    const params = new URLSearchParams();
    if (effectivePrompt) params.set('prompt', effectivePrompt);
    if (selectedFile) params.set('fileName', selectedFile.name);
    params.set('mode', activeMode);

    startTransition(() => {
      router.push(`/editor?${params.toString()}`);
    });
  };


  return (
    <section className="relative w-full min-h-screen flex flex-col items-center pt-8 sm:pt-12 md:pt-14 pb-8 sm:pb-12 overflow-x-clip bg-gradient-to-b from-[#e6e8ff] via-white to-white">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
      />

      {/* Cinematic Animated Background */}
      <div
        className="absolute top-0 left-0 right-0 h-[110vh] z-0 pointer-events-none overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
        }}
      >
        {/* Mobile: static gradient only (lighter). md+: Lottie. */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-br from-[#dbe1ff] via-[#f0f2ff] to-white" aria-hidden />
        <div className="absolute inset-0 w-full h-full opacity-80 mix-blend-multiply hidden md:block blur-[60px] will-change-transform transform-gpu">
          {/* @ts-ignore */}
          <lottie-player
            src="/Background gradient.json"
            background="transparent"
            speed="0.5"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.1)' }}
            loop
            autoplay
            preserveAspectRatio="xMidYMid slice"
          />
        </div>

        {/* Ambient Overlay (Lighter, NO EXPENSIVE BACKDROP-BLUR) */}
        <div className="absolute inset-0 bg-white/20 z-[2]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-7xl w-full min-w-0 px-3 sm:px-6">
        {/* Premium Evolution Badge */}
        <div
          className="group relative flex flex-col xs:flex-row items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 rounded-2xl sm:rounded-full bg-white/40  border border-white/60 shadow-xl mb-6 sm:mb-8 md:mb-12 cursor-pointer hover:bg-white/60 transition-all active:scale-95 max-w-[min(100%,22rem)] sm:max-w-none mx-auto"
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">v2.0 Live</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-textMain/80 uppercase tracking-[0.08em] leading-tight text-center">
            Cinematic Engine Unleashed
          </span>
          <ArrowRight
            size={12}
            strokeWidth={1.5}
            className="text-textMuted group-hover:translate-x-1 transition-transform hidden xs:block shrink-0"
          />
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Original Headline */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[80px] font-bold tracking-tighter leading-[1.1] mb-6 text-[#1A1A1A] text-balance max-w-4xl mx-auto px-4"
        >
          The Future of <span className="text-primary">AI</span> <span className="italic font-light">Presentations</span> is Here.
        </h1>

        {/* Original Subhead */}
        <p
          className="text-base sm:text-lg md:text-xl text-textSecondary max-w-2xl mb-10 text-balance leading-relaxed font-medium mx-auto px-4"
        >
          Generate professional slides from simple prompts in seconds.
        </p>

        {/* AI Input Card — Gamma style */}
        <div
          className="w-full max-w-4xl min-w-0 mb-8 sm:mb-10 mx-auto -mt-2 sm:-mt-3"
        >
          {/* Original Mode Toggles */}
          <div className="flex items-center gap-2 mb-3 sm:mb-4 w-full min-w-0 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 snap-x snap-mandatory">
            <button
              type="button"
              onClick={() => { stopVoiceSession(); setActiveMode('create'); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-medium uppercase tracking-wide sm:tracking-widest transition-all shrink-0 snap-start ${activeMode === 'create' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Wand2 size={14} strokeWidth={1.5} />
              <span>Create New</span>
            </button>
            <button
              type="button"
              onClick={() => { stopVoiceSession(); setActiveMode('notes'); setPrompt(''); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-medium uppercase tracking-wide sm:tracking-widest transition-all shrink-0 snap-start ${activeMode === 'notes' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <FileText size={14} strokeWidth={1.5} />
              <span>Import Notes</span>
            </button>
            <button
              type="button"
              onClick={() => { stopVoiceSession(); setActiveMode('enhance'); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-medium uppercase tracking-wide sm:tracking-widest transition-all shrink-0 snap-start ${activeMode === 'enhance' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Upload size={14} strokeWidth={1.5} />
              <span>Enhance PPT</span>
            </button>
            <button
              type="button"
              onClick={() => { stopVoiceSession(); setActiveMode('voice'); setPrompt(''); setInterimTranscript(''); interimLiveRef.current = ''; accumulatedTextRef.current = ''; }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-medium uppercase tracking-wide sm:tracking-widest transition-all shrink-0 snap-start ${activeMode === 'voice' ? 'bg-primary text-white shadow-[0_0_20px_rgba(0,9,250,0.4)]' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Mic size={14} strokeWidth={1.5} />
              <span>Voice Protocol</span>
            </button>
          </div>

          {(activeMode === 'create' || activeMode === 'notes' || activeMode === 'voice') && (
            <SlideCountDropdown
              slideCount={slideCount}
              onChange={setSlideCount}
              isFree={isFree}
              className="mb-4"
            />
          )}

          {/* Original Animated Border Input */}
          <div className="animated-border shadow-[0_40px_100px_-20px_rgba(0,9,250,0.25)] group">
            <div className={`relative bg-white rounded-[1.45rem] flex flex-col p-4 sm:p-6 transition-all overflow-hidden ${activeMode === 'voice' ? 'min-h-[240px] sm:min-h-[300px] lg:min-h-[320px]' : 'min-h-[200px] h-auto sm:h-[220px]'}`}>
              {/* subtle premium sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/10 to-transparent" />

              {/* ── MODE CONTENT ── */}
              <div className="flex-1 flex flex-col min-h-0">
                {activeMode === 'voice' ? (
                  <div className="flex flex-col items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
                    {/* Intelligence Orb (Lottie AI Flow) — native button so taps always reach the handler */}
                    <button
                      type="button"
                      aria-pressed={isListening}
                      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                      className="relative cursor-pointer inline-flex border-0 bg-transparent p-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      onClick={toggleListening}
                    >
                      {isListening && [0, 1].map((i) => (
                        <div
                          key={i}
                          className="absolute rounded-full border border-primary/30 will-change-transform"
                          style={{ width: 132, height: 132, left: '50%', top: '50%', marginLeft: -66, marginTop: -66 }}
                        />
                      ))}

                      <div
                        ref={orbVisualRef}
                        className="relative w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 flex items-center justify-center will-change-transform"
                        style={{
                          transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)',
                          filter: 'drop-shadow(0 0 14px rgba(0,9,250,0.12))',
                        }}
                      >
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-cyan-300/20 blur-xl pointer-events-none" />
                        <div className="absolute inset-[18%] rounded-full border border-primary/20 pointer-events-none" />
                        {/* @ts-ignore */}
                        <lottie-player
                          id="voice-orb-lottie"
                          src="/ai animation Flow 1.json"
                          background="transparent"
                          speed="1"
                          style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                          loop
                          autoplay
                        />

                        {!isListening && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-primary/10  flex items-center justify-center border border-white/20">
                              <Mic size={24} strokeWidth={1.5} className="text-primary" />
                            </div>
                          </div>
                        )}

                      </div>
                    </button>

                    {/* Transcript Box — prompt already includes live interim while listening */}
                    <div className="w-full min-h-[2.5rem] max-h-[3.25rem] sm:max-h-[3.75rem] overflow-y-auto px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {prompt.trim() ? (
                        <p className="text-[13px] sm:text-sm font-medium text-slate-800 leading-relaxed break-words w-full text-center">
                          {prompt}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center">
                          {isListening ? (
                            <span className="text-primary animate-pulse">â— Listening... speak now</span>
                          ) : 'Tap the orb to start speaking'}
                        </p>
                      )}
                    </div>

                    {speechError ? (
                      <p className="text-[11px] text-red-600 font-medium text-center px-3 leading-snug max-w-md" role="alert">
                        {speechError}
                      </p>
                    ) : null}
                  </div>
                ) : activeMode === 'create' ? (
                  <div className="relative flex-1 flex flex-col">
                    <textarea
                      ref={promptInputRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      placeholder="Describe your presentation topic..."
                      className="w-full flex-1 min-h-[7rem] sm:min-h-0 bg-transparent border-none focus:ring-0 focus:outline-none text-base sm:text-lg md:text-xl text-textMain placeholder:text-textMuted resize-none font-medium pr-11 sm:pr-10 pb-2"
                    />
                    <button onClick={toggleListening} className={`absolute right-0 top-0 p-2 rounded-lg transition-all ${isListening ? 'text-primary bg-primary/10' : 'text-textMuted hover:bg-panel'}`}>
                      {isListening ? (
                        <Mic size={20} strokeWidth={1.5} className="animate-pulse" />
                      ) : (
                        <MicOff size={20} strokeWidth={1.5} className="opacity-40" />
                      )}
                    </button>
                  </div>
                ) : activeMode === 'notes' ? (
                  <div className="relative flex-1 flex flex-col">
                    <textarea
                      ref={promptInputRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      placeholder="Paste your Google Docs, Notion notes, or lesson plan here (max 1000 words)..."
                      className="w-full flex-1 min-h-[7rem] sm:min-h-0 bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] sm:text-[15px] md:text-[16px] text-textMain placeholder:text-textMuted resize-none font-medium pb-2"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    {!selectedFile ? (
                      <div onClick={() => fileInputRef.current?.click()} className="w-full h-full border-2 border-dashed border-panel rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/[0.02] transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Upload size={20} strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-textMain">Upload PPTX</p>
                          <p className="text-[10px] text-textMuted uppercase tracking-wider mt-1">AI will re-design your slides</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-primary/[0.03] rounded-2xl border border-primary/10 border-dashed flex flex-col items-center justify-center gap-2 relative">
                        <CheckCircle size={24} strokeWidth={1.5} className="text-primary animate-pulse" />
                        <p className="text-sm font-bold text-textMain">{selectedFile.name}</p>
                        <button onClick={() => setSelectedFile(null)} className="absolute top-4 right-4 p-2 text-textMuted hover:text-red-500 transition-colors">
                          <X size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── SHARED ACTION CENTER (Centered only for Voice) ── */}
              {activeMode === 'voice' && (
                <div className="flex justify-center mt-3 sm:mt-5">
                  <button
                    onClick={handleGenerate}
                    disabled={(!prompt.trim() && !interimTranscript.trim()) || isPending}
                    className="group relative h-11 sm:h-12 px-8 sm:px-10 bg-primary text-white rounded-full text-[12px] sm:text-[13px] font-medium shadow-xl hover:bg-primaryHover hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-2 overflow-hidden disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                    />
                    {isPending ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin relative z-10" />
                    ) : (
                      <Sparkles
                        size={16}
                        strokeWidth={1.5}
                        className="relative z-10 group-hover:rotate-12 transition-transform"
                      />
                    )}
                    <span className="relative z-10">{isPending ? 'Starting...' : 'Generate Presentation'}</span>
                    <ArrowRight
                      size={16}
                      strokeWidth={1.5}
                      className="relative z-10 group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
              )}

              {activeMode !== 'voice' && (
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end shrink-0 w-full min-w-0">
                  {activeMode === 'create' && prompt.trim() ? (
                    <button
                      type="button"
                      onClick={handleEnhancePrompt}
                      disabled={isEnhancing}
                      className="group relative overflow-hidden flex items-center justify-center gap-1.5 px-5 sm:px-6 min-h-11 rounded-full text-[11px] sm:text-[12px] font-medium text-primary bg-gradient-to-b from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border border-primary/20 hover:border-primary/40 shadow-[0_2px_10px_rgba(0,9,250,0.05)] hover:shadow-[0_4px_20px_rgba(0,9,250,0.15)] transition-all duration-300 disabled:opacity-50 shrink-0 w-full sm:w-auto sm:mr-auto active:scale-[0.97]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-20deg] translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-out" />
                      {isEnhancing ? (
                        <span className="relative z-10 animate-pulse">Enhancing...</span>
                      ) : (
                        <>
                          <Sparkles
                            size={14}
                            strokeWidth={1.5}
                            className="relative z-10 group-hover:rotate-12 transition-transform"
                          />{' '}
                          <span className="relative z-10">Enhance Prompt</span>
                        </>
                      )}
                    </button>
                  ) : null}
                  <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[12rem]">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={((activeMode === 'create' || activeMode === 'notes') ? !prompt.trim() : !selectedFile) || isPending}
                      className="group relative w-full sm:w-auto min-h-11 px-5 sm:px-8 justify-center bg-primary text-white rounded-full text-[11px] sm:text-[12px] font-medium shadow-xl hover:bg-primaryHover hover:scale-[1.01] sm:hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center gap-2 overflow-hidden disabled:opacity-40 disabled:scale-100 disabled:shadow-none shrink-0"
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                      />
                      {isPending && (
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin relative z-10" />
                      )}
                      <span className="relative z-10 truncate max-w-[16rem] sm:max-w-none">
                        {isPending ? 'Starting...' : activeMode === 'enhance' ? 'Enhance PPT' : activeMode === 'notes' ? 'Generate from Notes' : 'Generate Deck'}
                      </span>
                      <ArrowRight
                        size={16}
                        strokeWidth={1.5}
                        className="relative z-10 shrink-0 group-hover:translate-x-1 transition-transform"
                      />
                    </button>

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* App preview + Vimeo — hidden on small screens (weight + width) */}
        <div
          className="hidden md:block w-full max-w-[1400px] rounded-2xl border border-borderSubtle bg-white p-2 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] group overflow-hidden"
        >
          <div className="w-full rounded-xl bg-panel border border-borderSubtle overflow-hidden relative flex flex-col">
            {/* 1. Top Navigation Bar (High-Fidelity Match of TopBar) */}
            <div className="h-[52px] border-b border-black/[0.06] bg-[#FAFAFA]/95 flex items-center justify-between px-4 z-30 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
              
              {/* Left Side: Window Controls, Logo, Title, Stats */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 mr-1">
                  {['bg-[#FF5F56]', 'bg-[#FFBD2E]', 'bg-[#27C93F]'].map(c => (
                    <div key={c} className={`w-2.5 h-2.5 rounded-full ${c} border border-black/10`} />
                  ))}
                </div>
                
                <img src="/logo.png.png" alt="Orbstera" className="h-5 w-auto object-contain" />
                
                <div className="font-semibold text-[13px] leading-tight text-neutral-800 ml-1">
                  The Future of AI...
                </div>

                <div className="hidden lg:flex items-center gap-2.5 rounded-full border border-black/[0.05] bg-neutral-100/80 px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ml-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold tabular-nums text-neutral-700">12</span>
                    <span className="text-[9px] text-neutral-400 uppercase tracking-[0.12em] font-medium">slides</span>
                  </div>
                </div>
              </div>

              {/* Center Side: Panel Tabs */}
              <div className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
                <div className="inline-flex items-center gap-0.5 rounded-2xl border border-black/[0.06] bg-neutral-100/85 p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 px-3.5 h-[34px] rounded-[10px] text-[12px] font-semibold bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)]">
                    <Wand2 size={14} className="text-primary" strokeWidth={1.5} />
                    <span>Generate</span>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 h-[34px] rounded-[10px] text-[12px] font-semibold text-neutral-500">
                    <span>Layers</span>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 h-[34px] rounded-[10px] text-[12px] font-semibold text-neutral-500">
                    <span>Design</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="flex items-center gap-2">
                <div className="h-[36px] px-3.5 text-neutral-800 bg-white border border-black/[0.08] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center text-[13px] font-semibold">
                  Share
                </div>
                <div className="h-[36px] px-3.5 text-neutral-800 bg-white border border-black/[0.08] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-2 text-[13px] font-semibold">
                  <div className="w-0.5 h-3 bg-primary rounded-full"></div>
                  Present
                </div>
                
                <div className="w-px h-[22px] bg-black/[0.06] mx-0.5" />
                
                <div className="h-[36px] px-4 flex items-center gap-2 text-[13px] font-semibold text-white bg-gradient-to-b from-[#333bfa] to-primary rounded-full shadow-[0_4px_14px_-4px_rgba(0,9,250,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset]">
                  Export .pptx
                </div>
              </div>
            </div>

            <div
              className="w-full aspect-video bg-black relative overflow-hidden group"
              style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            >
              <video
                src="https://pub-84b1c8192311490baf3e9bba37bcbe13.r2.dev/720-ORBSTERA-VIDEO.compressed.mp4"
                poster="/editor_preview.png"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="none"
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>


      {/* YouTube uses no external SDK — no extra script needed */}
      
      {/* Super simple light mode divider */}
      <div className="w-full h-px bg-black/[0.04] my-10 max-w-7xl mx-auto" />

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          localStorage.setItem('orbstera_planner_onboarding', 'true');
          setShowOnboarding(false);
        }}
        onConfirm={() => {
          localStorage.setItem('orbstera_planner_onboarding', 'true');
          setShowOnboarding(false);
          // Focus the prompt box when they click "Start Creating"
          setTimeout(() => promptInputRef.current?.focus(), 100);
        }}
      />
    </section>
  );
}
