'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Sparkles } from 'lucide-react';

export function PageTransition({ children }: { children: React.RefNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  // Trigger a brief loading state on pathname change
  useEffect(() => {
    // Inject Lottie Script
    const scriptId = 'lottie-player-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 1200); // Slightly longer for cinematic effect
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {/* Global Progress Bar */}
      <AnimatePresence>
        {isLoading && (
          <>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '85%' }}
              exit={{ width: '100%' }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 left-0 h-[4px] bg-gradient-to-r from-primary via-purple-500 to-blue-400 z-[9999] shadow-[0_0_20px_rgba(59,130,246,0.6)]"
            />
            
            {/* Professional AI Loading Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-white/95 backdrop-blur-[32px] flex flex-col items-center justify-center overflow-hidden"
            >
              {/* Background Ambient Glows */}
              <div className="absolute inset-0 z-0">
                 <div className="absolute top-[20%] left-[15%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
                 <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[120px]" />
              </div>

              <motion.div
                className="relative z-10 flex flex-col items-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
              >
                {/* Robot Mascot Container */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.2
                  }}
                  className="relative w-64 h-64 mb-4"
                >
                  {/* Outer Orbitals/Glow for the robot */}
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                  
                  {/* @ts-ignore */}
                  <lottie-player
                    src="/robo (2).json"
                    background="transparent"
                    speed="1"
                    style={{ width: '100%', height: '100%' }}
                    loop
                    autoplay
                  />
                </motion.div>

                {/* Staggered Text Reveal */}
                <div className="flex flex-col items-center gap-4">
                  <motion.div className="overflow-hidden h-10">
                    <motion.span 
                      initial={{ y: 40 }}
                      animate={{ y: 0 }}
                      transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="block text-[28px] font-black text-black tracking-[0.3em] uppercase"
                    >
                      Orvixes AI
                    </motion.span>
                  </motion.div>
                  
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="w-24 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
                  />

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-black tracking-[0.5em] uppercase">Intelligence Node 4.0</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    </div>
                    <span className="text-[10px] font-medium text-black/40 tracking-[0.2em] uppercase italic">Initializing neural pathways...</span>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Loading Overlay (Subtle Blur) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Initial Page Load Flash (Pure White) */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed inset-0 bg-white z-[10000] pointer-events-none"
      />
    </>
  );
}
