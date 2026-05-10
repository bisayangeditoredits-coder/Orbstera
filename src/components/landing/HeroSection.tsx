"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, X, Upload, Wand2, CheckCircle, Mic, MicOff } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

export function HeroSection() {
  const [prompt, setPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeMode, setActiveMode] = useState<'create' | 'enhance' | 'voice'>('create');
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
  // Tracks USER INTENT to listen (vs browser's internal stop/start lifecycle)
  const shouldBeListeningRef = useRef(false);
  // Accumulates finalized text across session restarts (onend → restart wipes event.results)
  const accumulatedTextRef = useRef('');
  const typeAudioCtxRef = useRef<AudioContext | null>(null);

  const heroParticles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const s = (i + 1) * 0.618033988749895;
        return {
          id: i,
          x: `${((Math.sin(s) + 1) / 2) * 100}%`,
          y: `${((Math.cos(s * 1.7) + 1) / 2) * 100}%`,
          duration: 4 + (i % 5),
          delay: ((i * 3) % 10) * 0.35,
          baseOpacity: 0.25 + (i % 4) * 0.1,
        };
      }),
    []
  );

  const playTypingSound = () => {
    try {
      if (!typeAudioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        typeAudioCtxRef.current = new AudioCtx();
      }
      const ctx = typeAudioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const time = ctx.currentTime;

      // 1. Futuristic Glass UI "Sparkle/Tink" (High Frequency)
      const oscHigh = ctx.createOscillator();
      const gainHigh = ctx.createGain();
      oscHigh.type = 'sine'; // Pure glassy tone

      // High frequency for a premium, clean UI feel (randomized for natural variation)
      const highFreq = 1200 + Math.random() * 300;
      oscHigh.frequency.setValueAtTime(highFreq, time);
      oscHigh.frequency.exponentialRampToValueAtTime(highFreq * 0.6, time + 0.02);

      gainHigh.gain.setValueAtTime(0, time);
      gainHigh.gain.linearRampToValueAtTime(0.06, time + 0.002); // Very quiet and subtle
      gainHigh.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      oscHigh.connect(gainHigh);
      gainHigh.connect(ctx.destination);
      oscHigh.start(time);
      oscHigh.stop(time + 0.03);

      // 2. Soft Tactile Body (Low Frequency "Pop")
      const oscLow = ctx.createOscillator();
      const gainLow = ctx.createGain();
      oscLow.type = 'triangle'; // Gives a slightly warm, muted body

      // Pitch drops smoothly to give tactile feedback without harshness
      const lowFreq = 200 + Math.random() * 40;
      oscLow.frequency.setValueAtTime(lowFreq, time);
      oscLow.frequency.exponentialRampToValueAtTime(50, time + 0.04);

      gainLow.gain.setValueAtTime(0, time);
      gainLow.gain.linearRampToValueAtTime(0.12, time + 0.003); // Soft attack
      gainLow.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      oscLow.connect(gainLow);
      gainLow.connect(ctx.destination);
      oscLow.start(time);
      oscLow.stop(time + 0.05);

    } catch (e) {
      // Silently fail if audio is blocked or unsupported
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fil-PH'; // Set to Tagalog for better local accuracy

      recognitionRef.current.onresult = (event: any) => {
        // Scan ONLY NEW results since the last event (from event.resultIndex)
        let newFinal = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newFinal += event.results[i][0].transcript + ' ';
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        // Append any new finals to the persistent accumulator
        if (newFinal) {
          accumulatedTextRef.current += newFinal;
        }

        // Always update display: accumulated finals + current interim
        const fullText = accumulatedTextRef.current.trimEnd();
        setPrompt(fullText);
        setInterimTranscript(interimText);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          // Fatal — user blocked mic
          setSpeechError('Microphone access blocked. Enable it in browser settings.');
          shouldBeListeningRef.current = false;
          setIsListening(false);
          stopAudioAnalysis();
          setTimeout(() => setSpeechError(null), 5000);
        } else if (event.error === 'network') {
          setSpeechError('Network error. Check your connection.');
          setTimeout(() => setSpeechError(null), 4000);
          // Attempt restart
        } else if (event.error === 'no-speech') {
          // Very common — browser stops after short silence. Just restart silently.
          // Don't show error, don't kill the session.
        } else if (event.error === 'aborted') {
          // Triggered during our own .stop() call — ignore
        } else {
          console.warn('SpeechRecognition non-fatal error:', event.error);
        }
      };

      // KEY FIX: onend fires after EVERY utterance, even mid-session.
      // Auto-restart if the user hasn't clicked stop.
      recognitionRef.current.onend = () => {
        if (shouldBeListeningRef.current) {
          // Brief delay so the browser can reset its state before restarting
          setTimeout(() => {
            if (shouldBeListeningRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // Already started or another error — ignore
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };
    }

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
      analyserRef.current.fftSize = 256;            // lower fftSize for faster response
      analyserRef.current.smoothingTimeConstant = 0.5; // less smoothing for instant feel
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // ── Canvas draw loop (60 fps) ────────────
      const drawFrame = () => {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Better volume detection using peak
        let max = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > max) max = dataArray[i];
        }

        // Exponential smoothing for the volume ref
        volumeRef.current = volumeRef.current * 0.6 + max * 0.4;

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
        const v = volumeRef.current;
        const normalizedVol = v / 255;
        const el = orbVisualRef.current;

        if (el && isListeningRef.current) {
          const scale = 1 + normalizedVol * 0.8;
          const glow = 30 + normalizedVol * 150;
          el.style.transform = `scale(${scale})`;
          el.style.filter = `drop-shadow(0 0 ${glow / 2}px rgba(71,59,240,0.4))`;
        }

        const lottie = document.getElementById('voice-orb-lottie') as { speed?: number } | null;
        if (lottie) {
          lottie.speed = 1 + normalizedVol * 2.5;
        }

        rafScaleRef.current = window.setTimeout(updateScale, 32);
      };
      updateScale();

    } catch (err) {
      console.error('Error accessing microphone for analysis', err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (rafScaleRef.current) clearTimeout(rafScaleRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    volumeRef.current = 0;
    const el = orbVisualRef.current;
    if (el) {
      el.style.transform = 'scale(1)';
      el.style.filter = 'none';
    }
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError("Your browser doesn't support voice input. Try Chrome or Edge.");
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (isListening) {
      // User clicked STOP — set intent flag first so onend doesn't restart
      shouldBeListeningRef.current = false;
      recognitionRef.current?.stop();
      stopAudioAnalysis();
      setIsListening(false);
      setInterimTranscript(''); // clear partial text on stop
    } else {
      // Fresh session — reset accumulator so old text doesn't bleed in
      accumulatedTextRef.current = '';
      setSpeechError(null);
      shouldBeListeningRef.current = true;
      try {
        recognitionRef.current?.start();
        startAudioAnalysis();
        setIsListening(true);
      } catch (err) {
        console.error(err);
        shouldBeListeningRef.current = false;
        setIsListening(false);
      }
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
    // Determine the actual prompt to use (esp. for voice mode where final results might still be pending)
    const effectivePrompt = (prompt.trim() || interimTranscript.trim());

    if (activeMode === 'create' && !effectivePrompt) return;
    if (activeMode === 'voice' && !effectivePrompt) {
      setSpeechError("Please say something first.");
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }
    if (activeMode === 'enhance' && !selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    // Force stop listening to ensure all resources are released
    if (isListening) {
      shouldBeListeningRef.current = false;
      recognitionRef.current?.stop();
      stopAudioAnalysis();
      setIsListening(false);
    }

    const params = new URLSearchParams();
    if (effectivePrompt) params.set('prompt', effectivePrompt);
    if (selectedFile) params.set('fileName', selectedFile.name);
    params.set('mode', activeMode);

    router.push(`/editor?${params.toString()}`);
  };

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center pt-[max(6.25rem,calc(env(safe-area-inset-top)+5rem))] sm:pt-24 md:pt-28 pb-8 sm:pb-12 overflow-x-clip bg-gradient-to-b from-[#CDE4FF] via-white to-white">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
      />

      {/* Cinematic Animated Background - Restricted to screen size with smooth fade out */}
      <div
        className="absolute top-0 left-0 right-0 h-[110vh] z-0 pointer-events-none overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
        }}
      >
        {/* Mobile: static gradient only (lighter). md+: Lottie. */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-br from-[#B8D9FF] via-[#E8F4FF] to-white" aria-hidden />
        <div className="absolute inset-0 w-full h-full opacity-80 mix-blend-multiply hidden md:block">
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

        {/* Particles — desktop only (saves layout + paint on phones) */}
        {heroParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.x,
              y: p.y,
              opacity: p.baseOpacity,
            }}
            animate={{
              y: [null, "-40px", "40px"],
              opacity: [0.2, 0.65, 0.2],
              scale: [1, 1.45, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay,
            }}
            className="absolute w-1.5 h-1.5 rounded-full will-change-transform hidden md:block"
            style={{ background: 'radial-gradient(circle, rgba(71,59,240,0.8) 0%, transparent 80%)' }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-7xl w-full min-w-0 px-3 sm:px-6">
        {/* Premium Evolution Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="group relative flex flex-col xs:flex-row items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 rounded-2xl sm:rounded-full bg-white/40 backdrop-blur-md border border-white/60 shadow-xl mb-6 sm:mb-8 md:mb-12 cursor-pointer hover:bg-white/60 transition-all active:scale-95 max-w-[min(100%,22rem)] sm:max-w-none mx-auto"
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">v2.0 Live</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-textMain/80 uppercase tracking-[0.08em] leading-tight text-center">
            Cinematic Engine Unleashed
          </span>
          <ArrowRight size={12} className="text-textMuted group-hover:translate-x-1 transition-transform hidden xs:block shrink-0" />

          {/* Subtle Glow Behind */}
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.div>

        {/* Headline (Updated to AI Presentations) */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-[1.65rem] xs:text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-[80px] font-bold tracking-tight leading-[1.12] mb-3 sm:mb-4 text-[#1A1A1A] text-balance max-w-4xl mx-auto px-1 break-words"
        >
          The Future of <span className="text-primary">AI</span>{' '}
          <br className="hidden xs:block" />
          <span className="italic font-light">Presentations</span> is Here.
        </motion.h1>

        {/* Subhead (Compact) */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-base sm:text-lg md:text-[22px] text-textSecondary max-w-2xl mb-6 sm:mb-8 text-balance leading-snug font-medium opacity-90 mx-auto px-1"
        >
          Generate professional slides from simple prompts in seconds.
        </motion.p>

        {/* AI Input Box (Fixed Overlaps) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-4xl min-w-0 mb-8 sm:mb-10 mx-auto"
        >
          {/* Mode Toggles */}
          <div className="flex items-center gap-2 mb-3 sm:mb-4 w-full min-w-0 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 snap-x snap-mandatory">
            <button
              onClick={() => { setActiveMode('create'); setIsListening(false); recognitionRef.current?.stop(); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-widest transition-all shrink-0 snap-start ${activeMode === 'create' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Wand2 size={14} />
              <span>Create New</span>
            </button>
            <button
              onClick={() => { setActiveMode('enhance'); setIsListening(false); recognitionRef.current?.stop(); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-widest transition-all shrink-0 snap-start ${activeMode === 'enhance' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Upload size={14} />
              <span>Enhance PPT</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('voice');
                // Reset everything for a clean voice session
                setPrompt("");
                setInterimTranscript("");
                accumulatedTextRef.current = '';
                setTimeout(() => toggleListening(), 100);
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-widest transition-all shrink-0 snap-start ${activeMode === 'voice' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Mic size={14} />
              <span>Voice Protocol</span>
            </button>
          </div>

          <div className="animated-border shadow-[0_40px_100px_-20px_rgba(71,59,240,0.25)] group">
            <div className={`relative bg-white rounded-[1.45rem] flex flex-col p-4 sm:p-6 transition-all overflow-hidden ${activeMode === 'voice' ? 'min-h-[280px] sm:min-h-[360px]' : 'min-h-[200px] h-auto sm:h-[220px]'}`}>

              {/* ── MODE CONTENT ── */}
              <div className="flex-1 flex flex-col min-h-0">
                {activeMode === 'voice' ? (
                  <div className="flex flex-col items-center gap-5 pt-2">
                    {/* Intelligence Orb (Lottie AI Flow) */}
                    <div className="relative cursor-pointer" onClick={toggleListening}>
                      {isListening && [0, 1].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 2.2 + i * 0.4, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                          className="absolute rounded-full border border-primary/30 will-change-transform"
                          style={{ width: 140, height: 140, left: '50%', top: '50%', marginLeft: -70, marginTop: -70 }}
                        />
                      ))}

                      <div
                        ref={orbVisualRef}
                        className="relative w-40 h-40 flex items-center justify-center will-change-transform"
                        style={{ transform: 'scale(1)', filter: 'none' }}
                      >
                        {/* @ts-ignore */}
                        <lottie-player
                          id="voice-orb-lottie"
                          src="/ai animation Flow 1.json"
                          background="transparent"
                          speed="1"
                          style={{ width: '100%', height: '100%' }}
                          loop
                          autoplay
                        />

                        {!isListening && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                              <Mic size={24} className="text-primary" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transcript Box */}
                    <div className="w-full min-h-[3rem] max-h-[4.5rem] overflow-y-auto px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {(prompt || interimTranscript) ? (
                        <p className="text-sm font-medium text-slate-700 leading-relaxed break-words w-full text-center">
                          <span className="text-slate-800">{prompt}</span>
                          {interimTranscript && (
                            <span className="text-primary/60 italic"> {interimTranscript}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center">
                          {isListening ? (
                            <span className="text-primary animate-pulse">● Listening... speak now</span>
                          ) : 'Tap the orb to start speaking'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : activeMode === 'create' ? (
                  <div className="relative flex-1 flex flex-col">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
                          playTypingSound();
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      placeholder="Describe your presentation topic..."
                      className="w-full flex-1 min-h-[7rem] sm:min-h-0 bg-transparent border-none focus:ring-0 focus:outline-none text-base sm:text-lg md:text-xl text-textMain placeholder:text-textMuted resize-none font-medium pr-11 sm:pr-10 pb-14 sm:pb-10"
                    />
                    <button onClick={toggleListening} className={`absolute right-0 top-0 p-2 rounded-lg transition-all ${isListening ? 'text-primary bg-primary/10' : 'text-textMuted hover:bg-panel'}`}>
                      {isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} className="opacity-40" />}
                    </button>
                    {prompt.trim() && (
                      <button
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancing}
                        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-[11px] font-bold transition-all disabled:opacity-50"
                      >
                        {isEnhancing ? <span className="animate-pulse">Enhancing...</span> : <><Sparkles size={12} /> Enhance Prompt</>}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    {!selectedFile ? (
                      <div onClick={() => fileInputRef.current?.click()} className="w-full h-full border-2 border-dashed border-panel rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-primary/[0.02] transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Upload size={20} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-textMain">Upload PPTX</p>
                          <p className="text-[10px] text-textMuted uppercase tracking-wider mt-1">AI will re-design your slides</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-primary/[0.03] rounded-2xl border border-primary/10 border-dashed flex flex-col items-center justify-center gap-2 relative">
                        <CheckCircle size={24} className="text-primary animate-pulse" />
                        <p className="text-sm font-bold text-textMain">{selectedFile.name}</p>
                        <button onClick={() => setSelectedFile(null)} className="absolute top-4 right-4 p-2 text-textMuted hover:text-red-500 transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── SHARED ACTION CENTER (Centered only for Voice) ── */}
              {activeMode === 'voice' && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() && !interimTranscript.trim()}
                    className="group relative h-12 px-10 bg-primary text-white rounded-full text-[13px] font-bold shadow-xl hover:bg-primaryHover hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-2 overflow-hidden disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
                  >
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                    />
                    <Sparkles size={16} className="relative z-10 group-hover:rotate-12 transition-transform" />
                    <span className="relative z-10">Generate Presentation</span>
                    <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {/* ── BOTTOM BAR — stack on narrow screens so CTA never clips ── */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 w-full min-w-0">
                {activeMode !== 'voice' && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={activeMode === 'create' ? !prompt.trim() : !selectedFile}
                    className="group relative order-first sm:order-none w-full sm:w-auto min-h-11 px-5 sm:px-8 justify-center bg-primary text-white rounded-full text-[11px] sm:text-[12px] font-bold shadow-xl hover:bg-primaryHover hover:scale-[1.01] sm:hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center gap-2 overflow-hidden disabled:opacity-40 disabled:scale-100 disabled:shadow-none shrink-0"
                  >
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                    />
                    <span className="relative z-10 truncate max-w-[16rem] sm:max-w-none">
                      {activeMode === 'enhance' ? 'Enhance PPT' : 'Generate Presentation'}
                    </span>
                    <ArrowRight size={16} className="relative z-10 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto justify-between sm:justify-start">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-10 h-10 shrink-0 rounded-full border border-borderSubtle flex items-center justify-center text-textMuted hover:bg-hoverSurface transition-colors shadow-sm bg-white text-2xl font-light">+</button>
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="flex -space-x-3 shrink-0">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white bg-panel overflow-hidden shadow-sm">
                          <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[11px] sm:text-[12px] text-textMuted font-bold truncate">10k+ creators</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* App preview + Vimeo — hidden on small screens (weight + width) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="hidden md:block w-full max-w-[1400px] rounded-2xl border border-borderSubtle bg-white p-2 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] group overflow-hidden"
        >
          <div className="w-full rounded-xl bg-panel border border-borderSubtle overflow-hidden relative flex flex-col">
            {/* 1. Top Navigation Bar (High-Fidelity) */}
            <div className="h-12 border-b border-borderSubtle bg-white flex items-center justify-between px-4 z-30">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map(c => (
                    <div key={c} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                  ))}
                </div>
                <div className="h-4 w-[1px] bg-borderSubtle mx-2" />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-textMain">Orbstera</span>
                  <span className="text-xs text-textMuted font-medium ml-2 border-l border-borderSubtle pl-2">The Future of AI...</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-panel rounded-lg p-1 gap-1">
                  <div className="px-3 py-1 text-[11px] font-bold text-textMain bg-white rounded-md shadow-sm">Generate</div>
                  <div className="px-3 py-1 text-[11px] font-medium text-textMuted">Layers</div>
                </div>
                <div className="h-8 w-20 bg-panel rounded-full" />
                <div className="flex items-center gap-2 ml-4">
                  <div className="h-8 px-4 border border-borderSubtle rounded-full flex items-center text-[11px] font-bold text-textMain gap-2">
                    <span>Share</span>
                  </div>
                  <div className="h-8 px-4 bg-primary text-white rounded-full flex items-center text-[11px] font-bold gap-2">
                    <span>Export .pptx</span>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="w-full aspect-video bg-black relative overflow-hidden group"
              style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            >
              <iframe 
                src="https://player.vimeo.com/video/1190869944?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1" 
                frameBorder="0" 
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute top-0 left-0 w-full h-full" 
                title="Orbstera_Video"
              />
              {/* Invisible overlay to prevent scroll wheel trapping while leaving controls clickable */}
              <div className="absolute top-0 left-0 w-full h-[85%] z-10 cursor-default" />
            </div>
          </div>
        </motion.div>
      </div>
      <Script src="https://player.vimeo.com/api/player.js" strategy="lazyOnload" />
    </section>
  );
}
