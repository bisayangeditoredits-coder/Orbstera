"use client";

import { motion } from 'framer-motion';
import { Sparkles, Wand2, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const features = [
  {
    id: 'ai-gen',
    title: 'Skip the blank page. Create brilliance in a flash.',
    description: "Start with an idea or a simple prompt. Orbstera's AI engine instantly generates a full presentation structure, complete with beautiful starting layouts.",
    icon: Sparkles,
    videoSrc: '/Video_Demo-tools/Genfill_VIDEO-DEMO.mp4',
    reverse: false,
  },
  {
    id: 'smart-edit',
    title: 'Edit with AI, in just a click.',
    description: 'Rewrite text, expand on ideas, or change the tone instantly. Our built-in AI assistant helps you refine your message without leaving the slide.',
    icon: Wand2,
    videoSrc: '/Video_Demo-tools/TEXT_TOOL-VIDEO-DEMO.mp4',
    reverse: true,
  },
  {
    id: 'dynamic-layout',
    title: 'Beautiful layouts that adapt automatically.',
    description: 'Never struggle with formatting again. Add content and watch the layout intelligently snap into place, saving you hours of tedious adjustments.',
    icon: LayoutTemplate,
    videoSrc: '/Video_Demo-tools/LAYOUT_TOOL.mp4',
    reverse: false,
  },
];

export function FeatureDemos() {
  return (
    <section className="w-full bg-white py-24 sm:py-32 overflow-hidden border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col gap-24 sm:gap-32">
          {features.map((feature, idx) => (
            <div 
              key={feature.id} 
              className={cn(
                "flex flex-col gap-12 lg:gap-20 items-center",
                feature.reverse ? "lg:flex-row-reverse" : "lg:flex-row"
              )}
            >
              {/* Text Content */}
              <div className="flex-1 max-w-xl lg:max-w-none">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100/50 mb-6">
                    <feature.icon size={20} className="text-indigo-600" strokeWidth={2.5} />
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-5 leading-tight">
                    {feature.title}
                  </h2>
                  <p className="text-lg text-slate-500 leading-relaxed font-medium mb-8">
                    {feature.description}
                  </p>
                  
                  <Link 
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-white font-semibold text-[15px] hover:bg-primaryHover transition-colors shadow-sm"
                  >
                    Start for free
                  </Link>
                </motion.div>
              </div>

              {/* Video Content */}
              <div className="flex-1 w-full relative">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative w-full rounded-2xl sm:rounded-[2rem] overflow-hidden bg-white border border-slate-200 shadow-xl"
                >
                  <video 
                    src={feature.videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-auto object-cover block"
                  />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
