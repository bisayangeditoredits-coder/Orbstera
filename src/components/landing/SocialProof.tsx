"use client";

import { motion } from 'framer-motion';

export function SocialProof() {
  const stats = [
    { value: '2M+', label: 'Presentations Generated' },
    { value: '85%', label: 'Less Time Spent' },
    { value: '10k+', label: 'Active Teams' },
    { value: '4.9/5', label: 'Average Rating' }
  ];
  
  return (
    <section className="w-full py-16 lg:py-24 bg-slate-50 flex flex-col items-center border-y border-slate-100">
      <div className="max-w-7xl w-full mx-auto px-6 sm:px-12">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-12 sm:mb-16"
        >
          Powering the world's most innovative presentations
        </motion.p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="flex flex-col items-center text-center"
            >
              <div className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-primary tracking-tight mb-2 sm:mb-4">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-slate-600">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
