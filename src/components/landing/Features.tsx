"use client";

import { motion } from 'framer-motion';
import { Layers, Wand2, Download, Zap, MousePointer2, Presentation } from 'lucide-react';

const features = [
  {
    title: "Cinematic Generation",
    description: "Multi-model AI architecture utilizing DeepSeek V3 and Claude 3.5 Sonnet to craft deep narratives and striking visuals.",
    icon: <Wand2 className="text-primary" size={24} />
  },
  {
    title: "Pro-Grade Canvas",
    description: "Built on Fabric.js for 60fps drag-and-drop editing. Layer management, snapping, and rich text support.",
    icon: <Layers className="text-secondary" size={24} />
  },
  {
    title: "Flawless PPTX Export",
    description: "Pixel-perfect export to Microsoft PowerPoint. No missing fonts, broken layouts, or flattened images.",
    icon: <Download className="text-accent" size={24} />
  },
  {
    title: "Lightning Fast",
    description: "Edge-cached generations and GPU-accelerated compositing means you never wait for your ideas to manifest.",
    icon: <Zap className="text-primary" size={24} />
  },
  {
    title: "Fluid Animations",
    description: "Every element supports micro-animations and slide transitions that rival high-end video production.",
    icon: <Presentation className="text-secondary" size={24} />
  },
  {
    title: "Real-time Collaboration",
    description: "Work with your team in the same canvas simultaneously with instant sync and conflict resolution.",
    icon: <MousePointer2 className="text-accent" size={24} />
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
              <div className="bg-panel w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border border-borderSubtle group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <span className="group-hover:text-white transition-colors">
                  {feature.icon}
                </span>
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
