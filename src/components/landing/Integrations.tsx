"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';

const INTEGRATIONS = [
  { name: 'Figma', icon: '/PNGs/Figma.png' },
  { name: 'Notion', icon: '/PNGs/Notion.png' },
  { name: 'Slack', icon: '/PNGs/Slack.png' },
  { name: 'Linear', icon: '/PNGs/Linear.png' },
  { name: 'Framer', icon: '/PNGs/Framer.png' },
  { name: 'Spline', icon: '/PNGs/Spline.png' },
  { name: 'Canva', icon: '/PNGs/Canva.png' },
  { name: 'Keynote', icon: '/PNGs/Keynote.png' },
  { name: 'PowerPoint', icon: '/PNGs/Powerpoint.png' },
  { name: 'Photoshop', icon: '/PNGs/Photoshop.png' },
];

export function Integrations() {
  return (
    <section className="w-full py-20 bg-white relative overflow-hidden border-t border-black/[0.03]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-4"
          >
            Professional Ecosystem
          </motion.p>
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight"
          >
            Fits right into your <span className="text-neutral-400 font-medium italic">creative workflow.</span>
          </motion.h3>
        </div>

        <div className="relative">
          {/* Gradient Masks */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16 items-center opacity-60 hover:opacity-100 transition-opacity duration-500">
            {INTEGRATIONS.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: i * 0.05,
                  type: 'spring',
                  stiffness: 100
                }}
                whileHover={{ 
                  scale: 1.15, 
                  y: -5,
                  filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.1))'
                }}
                className="relative group cursor-pointer"
              >
                <img 
                  src={item.icon} 
                  alt={item.name} 
                  className="w-12 h-12 md:w-16 md:h-16 object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center mt-20 text-neutral-400 text-sm font-medium"
        >
          Export to fully editable formats or present directly in the cloud.
        </motion.p>
      </div>
    </section>
  );
}
