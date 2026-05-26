"use client";

import { motion } from 'framer-motion';

export function EditorPreview() {
  return (
    <section className="w-full py-32 px-6 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] opacity-50" />
      
      <div className="max-w-7xl mx-auto text-center mb-16 relative z-10">
        <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-4">Precision Control</h2>
        <p className="text-textMuted text-lg max-w-2xl mx-auto text-balance">
          AI generated. Human perfected. Take full control of every pixel in our 60fps canvas editor.
        </p>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-2 md:p-4 rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden"
        >
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] md:aspect-[21/9] w-full bg-slate-100">
            {/* High quality Unsplash image of a professional team presentation */}
            <img 
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop" 
              alt="Professional team presentation" 
              className="w-full h-full object-cover"
            />
            
            {/* Subtle elegant gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
