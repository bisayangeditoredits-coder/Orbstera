"use client";

import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Paintbrush } from 'lucide-react';

const THEMES = [
  {
    id: 'minimal',
    name: 'Minimal',
    bg: 'bg-slate-100',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-500',
    accent: 'bg-slate-900 text-white',
    font: 'font-sans',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    bg: 'bg-[#F4F1EB]',
    textPrimary: 'text-[#2D2A26]',
    textSecondary: 'text-[#6B6660]',
    accent: 'bg-[#B44B3E] text-white',
    font: 'font-serif',
    cardBg: 'bg-[#FAF8F5]',
    cardBorder: 'border-[#E6E0D4]',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    bg: 'bg-[#F0F4F8]',
    textPrimary: 'text-[#0F2B5B]',
    textSecondary: 'text-[#4A5568]',
    accent: 'bg-[#1755E6] text-white',
    font: 'font-sans',
    cardBg: 'bg-white',
    cardBorder: 'border-[#D1E0F5]',
  },
  {
    id: 'pastel',
    name: 'Pastel Dream',
    bg: 'bg-[#FDF8F5]',
    textPrimary: 'text-[#4A3B42]',
    textSecondary: 'text-[#8A7982]',
    accent: 'bg-[#E84ECA] text-white',
    font: 'font-sans',
    cardBg: 'bg-white',
    cardBorder: 'border-[#F4E3EB]',
  },
];

export function ThemeSwitcherDemo() {
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);

  return (
    <section className="w-full bg-white py-24 sm:py-32 border-b border-black/[0.04]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row items-center gap-16 lg:gap-24">
          
          {/* Text Content */}
          <div className="w-full md:w-5/12 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-widest mb-6 w-max">
              <Paintbrush size={14} />
              One-Click Restyle
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Stop formatting. <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1755E6] to-[#8B5CF6]">Start creating.</span>
            </h2>
            
            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-10 max-w-lg">
              Never waste another hour tweaking fonts or aligning boxes. Instantly swap between professional themes, and watch your entire presentation reformat perfectly in real-time.
            </p>

            <div className="flex flex-wrap gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setActiveTheme(theme)}
                  className={`px-4 py-2.5 rounded-full text-[13px] font-bold transition-all ${
                    activeTheme.id === theme.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Demo Area */}
          <div className="w-full md:w-7/12 relative">
            {/* The "Presentation" Container */}
            <div 
              className={`relative w-full aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden shadow-2xl transition-colors duration-700 ${activeTheme.bg} ring-1 ring-inset ${activeTheme.id === 'minimal' || activeTheme.id === 'editorial' ? 'ring-black/5' : 'ring-white/10'}`}
            >
              <div className="absolute inset-0 p-6 sm:p-10 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-12">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg ${activeTheme.accent}`}>
                    O
                  </div>
                  <div className={`text-[11px] uppercase tracking-widest font-bold ${activeTheme.textSecondary}`}>
                    Q3 Strategy Review
                  </div>
                </div>

                {/* Content Layout */}
                <div className="flex-1 flex flex-col sm:flex-row gap-8">
                  {/* Left Column (Text) */}
                  <div className="w-full sm:w-1/2 flex flex-col justify-center">
                    <h3 
                      className={`text-3xl sm:text-4xl font-bold leading-tight mb-4 transition-colors duration-700 ${activeTheme.textPrimary} ${activeTheme.font}`}
                    >
                      Accelerating Growth in 2026.
                    </h3>
                    <p 
                      className={`text-sm sm:text-base leading-relaxed transition-colors duration-700 ${activeTheme.textSecondary} ${activeTheme.font}`}
                    >
                      We are expanding our reach across three key demographics, increasing our marketing spend by 40%, and launching our highly anticipated V2 engine.
                    </p>
                    
                    <div className="mt-8">
                      <div className={`px-5 py-2.5 rounded-full text-sm font-bold inline-block transition-colors duration-700 ${activeTheme.accent} ${activeTheme.font}`}>
                        View Financials
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Cards with Images) */}
                  <div className="w-full sm:w-1/2 flex flex-col gap-3 justify-center">
                    {[
                      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop',
                      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=400&auto=format&fit=crop',
                      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop'
                    ].map((img, i) => (
                      <div 
                        key={i}
                        className={`w-full p-2.5 rounded-2xl border transition-colors duration-700 flex items-center gap-4 ${activeTheme.cardBg} ${activeTheme.cardBorder} shadow-sm`}
                      >
                        <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0">
                          <img src={img} alt="Slide graphic" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className={`w-1/2 h-2.5 rounded-full mb-2 ${activeTheme.textSecondary} opacity-40`} />
                          <div className={`w-3/4 h-2.5 rounded-full ${activeTheme.textSecondary} opacity-20`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Decorative blurs */}
            <div className="absolute -inset-10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur-3xl -z-10 rounded-full" />
          </div>

        </div>

      </div>
    </section>
  );
}
