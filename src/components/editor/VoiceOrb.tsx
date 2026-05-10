'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceOrbProps {
  isListening: boolean;
  transcript?: string;
  onStop: () => void;
}

export function VoiceOrb({ isListening, transcript, onStop }: VoiceOrbProps) {
  const lottieRef = useRef<any>(null);

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

  // No second getUserMedia here — it fights Web Speech API on Chrome/Edge and breaks recognition.
  useEffect(() => {
    if (!isListening) {
      try {
        lottieRef.current?.setSpeed?.(0.6);
      } catch {
        /* noop */
      }
      return;
    }
    try {
      lottieRef.current?.setSpeed?.(1.65);
    } catch {
      /* noop */
    }
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
          className="absolute inset-0 z-20 rounded-[22px] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden shadow-[0_30px_80px_-20px_rgba(59,130,246,0.15)]"
          onClick={onStop}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] pointer-events-none select-none flex items-center justify-center">
            {/* @ts-ignore custom element */}
            <lottie-player
              ref={lottieRef}
              src="/ai animation Flow 1.json"
              background="transparent"
              speed="0.6"
              style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
              loop
              autoplay
            />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1 px-4 text-center mt-auto mb-2 bg-white/50 backdrop-blur-sm rounded-full py-1">
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
