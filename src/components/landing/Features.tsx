"use client";

import { motion } from 'framer-motion';
import { Layers, Wand2, Download, Zap, MousePointer2, Presentation } from 'lucide-react';

const features = [
  {
    title: "Cinematic Generation",
    description: "Multi-model AI architecture utilizing GPT-5.5 and DeepSeek R1 to craft deep narratives and striking visuals.",
    icon: <img src="/Fintaly - 3D Finance Icons/TERMINAL.png" alt="AI" className="w-12 h-12 object-contain" />
  },
  {
    title: "Pro-Grade Canvas",
    description: "Built on Fabric.js for 60fps drag-and-drop editing. Layer management, snapping, and rich text support.",
    icon: <img src="/Fintaly - 3D Finance Icons/FOLDER.png" alt="Canvas" className="w-12 h-12 object-contain" />
  },
  {
    title: "Flawless PPTX Export",
    description: "Pixel-perfect export to Microsoft PowerPoint. No missing fonts, broken layouts, or flattened images.",
    icon: <img src="/PNGs/Powerpoint.png" alt="PowerPoint" className="w-12 h-12 object-contain" />
  },
  {
    title: "Lightning Fast",
    description: "Edge-cached generations and GPU-accelerated compositing means you never wait for your ideas to manifest.",
    icon: <img src="/Fintaly - 3D Finance Icons/WATCH.png" alt="Speed" className="w-12 h-12 object-contain" />
  },
  {
    title: "Fluid Animations",
    description: "Every element supports micro-animations and slide transitions that rival high-end video production.",
    icon: <img src="/Fintaly - 3D Finance Icons/PIE.png" alt="Animations" className="w-12 h-12 object-contain" />
  },
  {
    title: "Real-time Collaboration",
    description: "Work with your team in the same canvas simultaneously with instant sync and conflict resolution.",
    icon: <img src="/Fintaly - 3D Finance Icons/USER.png" alt="Team" className="w-12 h-12 object-contain" />
  }
];

export function Features() {
  return (
    <section id="features" className="w-full py-32 px-6 bg-surface relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-[11px] font-bold text-primary uppercase tracking-[0.2em] mb-4 block"
          >
            Capabilities
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-montserrat font-bold mb-6 text-textMain">Uncompromising Capability</h2>
          <p className="text-textSecondary text-lg max-w-2xl mx-auto text-balance leading-relaxed">
            Everything you need to produce Series-A quality pitch decks, wrapped in an interface that feels like the future.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-borderSubtle p-10 rounded-[32px] hover:border-primary/30 transition-all group cursor-default shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] group-hover:bg-white group-hover:border-primary/20 transition-all duration-300">
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  className="shrink-0"
                >
                  {feature.icon}
                </motion.div>
              </div>
              <h3 className="text-xl font-bold mb-4 text-textMain group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="text-textSecondary text-[15px] leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
