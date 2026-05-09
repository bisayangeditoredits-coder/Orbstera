"use client";

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export function EditorPreview() {
  useEffect(() => {
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

  return (
    <section className="w-full py-32 px-6 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] opacity-50" />
      
      <div className="max-w-7xl mx-auto text-center mb-16 relative z-10">
        <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-4">Precision Control</h2>
        <p className="text-textMuted text-lg max-w-2xl mx-auto text-balance">
          AI generated. Human perfected. Take full control of every pixel in our 60fps canvas editor.
        </p>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-panel p-2 rounded-2xl shadow-2xl border border-white/10"
        >
          <div className="bg-surface rounded-xl overflow-hidden border border-white/5 flex flex-col md:flex-row aspect-video md:aspect-[21/9]">
            {/* Sidebar Mock */}
            <div className="hidden md:flex w-64 bg-black/40 border-r border-white/5 flex-col p-4 space-y-4">
              <div className="h-8 w-full bg-white/5 rounded" />
              <div className="space-y-2">
                <div className="h-20 w-full bg-white/10 rounded border border-primary/50" />
                <div className="h-20 w-full bg-white/5 rounded" />
                <div className="h-20 w-full bg-white/5 rounded" />
              </div>
            </div>
            {/* Canvas Mock */}
            <div className="flex-1 bg-background relative flex items-center justify-center p-8">
              {/* Toolbar Mock */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 h-10 w-96 bg-surface border border-white/10 rounded-full flex items-center justify-around px-4 shadow-xl">
                <div className="w-5 h-5 rounded bg-white/20" />
                <div className="w-5 h-5 rounded bg-white/20" />
                <div className="w-5 h-5 rounded bg-white/20" />
                <div className="w-px h-6 bg-white/10" />
                <div className="w-5 h-5 rounded bg-white/20" />
                <div className="w-5 h-5 rounded bg-white/20" />
              </div>

              {/* Active Slide Mock */}
              <div className="w-full max-w-2xl aspect-[16/9] bg-surfaceHover shadow-2xl border border-white/10 flex flex-col items-center justify-center relative group overflow-hidden">
                <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/50 transition-colors z-20" />
                
                {/* Lottie Animation Layer */}
                <div className="absolute inset-0 z-0 opacity-40 group-hover:opacity-60 transition-opacity">
                   {/* @ts-ignore */}
                   <lottie-player
                     src="/A Man with VR headset touches a holographic screen.json"
                     background="transparent"
                     speed="0.8"
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     loop
                     autoplay
                   />
                </div>

                {/* Bounding box mock */}
                <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border border-dashed border-primary/50 flex flex-col items-center justify-center z-10 bg-black/20 backdrop-blur-sm rounded-lg">
                  <div className="w-2 h-2 bg-primary absolute -top-1 -left-1" />
                  <div className="w-2 h-2 bg-primary absolute -top-1 -right-1" />
                  <div className="w-2 h-2 bg-primary absolute -bottom-1 -left-1" />
                  <div className="w-2 h-2 bg-primary absolute -bottom-1 -right-1" />
                  
                  <h3 className="text-2xl font-space-grotesk font-bold text-white mb-1">AI Gen Content</h3>
                  <p className="text-textMuted text-[10px] uppercase tracking-widest font-black">Live Orchestration</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
