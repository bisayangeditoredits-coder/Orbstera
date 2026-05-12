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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(71,59,240,0.05)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 sm:mb-24">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-neutral-900 tracking-tighter">
            Prompt to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Presentation</span>
          </h2>
          <p className="text-neutral-500 text-lg md:text-xl max-w-2xl mx-auto text-balance font-medium tracking-tight">
            Type your concept. Our AI orchestrates the narrative, sources imagery, and builds a cinematic deck in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Prompt input mock (Sleek SaaS Card) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] border border-black/[0.04] relative overflow-hidden"
          >
            <div className="bg-neutral-50/50 rounded-[22px] p-6 sm:p-8 h-full border border-black/[0.02]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm border border-black/[0.04] flex items-center justify-center text-primary">
                    <Terminal size={16} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-neutral-800 text-sm tracking-tight">GENERATION PROMPT</span>
                </div>
                <div className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full uppercase tracking-widest border border-primary/20">
                  GPT-5.5
                </div>
              </div>

              {/* The Dark Terminal */}
              <div className="bg-[#0A0A0A] rounded-2xl p-6 font-mono text-[13px] leading-relaxed border border-white/10 relative overflow-hidden shadow-2xl">
                {/* Glow inside terminal */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex gap-2 mb-5 relative z-10">
                  <span className="text-blue-400 font-semibold">/generate</span>
                  <span className="text-white/90">presentation</span>
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-white/40 w-24 shrink-0">Topic:</span>
                    <span className="text-white/90 font-medium">Future of Quantum Computing</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-white/40 w-24 shrink-0">Style:</span>
                    <span className="text-blue-300 font-medium">Cyber-dark, neon accents</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-white/40 w-24 shrink-0">Audience:</span>
                    <span className="text-white/90 font-medium">Tech investors</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-2">
                    <span className="text-white/40 w-24 shrink-0">Slides:</span>
                    <span className="text-white/90 font-medium">12</span>
                  </div>
                </div>
                <motion.div
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-4 bg-blue-500 mt-5 rounded-sm shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                />
              </div>

              {/* Slide type pills */}
              <div className="mt-8 flex flex-wrap gap-2">
                {MOCK_SLIDES.map((s, i) => (
                  <motion.span
                    key={s.type}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 + 0.2 }}
                    className="text-[11px] font-semibold px-4 py-1.5 rounded-full bg-white border border-black/[0.06] text-neutral-600 shadow-sm hover:border-black/[0.15] hover:text-neutral-900 transition-all cursor-default"
                  >
                    {s.label}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Generated slide preview (Premium Floating Slide) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            {/* Glow Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-indigo-500/10 to-transparent rounded-[3rem] blur-2xl transform scale-90" />
            
            <div className="relative aspect-[16/10] bg-white rounded-[2rem] border border-black/[0.04] p-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden group">
               <div className="relative h-full w-full rounded-[1.75rem] bg-gradient-to-br from-neutral-50 to-white flex flex-col items-center justify-center p-8 sm:p-12 text-center border border-black/[0.02] shadow-[inset_0_0_20px_rgba(0,0,0,0.01)] overflow-hidden">
                  
                  {/* Grid overlay for scale */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
                  
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />

                  <motion.div 
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-14 h-14 rounded-2xl bg-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.04)] flex items-center justify-center mb-8"
                  >
                     <Sparkles className="w-6 h-6 text-primary" strokeWidth={2} />
                  </motion.div>

                  <h3 className="relative text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 mb-4 tracking-tighter leading-tight">
                    Quantum <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">Advantage</span>
                  </h3>
                  
                  <p className="relative text-neutral-500 font-medium tracking-tight mb-8 max-w-xs text-sm sm:text-base">
                    Redefining Computational Limits by 2030
                  </p>

                  <div className="relative w-16 h-1 bg-gradient-to-r from-transparent via-black/10 to-transparent rounded-full mb-10" />

                  <div className="relative flex items-center justify-center flex-wrap gap-4 sm:gap-6 text-[10px] font-bold text-neutral-400 tracking-[0.15em] uppercase">
                    <span>12 slides</span>
                    <div className="w-1 h-1 rounded-full bg-neutral-300" />
                    <span>Cyber Dark</span>
                    <div className="w-1 h-1 rounded-full bg-neutral-300" />
                    <span>Space Grotesk</span>
                  </div>

                  {/* Glass Shimmer on hover */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none transform -translate-x-full group-hover:translate-x-full ease-in-out" />
               </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
