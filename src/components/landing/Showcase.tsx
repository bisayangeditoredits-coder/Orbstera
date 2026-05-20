"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal, Monitor, BookOpen, Briefcase, Palette, Check, ArrowRight } from 'lucide-react';

const THEMES = [
  {
    id: 'minimal',
    label: 'Minimal Tech',
    icon: Monitor,
    topic: 'Sustainable Grid Architecture',
    style: 'Structured light grid, high precision',
    font: 'Space Grotesk',
    slides: 10,
    accent: '#3B82F6', // Blue
    bgGlow: 'rgba(59, 130, 246, 0.05)',
  },
  {
    id: 'editorial',
    label: 'Classic Editorial',
    icon: BookOpen,
    topic: 'The Architecture of Typography',
    style: 'Editorial serif, warm paper tones',
    font: 'Lora (Serif)',
    slides: 8,
    accent: '#B45309', // Amber
    bgGlow: 'rgba(180, 83, 9, 0.04)',
  },
  {
    id: 'corporate',
    label: 'Corporate Premium',
    icon: Briefcase,
    topic: 'Q3 Infrastructure Scale Report',
    style: 'Deep navy, status metrics',
    font: 'Montserrat',
    slides: 15,
    accent: '#0F172A', // Navy/Slate
    bgGlow: 'rgba(15, 23, 42, 0.04)',
  },
  {
    id: 'studio',
    label: 'Creative Studio',
    icon: Palette,
    topic: 'Next Gen Interface Dynamics',
    style: 'Warm pastels, fluid geometry',
    font: 'Inter / Sans',
    slides: 12,
    accent: '#8B5CF6', // Purple
    bgGlow: 'rgba(139, 92, 246, 0.05)',
  },
] as const;

