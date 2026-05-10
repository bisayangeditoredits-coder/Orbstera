"use client";

import { motion } from 'framer-motion';
import { Sparkles, Terminal } from 'lucide-react';

const MOCK_SLIDES = [
  { type: 'hero', label: 'Title Slide' },
  { type: 'content', label: 'Problem' },
  { type: 'split', label: 'Solution' },
  { type: 'chart', label: 'Market Size' },
  { type: 'team', label: 'Team' },
  { type: 'closing', label: 'Ask' },
];

export function Showcase() {
  return (
    <section id="showcase" className="w-full py-24 px-6 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(71,59,240,0.03)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-[#1A1A1A] tracking-tight">
            Prompt to <span className="text-primary italic">Presentation</span>
          </h2>
          <p className="text-textSecondary text-lg md:text-xl max-w-2xl mx-auto text-balance font-medium opacity-70">
            Type your concept. Our AI orchestrates the narrative, sources imagery, and builds a cinematic deck in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Prompt input mock (Enhanced Glassmorphism) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-blue-100 rounded-3xl p-8 shadow-[0_30px_60px_-15px_rgba(71,59,240,0.08)] relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <Terminal size={18} />
              </div>
              <span className="font-bold text-textMain text-sm uppercase tracking-wider">Generation Prompt</span>
              <span className="ml-auto text-[10px] font-bold bg-primary text-white px-3 py-1 rounded-full uppercase tracking-tighter">DeepSeek V3</span>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl p-6 font-mono text-sm leading-relaxed border border-blue-50 relative group">
              <div className="flex gap-2 mb-4">
                <span className="text-primary font-bold">/generate</span>
                <span className="text-textMain font-medium">presentation</span>
              </div>
              <div className="space-y-2 opacity-80">
                <div className="flex gap-2">
                  <span className="text-textMuted w-20">Topic:</span>
                  <span className="text-textMain font-semibold">Future of Quantum Computing</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-textMuted w-20">Style:</span>
                  <span className="text-textMain font-semibold italic text-primary">Cyber-dark, neon accents</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-textMuted w-20">Audience:</span>
                  <span className="text-textMain font-semibold">Tech investors</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-textMuted w-20">Slides:</span>
                  <span className="text-textMain font-semibold">12</span>
                </div>
              </div>
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2.5 h-5 bg-primary mt-4 rounded-sm"
              />
            </div>

            {/* Slide type pills (Bottom) */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {MOCK_SLIDES.map((s, i) => (
                <motion.span
                  key={s.type}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="text-[11px] font-bold px-4 py-1.5 rounded-full bg-white border border-blue-50 text-textSecondary shadow-sm hover:border-primary/30 transition-colors cursor-default"
                >
                  {s.label}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Right: Generated slide preview (Premium Glassmorphism) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Glow Background */}
            <div className="absolute -inset-10 bg-primary/10 rounded-full blur-[80px] opacity-90" />
            
            <div className="relative aspect-[16/11] bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border border-white p-1 shadow-[0_50px_100px_-20px_rgba(71,59,240,0.15)] overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-transparent" />
               
               {/* Internal Content */}
               <div className="relative h-full w-full rounded-[2.3rem] bg-white/10 flex flex-col items-center justify-center p-12 text-center">
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-2xl bg-white shadow-2xl flex items-center justify-center mb-8 border border-white"
                  >
                     <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>

                  <h3 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 tracking-tight leading-tight">
                    Quantum <br /> <span className="text-primary italic">Advantage</span>
                  </h3>
                  
                  <p className="text-textSecondary font-medium opacity-60 mb-8 max-w-xs">
                    Redefining Computational Limits by 2030
                  </p>

                  <div className="w-24 h-1 bg-gradient-to-r from-primary/5 to-primary to-primary/5 rounded-full mb-10" />

                  <div className="flex items-center gap-8 text-[11px] font-bold text-textSecondary tracking-wider uppercase opacity-40">
                    <span>12 slides</span>
                    <div className="w-1 h-1 rounded-full bg-textSecondary" />
                    <span>Cyber Dark</span>
                    <div className="w-1 h-1 rounded-full bg-textSecondary" />
                    <span>Space Grotesk</span>
                  </div>
               </div>

               {/* Decorative floating elements */}
               <div className="absolute top-10 right-10 w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
               <div className="absolute bottom-10 left-10 w-32 h-32 bg-blue-400/5 rounded-full blur-3xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
