"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';

const faqs = [
  {
    q: "Can I edit the generated presentations?",
    a: "Absolutely. Our AI provides a starting point, but every element—text, images, charts, and shapes—can be fully customized in our 60fps canvas editor."
  },
  {
    q: "Does the exported PPTX work offline?",
    a: "Yes. The exported PPTX file is a standard Microsoft PowerPoint file. It does not require an internet connection to present and works offline perfectly."
  },
  {
    q: "What AI models does Orbstera use?",
    a: "models-list"
  },
  {
    q: "Do you offer team billing?",
    a: "Yes, our Team plan includes centralized billing, shared workspaces, and template libraries for your entire organization."
  }
];

function ModelsList() {
  return (
    <div className="space-y-4">
      <p>We leverage a variety of the most advanced AI models to provide you with the best possible experience. These include:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Claude (Anthropic)</li>
        <li>ChatGPT + DALL-E (OpenAI)</li>
        <li>Gemini + Imagen (Google)</li>
        <li>Flux</li>
        <li>Recraft</li>
        <li>Playground</li>
        <li>Ideogram</li>
        <li>Luma</li>
        <li>Leonardo</li>
      </ul>
      <p>This combination allows us to offer powerful capabilities in text generation, image creation, and design assistance while ensuring your data privacy and security.</p>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full py-24 sm:py-32 px-6 bg-[#FAFAFA] border-b border-black/[0.04]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
           <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-widest mb-6">
             <MessageCircleQuestion size={14} />
             Help Center
           </div>
           <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-slate-300">
              <button
                className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-slate-900"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-lg tracking-tight">{faq.q}</span>
                <ChevronDown className={`text-slate-400 transition-transform ${openIndex === i ? 'rotate-180 text-indigo-500' : ''}`} size={20} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 text-slate-500 font-medium leading-relaxed"
                  >
                    {faq.a === 'models-list' ? <ModelsList /> : faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
