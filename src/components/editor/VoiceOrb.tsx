'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceOrbProps {
  isListening: boolean;
  transcript?: string;
  onStop: () => void;
}

export function VoiceOrb({ isListening, transcript, onStop }: VoiceOrbProps) {
  const lottieRef  = useRef<any>(null);
  const animRef    = useRef<number>(0);
  const streamRef  = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef     = useRef<AudioContext | null>(null);

  // Ensure lottie-player script is injected once
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

  // Start / stop audio analysis when isListening changes
  useEffect(() => {
    if (!isListening) {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      ctxRef.current?.close();
      ctxRef.current = null;
      analyserRef.current = null;
      // Reset animation speed to calm idle
      try { lottieRef.current?.setSpeed?.(0.6); } catch (_) {}
      return;
    }

    async function startAnalyser() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;

        const ctx = new AudioContext();
        ctxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);

          // Average of the lower-frequency bins (voice range)
          const voiceBins = data.slice(0, 60);
          const avg = voiceBins.reduce((s, v) => s + v, 0) / voiceBins.length;

          // Map avg (0-100) → speed (0.4 → 3.5)
          const speed = 0.4 + (avg / 100) * 3.1;
          const clamped = Math.max(0.4, Math.min(3.5, speed));

          try {
            if (lottieRef.current) {
              // lottie-player exposes setSpeed() on the element
              if (typeof lottieRef.current.setSpeed === 'function') {
                lottieRef.current.setSpeed(clamped);
              } else {
                lottieRef.current.speed = clamped;
              }
            }
          } catch (_) {}

          animRef.current = requestAnimationFrame(tick);
        }

        tick();
      } catch (err) {
        console.warn('VoiceOrb: microphone access denied for audio visualiser', err);
        // Still show the animation but at a fixed speed
        try { lottieRef.current?.setSpeed?.(1.5); } catch (_) {}
      }
    }

    startAnalyser();

    return () => {
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
  }, [isListening]);

  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          key="voice-orb"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-20 rounded-[22px] bg-white/98 backdrop-blur-sm flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden"
          onClick={onStop}
        >
          {/* Lottie Flow animation — speed controlled by voice volume */}
          <div className="w-[190px] h-[190px] pointer-events-none select-none">
            {/* @ts-ignore custom element */}
            <lottie-player
              ref={lottieRef}
              src="/ai animation Flow 1.json"
              background="transparent"
              speed="0.6"
              style={{ width: '100%', height: '100%' }}
              loop
              autoplay
            />
          </div>

          {/* Caption */}
          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              <p className="text-[12px] font-medium text-textMuted italic line-clamp-2 leading-snug">
                {transcript
                  ? `"${transcript.slice(0, 55)}${transcript.length > 55 ? '…' : ''}"`
                  : 'Listening… speak now'}
              </p>
            </div>
            <span className="text-[10px] text-black/20 font-medium uppercase tracking-[0.15em]">
              Tap anywhere to stop
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
