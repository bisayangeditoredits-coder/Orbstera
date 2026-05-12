"use client";

import { motion } from 'framer-motion';

export function SocialProof() {
  const brands = ['Foresight', 'Goodwell', 'Luminary', 'Magnolia', 'Norse Star', 'Mastermind'];
  
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
              {[...brands, ...brands].map((brand, i) => (
                <div key={`set1-${i}`} className="flex items-center gap-2.5 sm:gap-3 opacity-[0.35] hover:opacity-100 transition-all duration-300 cursor-pointer grayscale hover:grayscale-0 shrink-0 group">
                   <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-black/[0.04] group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-black/20 group-hover:bg-primary/60 rounded-full transition-colors" />
                   </div>
                   <span className="text-lg sm:text-xl font-extrabold text-neutral-800 tracking-tighter uppercase italic whitespace-nowrap">
                     {brand}
                   </span>
                </div>
              ))}
            </div>
            
            {/* Second Set (Perfect Duplicate for seamless looping) */}
            <div className="flex gap-x-12 sm:gap-x-20 pr-12 sm:pr-20 w-max items-center">
              {[...brands, ...brands].map((brand, i) => (
                <div key={`set2-${i}`} className="flex items-center gap-2.5 sm:gap-3 opacity-[0.35] hover:opacity-100 transition-all duration-300 cursor-pointer grayscale hover:grayscale-0 shrink-0 group">
                   <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-black/[0.04] group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-black/20 group-hover:bg-primary/60 rounded-full transition-colors" />
                   </div>
                   <span className="text-lg sm:text-xl font-extrabold text-neutral-800 tracking-tighter uppercase italic whitespace-nowrap">
                     {brand}
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
