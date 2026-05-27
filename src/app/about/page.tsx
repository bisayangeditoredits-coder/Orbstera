'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { Target, Lightbulb, ChevronRight, Globe, Mail, Link as LinkIcon, Network, ArrowRight } from 'lucide-react';

const TEAM = [
  { name: "Sophia Carter", role: "Chief Executive Officer", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" },
  { name: "Yudhi Carter", role: "Chief Operating Officer", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80" },
  { name: "Ethan Walker", role: "Chief Technology", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80" },
  { name: "Olivia Chen", role: "UI/UX Designer", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80" }
];

export default function AboutPage() {
  return (
    <main className="min-h-screen w-full bg-white pt-10 sm:pt-14 font-sans text-slate-900 overflow-x-hidden">
      
      {/* 1. HERO SECTION (Premium Centered) */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pb-24 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/20 to-cyan-400/20 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-sm font-semibold tracking-wide text-slate-700 mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#0009fa] animate-pulse" />
            The Orbstera Story
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[80px] font-semibold tracking-tighter text-[#1E293B] mb-8 leading-[1.1]">
            We are redefining how<br/>the world <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0009fa] to-blue-600">presents ideas.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 font-medium leading-relaxed tracking-tight">
            Our mission is to eliminate the friction between thought and presentation. By harnessing the power of advanced AI, we empower professionals to create cinematic, investor-grade decks in seconds.
          </p>

          <div className="w-full max-w-5xl mx-auto aspect-video rounded-3xl overflow-hidden relative shadow-2xl border border-slate-100">
             <img 
               src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80" 
               alt="Orbstera Team Collaboration" 
               className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        </motion.div>
      </section>

      {/* 2. OUR VISION & MISSION (Glassmorphic Split) */}
      <section className="bg-slate-50 border-y border-slate-100 py-32 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-7xl mx-auto px-6 sm:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
            {/* Vision */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-center"
            >
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#0009fa] mb-8 shadow-xl shadow-blue-900/5">
                <Lightbulb className="w-8 h-8" />
              </div>
              <h2 className="text-4xl font-bold text-[#1E293B] mb-6 tracking-tight">A world where ideas flow without friction.</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                We envision a future where anyone, regardless of design skill or technical expertise, can instantly translate their concepts into breathtaking visual narratives. The presentation layer should disappear, leaving only the pure impact of your ideas.
              </p>
            </motion.div>
            
            {/* Mission */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white/60 backdrop-blur-xl rounded-[40px] p-12 border border-white shadow-2xl shadow-slate-200/50"
            >
              <div className="w-16 h-16 bg-[#0009fa] rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg shadow-[#0009fa]/20">
                <Target className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-[#1E293B] mb-6 tracking-tight">Our Core Mission</h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                To build the most intelligent, intuitive, and cinematic presentation engine ever created. We are dedicated to saving humanity millions of hours previously lost to formatting slides, aligning text boxes, and searching for the perfect image.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Eliminate manual design tasks",
                  "Integrate state-of-the-art Generative AI",
                  "Maintain enterprise-grade security"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-[#0009fa]">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. MEET THE EXPERTS (Premium Grid) */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 border border-slate-200 px-4 py-1.5 rounded-full text-sm mb-6 shadow-sm">
              <div className="w-1.5 h-1.5 bg-[#0009fa] rounded-full" />
              <span className="font-medium text-slate-700">Leadership</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1E293B] tracking-tight">Meet the Experts</h2>
          </div>
          <button onClick={() => window.dispatchEvent(new Event('open-lead-modal'))} className="group flex items-center gap-2 text-[#0009fa] font-semibold hover:text-blue-700 transition-colors">
            View All Open Positions <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM.map((member, i) => (
            <div key={i} className="rounded-none sm:rounded-[20px] border border-slate-100 shadow-sm flex flex-col relative bg-white overflow-hidden group">
              <div className="w-full h-[280px] relative overflow-hidden bg-slate-100">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                <div className="absolute top-5 left-5 bg-white px-3 py-1 rounded-full text-[11px] font-semibold text-slate-700 shadow-sm flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-[#0009fa] rounded-full" />
                   Leadership
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-[#0009fa] rounded-md text-white flex items-center justify-center shadow-md">
                   <Network className="w-4 h-4" />
                </div>
              </div>
              
              <div className="p-6 relative bg-white border-t border-slate-50">
                 <h3 className="text-xl font-bold text-[#1E293B] mb-1">{member.name}</h3>
                 <p className="text-[#0009fa] font-semibold text-sm mb-5">{member.role}</p>
                 
                 <div className="flex gap-2">
                    <button onClick={() => window.dispatchEvent(new Event('open-lead-modal'))} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-[#0009fa] transition-colors">
                      <Globe className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.dispatchEvent(new Event('open-lead-modal'))} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-50 hover:text-[#0009fa] transition-colors">
                      <Mail className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PREMIUM FAQ */}
      <section className="max-w-4xl mx-auto px-6 sm:px-12 py-16 mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1E293B] mb-6 tracking-tight">Frequently Asked Questions</h2>
          <p className="text-lg text-slate-500">
            Everything you need to know about our technology and process.
          </p>
        </div>

        <div className="space-y-0 border-t border-slate-200">
          {[
            "How does the AI generation actually work?",
            "Can I train the AI on my own brand guidelines?",
            "What enterprise security protocols do you follow?",
            "Do you offer custom integrations via API?"
          ].map((q, i) => (
            <div key={i} className="py-6 border-b border-slate-200 cursor-pointer group flex justify-between items-center" onClick={() => window.dispatchEvent(new Event('open-lead-modal'))}>
              <h4 className="text-lg font-bold text-[#1E293B] group-hover:text-[#0009fa] transition-colors">{q}</h4>
              <div className="text-slate-300 group-hover:text-[#0009fa] transition-colors">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
