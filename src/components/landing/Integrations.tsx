"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';

const INTEGRATIONS = [
  { name: "PowerPoint", icon: "/pngs/Powerpoint.png" },
  { name: "Keynote", icon: "/pngs/Keynote.png" },
  { name: "Canva", icon: "/pngs/Canva.png" },
  { name: "Figma", icon: "/pngs/Figma.png" },
  { name: "Notion", icon: "/pngs/Notion.png" },
  { name: "Slack", icon: "/pngs/Slack.png" },
  { name: "Zoom", icon: "/pngs/Zoom.png" },
  { name: "Photoshop", icon: "/pngs/Photoshop.png" },
  { name: "Visual Studio Code", icon: "/pngs/Visual Studio Code.png" },
  { name: "Google Chrome", icon: "/pngs/Chrome.png" },
  { name: "Excel", icon: "/pngs/Excel.png" },
  { name: "Word", icon: "/pngs/Word.png" },
];

export function Integrations() {
  return (
    <section className="w-full py-32 bg-white relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-6"
          >
            Universal Compatibility
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-neutral-900 tracking-tighter mb-6"
          >
            Fits right into your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">existing workflow</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-neutral-500 text-lg md:text-xl max-w-2xl mx-auto font-medium tracking-tight"
          >
            Orbstera doesn&apos;t replace your favorite tools. It makes them better. Export, sync, and present across all major platforms.
          </motion.p>
        </div>

        {/* Floating Icons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8">
          {INTEGRATIONS.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ 
                delay: i * 0.05,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              whileHover={{ y: -8, scale: 1.05 }}
              className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-white border border-black/[0.04] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] hover:border-primary/20 transition-all duration-300 group cursor-default"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-4 transition-transform duration-500 group-hover:rotate-[5deg] flex items-center justify-center">
                <img
                  src={encodeURI(item.icon)}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-contain drop-shadow-[0_8px_15px_rgba(0,0,0,0.1)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0.3';
                  }}
                />
              </div>
              <span className="text-[12px] font-bold text-neutral-400 group-hover:text-neutral-900 transition-colors tracking-tight uppercase">
                {item.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bottom Feature Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-20 p-8 rounded-[2.5rem] bg-gradient-to-b from-neutral-50 to-white border border-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900 tracking-tight">Direct .PPTX Export</h4>
              <p className="text-sm text-neutral-500 font-medium tracking-tight">Native support for all Microsoft Office versions</p>
            </div>
          </div>
          <div className="h-px w-full md:w-px md:h-12 bg-black/[0.06]" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900 tracking-tight">Cloud Syncing</h4>
              <p className="text-sm text-neutral-500 font-medium tracking-tight">Access your decks anywhere with Google Workspace</p>
            </div>
          </div>
          <div className="h-px w-full md:w-px md:h-12 bg-black/[0.06]" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-neutral-900 tracking-tight">One-Click Share</h4>
              <p className="text-sm text-neutral-500 font-medium tracking-tight">Instantly share private links with clients</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
