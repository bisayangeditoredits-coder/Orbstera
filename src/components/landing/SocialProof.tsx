"use client";

import { motion } from 'framer-motion';

export function SocialProof() {
  const brands = ['Foresight', 'Goodwell', 'Luminary', 'Magnolia', 'Norse Star', 'Mastermind'];
  
  return (
    <section className="w-full py-16 bg-white flex flex-col items-center overflow-hidden border-y border-blue-50/50">
      <p className="text-[10px] font-bold text-textMuted uppercase tracking-[0.3em] mb-12 opacity-60">
        Trusted by the world&apos;s most innovative teams
      </p>
      
      <div className="relative w-full">
        {/* Gradient Overlays for smooth fading */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10" />
        
        {/* Infinite Scrolling Container with Framer Motion */}
        <div className="flex w-fit">
          <motion.div 
            animate={{
              x: [0, -1032], // Adjust based on width
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex gap-x-24 px-12"
          >
            {[...brands, ...brands, ...brands, ...brands].map((brand, i) => (
              <div key={i} className="flex items-center gap-3 opacity-30 hover:opacity-100 transition-all cursor-pointer grayscale hover:grayscale-0">
                 <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary/40 rounded-full" />
                 </div>
                 <span className="text-xl font-extrabold text-textMain tracking-tighter uppercase italic whitespace-nowrap">
                   {brand}
                 </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
