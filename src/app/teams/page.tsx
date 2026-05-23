'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { Network } from 'lucide-react';

const TEAM = [
  { name: "Sophia Carter", role: "Chief Executive Officer", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" },
  { name: "Yudhi Carter", role: "Chief Operating Officer", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100&q=80" },
  { name: "Ethan Walker", role: "Chief Technology", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80" },
  { name: "Liam Anderson", role: "Business Development", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80" },
  { name: "Olivia Chen", role: "UI/UX Designer", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&q=80" }
];

export default function TeamsPage() {
  const topTeam = TEAM.slice(0, 2);
  const bottomTeam = TEAM.slice(2);

  return (
    <main className="min-h-screen w-full bg-white pt-24 font-sans text-slate-900 overflow-x-hidden">
      
      {/* 1. HERO HEADER */}
      <section className="max-w-6xl mx-auto px-6 sm:px-12 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 border border-slate-200 px-4 py-1.5 rounded-full text-sm mb-6 shadow-sm"
        >
          <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full" />
          <span className="font-medium text-slate-700">Team</span>
        </motion.div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-[#1E293B]"
          >
            Meet the Minds Building
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-medium text-slate-600 max-w-xs"
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </motion.p>
        </div>
      </section>

      {/* 2. TOP TEAM (2 Columns) */}
      <section className="max-w-6xl mx-auto px-6 sm:px-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {topTeam.map((member, i) => (
            <div key={i} className="rounded-none sm:rounded-[20px] border border-slate-100 shadow-sm flex flex-col relative bg-white overflow-hidden group">
              <div className="w-full h-[320px] sm:h-[380px] relative overflow-hidden bg-slate-100">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                <div className="absolute top-6 left-6 bg-white px-4 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-2">
                   <div className="w-2 h-2 bg-[#3B82F6] rounded-full" />
                   Our Team
                </div>
                <div className="absolute top-6 right-6 w-10 h-10 bg-[#3B82F6] rounded-lg text-white flex items-center justify-center shadow-md">
                   <Network className="w-5 h-5" />
                </div>
              </div>
              
              <div className="p-8 relative bg-white min-h-[160px] flex flex-col justify-end">
                {/* Dots background layer restricted to right side */}
                <div className="absolute inset-y-0 right-0 w-1/2 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0298D5 1.5px, transparent 1.5px)', backgroundSize: '12px 12px', backgroundPosition: 'bottom right' }}></div>
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                   <h3 className="text-3xl font-bold text-[#1E293B] mb-1">{member.name}</h3>
                   <p className="text-[#3B82F6] font-bold text-base mb-6">{member.role}</p>
                   
                   <button onClick={() => window.dispatchEvent(new Event('open-lead-modal'))} className="px-6 py-2 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors bg-white">
                     View Profile
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. BOTTOM TEAM (3 Columns) */}
      <section className="max-w-6xl mx-auto px-6 sm:px-12 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {bottomTeam.map((member, i) => (
            <div key={i} className="rounded-none sm:rounded-[20px] border border-slate-100 shadow-sm flex flex-col relative bg-white overflow-hidden group">
              <div className="w-full h-[280px] sm:h-[320px] relative overflow-hidden bg-slate-100">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                <div className="absolute top-5 left-5 bg-white px-3 py-1 rounded-full text-[11px] font-semibold text-slate-700 shadow-sm flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full" />
                   Our Team
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-[#3B82F6] rounded-md text-white flex items-center justify-center shadow-md">
                   <Network className="w-4 h-4" />
                </div>
              </div>
              
              <div className="p-5 relative bg-white">
                 <div className="flex items-center gap-4">
                    <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                    <div className="min-w-0">
                       <h3 className="text-lg font-bold text-[#1E293B] truncate">{member.name}</h3>
                       <p className="text-slate-500 text-xs font-medium truncate">{member.role}</p>
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