export function Showcase() {
  const [activeTheme, setActiveTheme] = useState<typeof THEMES[number]['id']>('minimal');
  const currentTheme = THEMES.find((t) => t.id === activeTheme) || THEMES[0];

  // Typing effect for the prompt console
  const [typedTopic, setTypedTopic] = useState<string>(currentTheme.topic);

  useEffect(() => {
    let active = true;
    let currentText = '';
    const targetText = currentTheme.topic;
    let i = 0;
    
    // Clear initial
    setTypedTopic('');
    
    const interval = setInterval(() => {
      if (!active) return;
      if (i < targetText.length) {
        currentText += targetText[i];
        setTypedTopic(currentText);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeTheme, currentTheme.topic]);

  return (
    <section id="showcase" className="w-full py-28 px-6 bg-gradient-to-b from-[#FAFBFD] via-white to-[#FAFBFD] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.03)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      {/* Dynamic Background Glow changing according to theme */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-[160px] opacity-70 pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: currentTheme.bgGlow }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-4 block"
          >
            Visual Sandbox
          </motion.span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-montserrat font-bold mb-6 text-textMain tracking-tight">
            Prompt to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Presentation</span>
          </h2>
          <p className="text-textSecondary text-lg md:text-xl max-w-2xl mx-auto text-balance font-medium leading-relaxed">
            Specify your style. Watch our engine instantly arrange your narrative, typography, and grids into a masterpiece.
          </p>
        </div>

        {/* Professional Segmented Style Control Tabs */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <div className="inline-flex flex-wrap sm:flex-nowrap gap-1.5 p-1.5 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] max-w-full overflow-x-auto scrollbar-none">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              const isActive = activeTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/10'
                      : 'text-textSecondary hover:text-textMain hover:bg-slate-50'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-textMuted'} />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Console: Prompt input mock (Sleek SaaS Card) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 bg-white rounded-3xl p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between"
          >
            <div className="bg-slate-50/40 rounded-[22px] p-6 sm:p-7 flex-1 flex flex-col justify-between border border-slate-50">
              <div>
                {/* Header info */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary">
                      <Terminal size={15} strokeWidth={2.2} />
                    </div>
                    <span className="font-bold text-textMain text-[11px] uppercase tracking-widest">Generation Prompt</span>
                  </div>
                  <div className="text-[9px] font-black bg-primary/5 text-primary px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                    Engine v2.0
                  </div>
                </div>

                {/* The Light designer Console */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.015)] font-mono text-[12px] leading-relaxed text-textSecondary space-y-4">
                  {/* Subtle top gradient accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/30 to-indigo-500/20" />

                  <div className="flex items-center gap-2 text-[10px] text-textMuted uppercase font-bold tracking-widest mb-1 pb-2 border-b border-slate-50">
                    <span>Console State</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  <div className="flex flex-col gap-1 sm:grid sm:grid-cols-12 sm:gap-2">
                    <span className="text-textMuted sm:col-span-3">Topic:</span>
                    <div className="sm:col-span-9 text-textMain font-medium flex items-center gap-0.5">
                      <span>{typedTopic}</span>
                      <span className="w-1.5 h-3.5 bg-primary animate-blink inline-block" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:grid sm:grid-cols-12 sm:gap-2">
                    <span className="text-textMuted sm:col-span-3">Style:</span>
                    <span className="sm:col-span-9 text-primary font-medium">{currentTheme.style}</span>
                  </div>

                  <div className="flex flex-col gap-1 sm:grid sm:grid-cols-12 sm:gap-2">
                    <span className="text-textMuted sm:col-span-3">Font family:</span>
                    <span className="sm:col-span-9 text-textMain font-medium">{currentTheme.font}</span>
                  </div>

                  <div className="flex flex-col gap-1 sm:grid sm:grid-cols-12 sm:gap-2">
                    <span className="text-textMuted sm:col-span-3">Slide count:</span>
                    <span className="sm:col-span-9 text-textMain font-semibold">{currentTheme.slides} slides</span>
                  </div>
                </div>
              </div>

              {/* Status footer inside console card */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-textMuted font-medium">
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-500" />
                  <span>Model response validated</span>
                </div>
                <span>Render 14ms</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Generated slide preview (Premium Floating Slide) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            <div className="relative aspect-[16/10] bg-white rounded-3xl p-2.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.015)] border border-slate-100 overflow-hidden group">
              {/* Layout Container */}
              <div className="absolute inset-2.5 rounded-[20px] overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTheme === 'minimal' && (
                    <motion.div
                      key="minimal"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0 bg-white p-6 sm:p-10 flex flex-col justify-between font-sans select-none"
                    >
                      {/* Blueprint Grid Lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000002_1px,transparent_1px),linear-gradient(to_bottom,#00000002_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                      <div className="absolute top-0 bottom-0 left-[20%] w-[1px] bg-slate-50 pointer-events-none" />
                      <div className="absolute top-0 bottom-0 left-[80%] w-[1px] bg-slate-50 pointer-events-none" />

                      {/* Header */}
                      <div className="relative flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        <span>01 / Sustainable Grid</span>
                        <span>Orbstera Engine</span>
                      </div>

                      {/* Title content area */}
                      <div className="relative flex flex-col items-start gap-4">
                        <div className="w-1.5 h-12 bg-primary rounded-full" />
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-space-grotesk font-bold text-slate-900 leading-tight tracking-tight text-left">
                          SUSTAINABLE GRID <br />
                          <span className="text-primary font-light">ARCHITECTURE</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium text-left max-w-md leading-relaxed">
                          Optimizing structural layouts to distribute energy loads dynamically. Engineered for zero-emission real estate development.
                        </p>
                      </div>

                      {/* Footer Info details */}
                      <div className="relative pt-4 border-t border-slate-100 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="flex gap-4">
                          <span>GRID SCALE: 1:120</span>
                          <span>SYS: AUTO-LAYOUT</span>
                        </div>
                        <span className="text-primary">10 Slides Total</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTheme === 'editorial' && (
                    <motion.div
                      key="editorial"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0 bg-[#FAF7F2] p-8 sm:p-12 flex flex-col justify-between select-none"
                    >
                      {/* Decorative soft texture details */}
                      <div className="absolute inset-0 bg-grain pointer-events-none" />
                      <div className="absolute top-12 bottom-12 left-12 right-12 border border-[#E9E4DC]/60 pointer-events-none" />

                      {/* Editorial Title Block */}
                      <div className="relative flex-1 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-medium text-amber-800/60 uppercase tracking-[0.25em] mb-4">Chapter I</span>
                        <h3 className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-amber-950 leading-tight mb-4 max-w-lg">
                          The Architecture <br />
                          <span className="font-normal not-italic">of Typography</span>
                        </h3>
                        <div className="w-10 h-[1px] bg-amber-800/30 my-3" />
                        <p className="text-xs sm:text-sm font-serif italic text-amber-900/60 max-w-sm">
                          Discovering how letterforms shape our spaces, culture, and communication.
                        </p>
                      </div>

                      {/* Minimal Page numbering */}
                      <div className="relative flex items-center justify-between text-[9px] font-serif text-amber-900/40 italic">
                        <span>A / Orbstera Journal</span>
                        <span>08</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTheme === 'corporate' && (
                    <motion.div
                      key="corporate"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0 bg-gradient-to-br from-white to-[#F6F8FA] p-6 sm:p-8 flex flex-col justify-between font-sans select-none"
                    >
                      {/* Structure Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                          <span className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">Infrastructure Scaling</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          <span>Q3 Active</span>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="my-auto py-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-1">Key Performance</span>
                        <h3 className="text-xl sm:text-2xl font-montserrat font-extrabold text-slate-900 tracking-tight mb-4">
                          Q3 INFRASTRUCTURE METRICS
                        </h3>
                        
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-2">
                          {[
                            { value: '99.99%', label: 'UPTIME SLA', change: '+0.02%' },
                            { value: '3.5x', label: 'THROUGHPUT', change: 'MAX SPEED' },
                            { value: '+45%', label: 'EFFICIENCY', change: '-12% COST' }
                          ].map((stat, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 p-2.5 sm:p-3.5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
                              <span className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-none mb-1">{stat.value}</span>
                              <span className="text-[7px] font-black text-emerald-500 tracking-wider">{stat.change}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[8px] font-semibold text-slate-400">
                        <span>Report generated via Orbstera Copilot</span>
                        <span>Slide 4 of 15</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTheme === 'studio' && (
                    <motion.div
                      key="studio"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0 bg-gradient-to-tr from-[#FAF8FF] via-white to-[#FFF9F6] p-6 sm:p-10 flex flex-col justify-between font-sans overflow-hidden select-none"
                    >
                      {/* Pastel Floating Geometry in Background */}
                      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-violet-400/[0.04] blur-3xl pointer-events-none" />
                      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-400/[0.03] blur-3xl pointer-events-none" />
                      
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
                        <svg className="w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern id="dotpattern" width="24" height="24" patternUnits="userSpaceOnUse">
                              <circle cx="2" cy="2" r="1.5" fill="#8B5CF6" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#dotpattern)" />
                        </svg>
                      </div>

                      {/* Header */}
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-black">
                            O
                          </div>
                          <span className="text-[10px] font-bold text-violet-950 uppercase tracking-widest">Interface Dynamics</span>
                        </div>
                        <span className="text-[9px] font-bold text-violet-400/80 uppercase tracking-wider">Interactive Deck</span>
                      </div>

                      {/* Title & Floating element mock */}
                      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-8 flex flex-col items-start gap-3">
                          <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100 text-[9px] font-black uppercase tracking-wider">
                            Interactive Design
                          </span>
                          <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-violet-950 leading-tight tracking-tight text-left">
                            Next Gen Interface Dynamics
                          </h3>
                          <p className="text-xs text-violet-900/60 text-left max-w-sm">
                            Exploring tactile micro-interactions, canvas layers, and real-time multiplayer layout orchestration.
                          </p>
                        </div>

                        {/* Layer cards mockup */}
                        <div className="hidden md:col-span-4 md:flex flex-col gap-1.5 relative">
                          {['Spatial', 'Tactile', 'Responsive'].map((layer, index) => (
                            <motion.div
                              key={layer}
                              initial={{ x: 20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className="bg-white border border-slate-100 p-2 rounded-xl shadow-[0_8px_20px_rgba(139,92,246,0.03)] flex items-center gap-2 transform"
                              style={{ 
                                scale: 1 - index * 0.05,
                                rotate: index * 2 - 2,
                                translateZ: 0 
                              }}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-violet-500' : index === 1 ? 'bg-purple-400' : 'bg-pink-400'}`} />
                              <span className="text-[9px] font-bold text-slate-700">{layer}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="relative flex items-center justify-between text-[9px] font-bold text-violet-400">
                        <span>Creative Studio Spec</span>
                        <span>12 Slides</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Glass Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none transform -translate-x-full group-hover:translate-x-full ease-in-out" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
