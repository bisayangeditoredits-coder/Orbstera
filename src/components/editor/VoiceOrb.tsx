'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceOrbProps {
  isListening: boolean;
  transcript?: string;
  onStop: () => void;
}

export function VoiceOrb({ isListening, transcript, onStop }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!isListening) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = 320;
    const H = canvas.height = 320;
    const cx = W / 2;
    const cy = H / 2;

    function drawOrb(t: number) {
      ctx.clearRect(0, 0, W, H);

      // Layers of flowing ellipses
      const layers = [
        { rx: 90, ry: 56, rot: t * 0.9,  color: 'rgba(139,92,246,0.18)',  phase: 0 },
        { rx: 80, ry: 60, rot: -t * 0.7, color: 'rgba(99,102,241,0.18)',  phase: 0.5 },
        { rx: 100,ry: 48, rot: t * 1.1,  color: 'rgba(168,85,247,0.14)',  phase: 1.0 },
        { rx: 70, ry: 68, rot: -t * 1.3, color: 'rgba(59,130,246,0.16)',  phase: 1.5 },
        { rx: 95, ry: 52, rot: t * 0.6,  color: 'rgba(147,197,253,0.13)', phase: 2.0 },
        { rx: 60, ry: 75, rot: -t * 0.5, color: 'rgba(196,181,253,0.15)', phase: 2.5 },
        { rx: 85, ry: 58, rot: t * 1.4,  color: 'rgba(79,70,229,0.12)',   phase: 3.0 },
      ];

      layers.forEach(({ rx, ry, rot, color, phase }) => {
        const breathe = 1 + 0.06 * Math.sin(t * 1.8 + phase);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * breathe, ry * breathe, 0, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      // Inner glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55);
      grd.addColorStop(0,   'rgba(167,139,250,0.35)');
      grd.addColorStop(0.5, 'rgba(99,102,241,0.12)');
      grd.addColorStop(1,   'rgba(99,102,241,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 55, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Outer ring pulse
      const pulse = 1 + 0.04 * Math.sin(t * 2.2);
      const outerGrd = ctx.createRadialGradient(cx, cy, 95 * pulse, cx, cy, 115 * pulse);
      outerGrd.addColorStop(0, 'rgba(139,92,246,0.07)');
      outerGrd.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 115 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = outerGrd;
      ctx.fill();
    }

    function animate() {
      timeRef.current += 0.012;
      drawOrb(timeRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isListening]);

  return (
    <AnimatePresence>
      {isListening && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-20 rounded-[22px] bg-white flex flex-col items-center justify-center gap-4 cursor-pointer"
          onClick={onStop}
        >
          {/* Orb canvas */}
          <div className="relative flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="w-[180px] h-[180px]"
            />
          </div>

          {/* Status text */}
          <div className="flex flex-col items-center gap-1.5 -mt-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[12px] font-medium text-textMuted italic">
                {transcript ? `"${transcript.slice(0, 50)}${transcript.length > 50 ? '…' : ''}"` : 'Listening… speak now'}
              </span>
            </div>
            <span className="text-[10px] text-black/20 font-medium uppercase tracking-widest">
              Tap anywhere to stop
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
