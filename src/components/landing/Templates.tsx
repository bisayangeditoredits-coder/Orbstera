"use client";

import { motion } from 'framer-motion';

const templates = [
  { name: 'Pitch Deck V1', category: 'Startup', gradient: 'from-blue-500/20 to-purple-500/20' },
  { name: 'Quarterly Review', category: 'Corporate', gradient: 'from-emerald-500/20 to-teal-500/20' },
  { name: 'Creative Portfolio', category: 'Agency', gradient: 'from-orange-500/20 to-pink-500/20' },
  { name: 'Product Launch', category: 'Marketing', gradient: 'from-primary/20 to-secondary/20' },
  { name: 'Series A Master', category: 'Startup', gradient: 'from-indigo-500/20 to-cyan-500/20' },
  { name: 'Brand Guidelines', category: 'Design', gradient: 'from-rose-500/20 to-red-500/20' },
];

export function Templates() {
  return (
    <section id="templates" className="w-full py-32 px-6 bg-surface border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-4">Curated Starting Points</h2>
            <p className="text-textMuted text-lg max-w-xl">
              Don&apos;t want to start with a prompt? Choose from our library of handcrafted, responsive templates.
            </p>
          </div>
          <button className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors">
            View All Templates
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className={`aspect-video rounded-xl bg-gradient-to-br ${tpl.gradient} border border-white/10 mb-4 overflow-hidden relative`}>
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <div className="text-xs text-white/70 mb-1">{tpl.category}</div>
                  <h3 className="font-semibold text-white">{tpl.name}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
