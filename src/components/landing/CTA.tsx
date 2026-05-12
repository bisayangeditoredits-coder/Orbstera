"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTA() {
  return (
    <section className="w-full relative overflow-hidden bg-[#0A0A0A] text-white py-32 px-6 mt-10 rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.05)] border-t border-white/5">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(71,59,240,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />
      
      {/* Floating 3D Icons */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block overflow-hidden">
        <motion.img
          src="/Fintaly - 3D Finance Icons/TROPHY.png"
          animate={{ 
            y: [0, -30, 0],
            rotate: [0, 10, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[5%] w-32 h-32 object-contain filter blur-[1px]"
        />
        <motion.img
          src="/Fintaly - 3D Finance Icons/BRIEFCASE.png"
          animate={{ 
            y: [0, 40, 0],
            rotate: [0, -10, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[20%] right-[5%] w-40 h-40 object-contain filter blur-[2px]"
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold tracking-widest uppercase text-white/80">System Ready</span>
        </div>
        
        <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tighter leading-[1.1]">
          Stop building slides.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-indigo-400">
            Start directing them.
          </span>
        </h2>
        
        <p className="text-xl md:text-2xl text-white/50 mb-12 max-w-2xl font-medium tracking-tight">
          Join the next generation of creative professionals using Orbstera AI to generate cinematic, investor-grade presentations in seconds.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/editor" className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-white text-black rounded-full font-bold overflow-hidden transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">
            <span className="relative z-10 text-lg tracking-tight">Generate Free Presentation</span>
            <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          
          <Link href="/templates" className="group flex items-center justify-center gap-3 px-10 py-5 bg-white/5 text-white border border-white/10 rounded-full font-bold transition-all hover:bg-white/10 w-full sm:w-auto">
            <span className="text-lg tracking-tight">Browse Templates</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
