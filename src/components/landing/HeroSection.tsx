"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, X, Upload, Wand2, CheckCircle, Mic, MicOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeMode, setActiveMode] = useState<'create' | 'enhance' | 'voice'>('create');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [orbScale, setOrbScale] = useState(1);      // updated at 15fps to drive orb animation
  const [orbGlow, setOrbGlow] = useState(30);     // glow intensity
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const volumeRef = useRef(0);
  const rafScaleRef = useRef<number | null>(null);
  // Tracks USER INTENT to listen (vs browser's internal stop/start lifecycle)
  const shouldBeListeningRef = useRef(false);
  // Accumulates finalized text across session restarts (onend → restart wipes event.results)
  const accumulatedTextRef = useRef('');

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

    // Load Lottie Player Script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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

      // ── Orb scale update loop (Faster update) ──────────
      const updateScale = () => {
        const v = volumeRef.current; // 0-255
        
        // Map 0-255 to a healthy scale and glow
        const normalizedVol = v / 255;
        setOrbScale(1 + normalizedVol * 0.8); 
        setOrbGlow(30 + normalizedVol * 150);

        // Dynamically update Lottie speed
        const lottie = document.getElementById('voice-orb-lottie') as any;
        if (lottie) {
          // Force speed update via property
          lottie.speed = 1 + normalizedVol * 2.5; 
        }

        rafScaleRef.current = window.setTimeout(updateScale, 16); // ~60fps updates for smooth motion
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
    setOrbScale(1);
    setOrbGlow(30);
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
    <section className="relative w-full min-h-screen flex flex-col items-center pt-24 pb-12 overflow-hidden bg-gradient-to-b from-[#CDE4FF] via-white to-white">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
      />

      {/* Cinematic Animated Background - Enhanced Visibility */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Floating Cloud Blobs */}
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white blur-[100px] opacity-70"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 80, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] right-[-15%] w-[55%] h-[55%] rounded-full bg-blue-200/40 blur-[100px] opacity-80"
        />
        <motion.div
          animate={{
            y: [0, -150, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-15%] left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-100/40 blur-[120px]"
        />

        {/* Ambient Sparkle Particles (More Visible) */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5
            }}
            animate={{
              y: [null, "-40px", "40px"],
              opacity: [0.2, 0.7, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 4 + 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
            className="absolute w-1.5 h-1.5 bg-primary/40 rounded-full blur-[0.5px] shadow-[0_0_10px_rgba(71,59,240,0.3)]"
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-7xl px-6 w-full">
        {/* Premium Evolution Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="group relative flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 backdrop-blur-md border border-white/60 shadow-xl mb-8 md:mb-12 cursor-pointer hover:bg-white/60 transition-all active:scale-95"
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">v2.0 Live</span>
          </div>
          <span className="text-[11px] font-bold text-textMain/80 uppercase tracking-[0.1em]">Cinematic Engine Unleashed</span>
          <ArrowRight size={12} className="text-textMuted group-hover:translate-x-1 transition-transform" />

          {/* Subtle Glow Behind */}
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.div>

        {/* Headline (Updated to AI Presentations) */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-4 text-[#1A1A1A] text-balance max-w-4xl mx-auto"
        >
          The Future of <span className="text-primary">AI</span> <br />
          <span className="italic font-light">Presentations</span> is Here.
        </motion.h1>

        {/* Subhead (Compact) */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-textSecondary max-w-2xl mb-8 text-balance leading-snug font-medium opacity-90 mx-auto"
        >
          Generate professional slides from simple prompts in seconds.
        </motion.p>

        {/* AI Input Box (Fixed Overlaps) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-4xl mb-10 mx-auto"
        >
          {/* Mode Toggles */}
          <div className="flex items-center gap-2 mb-4 ml-4 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => { setActiveMode('create'); setIsListening(false); recognitionRef.current?.stop(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeMode === 'create' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Wand2 size={14} />
              <span>Create New</span>
            </button>
            <button
              onClick={() => { setActiveMode('enhance'); setIsListening(false); recognitionRef.current?.stop(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeMode === 'enhance' ? 'bg-primary text-white shadow-lg' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
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
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 ${activeMode === 'voice' ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-white/50 text-textSecondary hover:bg-white'}`}
            >
              <Mic size={14} />
              <span>Voice Protocol</span>
            </button>
          </div>

          <div className="animated-border shadow-[0_40px_100px_-20px_rgba(71,59,240,0.25)] group">
            <div className={`relative bg-white rounded-[1.45rem] flex flex-col p-6 transition-all overflow-hidden ${activeMode === 'voice' ? 'min-h-[360px]' : 'h-[220px]'}`}>

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
                          animate={{ scale: 2.2 + i * 0.4 + (orbScale - 1) * 3, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                          className="absolute rounded-full border border-primary/30"
                          style={{ width: 140, height: 140, left: '50%', top: '50%', marginLeft: -70, marginTop: -70 }}
                        />
                      ))}
                      
                      <motion.div
                        animate={{ 
                          scale: isListening ? orbScale : 1,
                          filter: isListening ? `drop-shadow(0 0 ${orbGlow/2}px rgba(71,59,240,0.4))` : 'none'
                        }}
                        className="relative w-40 h-40 flex items-center justify-center"
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
                      </motion.div>
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
                      placeholder="Describe your presentation topic..."
                      className="w-full flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-lg md:text-xl text-textMain placeholder:text-textMuted resize-none font-medium pr-10"
                    />
                    <button onClick={toggleListening} className={`absolute right-0 top-0 p-2 rounded-lg transition-all ${isListening ? 'text-primary bg-primary/10' : 'text-textMuted hover:bg-panel'}`}>
                      {isListening ? <Mic size={20} className="animate-pulse" /> : <MicOff size={20} className="opacity-40" />}
                    </button>
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

              {/* ── BOTTOM BAR (Social Proof + Right-side CTA for non-voice) ── */}
              <div className="mt-6 pt-4 border-t border-panel flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full border border-borderSubtle flex items-center justify-center text-textMuted hover:bg-hoverSurface transition-colors shadow-sm bg-white text-2xl font-light">+</button>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-panel overflow-hidden shadow-sm">
                          <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <span className="text-[12px] text-textMuted font-bold">10k+ creators</span>
                  </div>
                </div>

                {activeMode !== 'voice' && (
                  <button
                    onClick={handleGenerate}
                    disabled={activeMode === 'create' ? !prompt.trim() : !selectedFile}
                    className="group relative h-11 px-8 bg-primary text-white rounded-full text-[12px] font-bold shadow-xl hover:bg-primaryHover hover:scale-[1.02] transition-all active:scale-95 flex items-center gap-2 overflow-hidden disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
                  >
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                    />
                    <span className="relative z-10">
                      {activeMode === 'enhance' ? 'Enhance PPT' : 'Generate Presentation'}
                    </span>
                    <ArrowRight size={16} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* App Preview Mockup (Full High-Fidelity Editor Reconstruction) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-full max-w-[1400px] rounded-2xl border border-borderSubtle bg-white p-2 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] group overflow-hidden"
        >
          <div className="aspect-[16/10] w-full rounded-xl bg-panel border border-borderSubtle overflow-hidden relative flex flex-col">
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
                  <span className="text-sm font-bold text-textMain">Orvixes AI</span>
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

            <div className="flex-1 flex overflow-hidden">
              {/* 2. Slide Sidebar (Realistic) */}
              <div className="w-[200px] hidden md:flex flex-col border-r border-borderSubtle bg-white z-20">
                <div className="p-4 flex items-center justify-between border-b border-panel">
                  <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Slides 12</span>
                  <div className="w-5 h-5 rounded bg-panel flex items-center justify-center text-xs text-textMain font-bold">+</div>
                </div>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-[10px] font-bold text-textMuted mt-1">{i}</span>
                      <div className={`flex-1 aspect-video rounded-lg border-2 shadow-sm overflow-hidden ${i === 1 ? 'border-primary ring-2 ring-primary/10' : 'border-borderSubtle opacity-60'}`}>
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: i === 1 ? `url('/ai_presentation_slide_preview_1778145932652.png')` : 'none', backgroundColor: i !== 1 ? '#F1F1F1' : 'transparent' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Main Workspace Area */}
              <div className="flex-1 relative bg-panel flex flex-col">
                {/* Floating Canvas Toolbar */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-white/90 backdrop-blur-md border border-borderSubtle rounded-xl shadow-xl p-1.5 flex items-center gap-2">
                  {['↖', 'T', '🖼', '⬜', '○', '△', '📊'].map((icon, idx) => (
                    <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${idx === 0 ? 'bg-panel text-primary' : 'text-textMuted hover:bg-panel'}`}>
                      {icon}
                    </div>
                  ))}
                  <div className="w-[1px] h-4 bg-borderSubtle mx-1" />
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-textMuted hover:bg-panel">↩</div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-textMuted hover:bg-panel">↪</div>
                </div>

                {/* The Canvas */}
                <div className="flex-1 relative p-12 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 dot-grid opacity-30" />

                  <div className="relative w-full aspect-video rounded-xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] border border-white/20 overflow-hidden transform group-hover:scale-[1.01] transition-transform duration-700 bg-white flex items-center justify-center">
                    {/* Lottie VR Animation Enlarged */}
                    <div className="absolute inset-0 z-0 flex items-center justify-center">
                       {/* @ts-ignore */}
                       <lottie-player
                         src="/A Man with VR headset touches a holographic screen.json"
                         background="transparent"
                         speed="0.8"
                         style={{ width: '130%', height: '130%', transform: 'scale(1.1)' }}
                         loop
                         autoplay
                       />
                    </div>

                    {/* Animated AI Badge (Relocated to Top-Left) */}
                    <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-primary/20 shadow-xl flex items-center gap-2 z-20">
                      <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">AI Generated Content</span>
                    </div>

                    {/* Overlay Label for Demo (Repositioned) */}
                    <div className="absolute bottom-8 left-0 right-0 z-10 text-center">
                       <h3 className="text-3xl font-space-grotesk font-bold text-black mb-1 drop-shadow-sm">Cinematic Intelligence</h3>
                       <p className="text-black/40 text-[10px] uppercase tracking-[0.4em] font-black">Active Generation Protocol</p>
                    </div>
                  </div>

                  {/* Zoom Controls Overlay */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm border border-borderSubtle px-4 py-2 rounded-full shadow-lg flex items-center gap-4 text-[11px] font-bold text-textMain z-30">
                    <span className="opacity-50">−</span>
                    <span>70%</span>
                    <span className="opacity-50">+</span>
                  </div>
                </div>
              </div>

              {/* 4. AI Assistant Panel (Right) */}
              <div className="w-[280px] hidden lg:flex flex-col border-l border-borderSubtle bg-white z-20">
                <div className="p-4 border-b border-panel flex items-center justify-between">
                  <span className="text-xs font-bold text-textMain">AI Assistant</span>
                  <Sparkles size={14} className="text-primary" />
                </div>
                <div className="p-4 space-y-6">
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-textMuted uppercase">Your Prompt</div>
                    <div className="w-full h-24 bg-panel rounded-xl p-3 text-[11px] text-textMuted leading-relaxed">
                      Describe your presentation topic in a few words...
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-textMuted uppercase">Tone</div>
                    <div className="flex flex-wrap gap-2">
                      {['Professional', 'Creative', 'Minimal'].map((t, i) => (i === 0 ? (
                        <div key={t} className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-primary text-white border border-primary">
                          {t}
                        </div>
                      ) : (
                        <div key={t} className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-white text-textMain border border-borderSubtle">
                          {t}
                        </div>
                      )))}
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="w-full h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary text-[11px] font-bold">
                      Generate Presentation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
