"use client";

import { motion } from 'framer-motion';
import { Layers, Wand2, Download, Zap, MousePointer2, Presentation } from 'lucide-react';

const features = [
  {
    title: "Cinematic Generation",
    description: "Multi-model AI architecture utilizing GPT-5.5 and DeepSeek R1 to craft deep narratives and striking visuals.",
    icon: "/3d_icons/Lamp and Brain.png"
  },
  {
    title: "Pro-Grade Canvas",
    description: "Built on Fabric.js for 60fps drag-and-drop editing. Layer management, snapping, and rich text support.",
    icon: "/3d_icons/Notebook.png"
  },
  {
    title: "Flawless PPTX Export",
    description: "Pixel-perfect export to Microsoft PowerPoint. No missing fonts, broken layouts, or flattened images.",
    icon: "/3d_icons/Exam Paper.png"
  },
  {
    title: "Lightning Fast",
    description: "Edge-cached generations and GPU-accelerated compositing means you never wait for your ideas to manifest.",
    icon: "/3d_icons/Rocket 2.png"
  },
  {
    title: "Fluid Animations",
    description: "Every element supports micro-animations and slide transitions that rival high-end video production.",
    icon: "/3d_icons/Globe.png"
  },
  {
    title: "Real-time Collaboration",
    description: "Work with your team in the same canvas simultaneously with instant sync and conflict resolution.",
    icon: "/3d_icons/Pencil and Paper.png"
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
              className="bg-gradient-to-br from-white/90 via-white/85 to-[#F3F8FF]/50 backdrop-blur-xl border border-[#E1EEFC] p-10 rounded-[32px] hover:border-primary/40 hover:bg-white transition-all duration-300 group cursor-default shadow-sm hover:shadow-[0_20px_50px_rgba(59,130,246,0.12)] hover:-translate-y-1.5 relative overflow-hidden"
            >
              {/* Premium Top-Left Blue Glowing Orb */}
              <div className="absolute -top-16 -left-16 w-32 h-32 bg-primary/[0.03] rounded-full blur-2xl group-hover:bg-primary/[0.09] group-hover:scale-125 transition-all duration-700 pointer-events-none" />

              <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mb-10 border border-primary/20 bg-primary/[0.06] backdrop-blur-xl transition-all duration-500 shadow-[0_12px_32px_rgba(59,130,246,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] group-hover:shadow-[0_16px_40px_rgba(59,130,246,0.22),inset_0_1px_0_rgba(255,255,255,0.6)] group-hover:border-primary/45 group-hover:bg-primary/[0.12] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-white/20 to-transparent pointer-events-none" />
                <motion.img
                  src={feature.icon}
                  alt={feature.title}
                  className="w-14 h-14 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.15)] relative z-10"
                  whileHover={{ scale: 1.15, rotate: -5, y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                />
              </div>
              <h3 className="text-xl font-bold mb-4 text-textMain group-hover:text-primary transition-colors relative z-10">{feature.title}</h3>
              <p className="text-textSecondary text-[15px] leading-relaxed relative z-10">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

