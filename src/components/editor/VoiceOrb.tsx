'use client';

import { useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceOrbProps {
  isListening: boolean;
  transcript?: string;
  onStop: () => void;
}

/**
 * Voice overlay orb: starts a delayed second mic stream for level analysis only
 * (same pattern as HeroSection) so Web Speech API is not starved, then drives
 * Lottie speed + CSS transform smoothly from RMS / spectral energy.
 */
export function VoiceOrb({ isListening, transcript, onStop }: VoiceOrbProps) {
  const lottieId = useId().replace(/:/g, '');
  const orbVisualRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rafScaleRef = useRef<number | null>(null);
  const volumeRef = useRef(0);
  const smoothedVolumeRef = useRef(0);
  const motionEnergyRef = useRef(0);
  const phaseRef = useRef(0);
  const scheduledAnalysisRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = 'lottie-player-script';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const stopAudioAnalysis = () => {
    if (scheduledAnalysisRef.current) {
      clearTimeout(scheduledAnalysisRef.current);
      scheduledAnalysisRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (rafScaleRef.current) cancelAnimationFrame(rafScaleRef.current);
    animationFrameRef.current = null;
    rafScaleRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    volumeRef.current = 0;
    smoothedVolumeRef.current = 0;
    motionEnergyRef.current = 0;
    phaseRef.current = 0;
    const el = orbVisualRef.current;
    if (el) {
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)';
      el.style.filter = 'drop-shadow(0 0 14px rgba(71,59,240,0.14))';
    }
    const lottie = document.getElementById(`voice-orb-lottie-${lottieId}`) as
      | { speed?: number; setSpeed?: (n: number) => void }
      | null;
    if (lottie) {
      try {
        lottie.setSpeed?.(0.65);
      } catch {
        /* noop */
      }
      lottie.speed = 0.65;
    }
  };

  const startAudioAnalysis = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    audioContextRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const freqArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(analyser.fftSize);

    const drawFrame = () => {
      animationFrameRef.current = requestAnimationFrame(drawFrame);
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(timeArray);
      analyserRef.current.getByteFrequencyData(freqArray);

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

      const target = Math.min(1, rms * 1.5 + peak * 0.88);
      const prev = smoothedVolumeRef.current;
      const attack = 0.38;
      const release = 0.12;
      const next =
        target > prev ? prev + (target - prev) * attack : prev + (target - prev) * release;
      smoothedVolumeRef.current = next;
      motionEnergyRef.current = motionEnergyRef.current * 0.86 + Math.abs(next - prev) * 1.85;
      volumeRef.current = next;
    };
    drawFrame();

    const updateScale = () => {
      rafScaleRef.current = requestAnimationFrame(updateScale);
      const level = volumeRef.current;
      const energy = Math.min(1, motionEnergyRef.current);
      const el = orbVisualRef.current;
      phaseRef.current += 0.085 + energy * 0.09;
      const wave = Math.sin(phaseRef.current);
      const microPulse = wave * 0.02 * (0.28 + level);

      if (el && isListeningRef.current) {
        // Keep pulse modest so the orb stays inside the panel (no clipping).
        const scale = 1 + level * 0.36 + energy * 0.09 + microPulse * 0.85;
        const tiltX = Math.sin(phaseRef.current * 0.72) * (1.8 + level * 2.8);
        const tiltY = Math.cos(phaseRef.current * 0.84) * (1.8 + level * 2.9);
        const glow = 28 + level * 100 + energy * 48;
        const glowOuter = 64 + level * 125;
        el.style.transform = `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(${scale.toFixed(4)}) translateZ(0)`;
        el.style.filter = `drop-shadow(0 0 ${Math.round(glow)}px rgba(79,70,229,0.38)) drop-shadow(0 0 ${Math.round(glowOuter)}px rgba(56,189,248,0.2)) saturate(${(1 + level * 0.35).toFixed(2)}) contrast(${(1 + level * 0.09).toFixed(2)})`;
      } else if (el) {
        el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)';
        el.style.filter = 'drop-shadow(0 0 14px rgba(71,59,240,0.14))';
      }

      const lottie = document.getElementById(`voice-orb-lottie-${lottieId}`) as
        | { speed?: number; setSpeed?: (n: number) => void }
        | null;
      if (lottie && isListeningRef.current) {
        const spd = 0.85 + level * 2.1 + energy * 0.9;
        try {
          lottie.setSpeed?.(spd);
        } catch {
          /* noop */
        }
        lottie.speed = spd;
      }
    };
    updateScale();
  };

  useEffect(() => {
    if (!isListening) {
      stopAudioAnalysis();
      return;
    }

    scheduledAnalysisRef.current = setTimeout(() => {
      scheduledAnalysisRef.current = null;
      if (isListeningRef.current) {
        startAudioAnalysis().catch((err) => console.warn('[VoiceOrb] Audio analysis skipped:', err));
      }
    }, 750);

    return () => {
      stopAudioAnalysis();
    };
  }, [isListening, lottieId]);

  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          key="voice-orb"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-20 rounded-[22px] bg-white/95 backdrop-blur-xl flex flex-col min-h-0 cursor-pointer overflow-hidden shadow-[0_30px_80px_-20px_rgba(59,130,246,0.15)]"
          onClick={onStop}
        >
          {/* Flex centering for the orb; animated transform is applied only on the inner ref
              so we never overwrite Tailwind translate centering (that caused corner clipping). */}
          <div className="flex-1 min-h-0 flex items-center justify-center px-3 pt-3 pb-1 pointer-events-none">
            <div
              ref={orbVisualRef}
              className="relative w-[min(168px,calc(100%-1.5rem))] h-[min(168px,calc(100%-1.5rem))] max-h-[min(168px,42vh)] shrink-0 flex items-center justify-center will-change-transform [transform-origin:center]"
              style={{
                transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)',
                filter: 'drop-shadow(0 0 14px rgba(71,59,240,0.14))',
              }}
            >
              {/* @ts-ignore custom element */}
              <lottie-player
                id={`voice-orb-lottie-${lottieId}`}
                src="/ai animation Flow 1.json"
                background="transparent"
                speed="0.65"
                className="max-w-full max-h-full"
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
                loop
                autoplay
              />
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1 px-4 text-center shrink-0 mb-2 mx-2 bg-white/50 backdrop-blur-sm rounded-full py-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <p className="text-[11px] font-bold text-textMuted italic line-clamp-1 leading-snug">
                {transcript
                  ? `"${transcript.slice(0, 56)}${transcript.length > 56 ? '…' : ''}"`
                  : 'Voice Protocol — describe your deck naturally'}
              </p>
            </div>
            <span className="text-[9px] text-black/35 font-black uppercase tracking-[0.25em]">
              Tap anywhere to stop · hands-free drafting
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
