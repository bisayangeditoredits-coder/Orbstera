"use client";

import { motion } from 'framer-motion';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

export function ResponsiveMockups() {
  return (
    <section className="w-full bg-[#FAFAFA] py-24 sm:py-32 overflow-hidden border-b border-black/[0.04]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-widest mb-6"
          >
            <Smartphone size={14} />
            Web-Native Format
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]"
          >
            Present beautifully <br />
            on any screen.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 leading-relaxed font-medium"
          >
            Stop forcing your audience to pinch and zoom on tiny PDFs. Orbstera presentations are built on web technologies, so they fluidly adapt their layout from ultrawide monitors down to mobile phones.
          </motion.p>
        </div>

        <div className="relative w-full max-w-5xl mx-auto h-[400px] sm:h-[500px] md:h-[600px] flex items-end justify-center perspective-[1000px]">
          
          {/* Desktop Monitor Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="absolute z-10 bottom-0 w-[90%] md:w-[80%] aspect-video bg-white rounded-t-3xl border-t-[8px] border-l-[8px] border-r-[8px] border-slate-200 shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col"
          >
            {/* Fake Browser Bar */}
            <div className="h-6 w-full bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <div className="w-2 h-2 rounded-full bg-slate-300" />
            </div>
            <div className="flex-1 bg-white p-6 sm:p-10 flex gap-6">
               <div className="flex-1 space-y-4">
                  <div className="w-3/4 h-8 bg-slate-200 rounded-lg" />
                  <div className="w-full h-4 bg-slate-100 rounded-full" />
                  <div className="w-5/6 h-4 bg-slate-100 rounded-full" />
                  <div className="w-1/2 h-10 bg-indigo-500 rounded-full mt-6" />
               </div>
               <div className="w-1/3 bg-slate-100 rounded-xl" />
            </div>
          </motion.div>

          {/* iPad Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: -100, y: 50, rotateY: 20 }}
            whileInView={{ opacity: 1, x: 0, y: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute z-20 bottom-0 left-0 sm:left-[5%] w-[35%] md:w-[25%] aspect-[3/4] bg-white rounded-t-3xl border-t-[6px] border-l-[6px] border-r-[6px] border-slate-300 shadow-[20px_-10px_40px_-15px_rgba(0,0,0,0.15)] overflow-hidden"
          >
             <div className="w-full h-full bg-white p-4 flex flex-col gap-4">
                 <div className="w-full h-32 bg-slate-100 rounded-xl" />
                 <div className="w-3/4 h-6 bg-slate-200 rounded-lg" />
                 <div className="w-full h-3 bg-slate-100 rounded-full" />
                 <div className="w-5/6 h-3 bg-slate-100 rounded-full" />
                 <div className="w-full h-8 bg-indigo-500 rounded-full mt-auto" />
             </div>
          </motion.div>

          {/* iPhone Mockup */}
          <motion.div 
            initial={{ opacity: 0, x: 100, y: 50, rotateY: -20 }}
            whileInView={{ opacity: 1, x: 0, y: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute z-30 bottom-0 right-0 sm:right-[10%] w-[25%] md:w-[15%] aspect-[9/19] bg-white rounded-t-[2rem] border-t-[6px] border-l-[6px] border-r-[6px] border-slate-300 shadow-[-20px_-10px_40px_-15px_rgba(0,0,0,0.15)] overflow-hidden"
          >
             {/* Fake Notch */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-4 bg-slate-300 rounded-b-xl z-40" />
             <div className="w-full h-full bg-white p-3 pt-8 flex flex-col gap-3">
                 <div className="w-full h-24 bg-slate-100 rounded-lg" />
                 <div className="w-full h-5 bg-slate-200 rounded-md" />
                 <div className="w-full h-2 bg-slate-100 rounded-full" />
                 <div className="w-3/4 h-2 bg-slate-100 rounded-full" />
                 <div className="w-full h-8 bg-indigo-500 rounded-xl mt-auto" />
             </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
