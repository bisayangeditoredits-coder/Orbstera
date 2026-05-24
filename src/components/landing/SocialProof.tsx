"use client";

import { motion } from 'framer-motion';

export function SocialProof() {
  const brands = [
    { name: 'Axiom', color: 'bg-indigo-500', shape: 'rounded-sm', font: 'font-black tracking-tighter uppercase' },
    { name: 'Nebula', color: 'bg-rose-500', shape: 'rounded-full', font: 'font-bold tracking-tight' },
    { name: 'Capsule', color: 'bg-primary', shape: 'rounded-[1px] rotate-45', font: 'font-extrabold lowercase tracking-tighter' },
    { name: 'Synthetix', color: 'bg-emerald-500', shape: 'rounded-[4px]', font: 'font-semibold tracking-widest uppercase text-[15px]' },
    { name: 'Loomis', color: 'bg-amber-500', shape: 'rounded-full', font: 'font-serif font-bold italic tracking-tight' },
    { name: 'Polymath', color: 'bg-violet-500', shape: 'rounded-tl-lg rounded-br-lg', font: 'font-bold tracking-normal' }
  ];
  
  return (
    <section className="w-full py-16 bg-white flex flex-col items-center overflow-hidden border-y border-blue-50/50">
      <p className="text-[10px] font-bold text-textMuted uppercase tracking-[0.3em] mb-12 opacity-60">
        Trusted by the world&apos;s most innovative teams
      </p>
      
      <div className="relative w-full max-w-full overflow-hidden">
        {/* Gradient Overlays for smooth fading */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        
        {/* Infinite Scrolling Container with Framer Motion */}
        <div className="flex w-max">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="flex hover:[animation-play-state:paused]"
          >
            {/* First Set */}
            <div className="flex gap-x-12 sm:gap-x-20 pr-12 sm:pr-20 w-max items-center">
              {[...brands, ...brands, ...brands].map((brand, i) => (
                <div key={`set1-${i}`} className="flex items-center gap-2.5 sm:gap-3 opacity-[0.4] hover:opacity-100 transition-all duration-300 cursor-pointer grayscale hover:grayscale-0 shrink-0 group">
                   <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-50 border border-slate-200 group-hover:border-transparent group-hover:shadow-sm flex items-center justify-center transition-all">
                      <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${brand.color} ${brand.shape} opacity-60 group-hover:opacity-100 transition-opacity`} />
                   </div>
                   <span className={`text-lg sm:text-xl text-neutral-800 whitespace-nowrap ${brand.font}`}>
                     {brand.name}
                   </span>
                </div>
              ))}
            </div>
            
            {/* Second Set (Perfect Duplicate for seamless looping) */}
            <div className="flex gap-x-12 sm:gap-x-20 pr-12 sm:pr-20 w-max items-center">
              {[...brands, ...brands, ...brands].map((brand, i) => (
                <div key={`set2-${i}`} className="flex items-center gap-2.5 sm:gap-3 opacity-[0.4] hover:opacity-100 transition-all duration-300 cursor-pointer grayscale hover:grayscale-0 shrink-0 group">
                   <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-50 border border-slate-200 group-hover:border-transparent group-hover:shadow-sm flex items-center justify-center transition-all">
                      <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${brand.color} ${brand.shape} opacity-60 group-hover:opacity-100 transition-opacity`} />
                   </div>
                   <span className={`text-lg sm:text-xl text-neutral-800 whitespace-nowrap ${brand.font}`}>
                     {brand.name}
                   </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
