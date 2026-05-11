"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

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
    q: "Which AI models do you use?",
    a: "A multi-agent pipeline runs automatically: your prompt is refined, analyzed, and composed with the best OpenRouter models for each step—no manual mode selection."
  },
  {
    q: "Do you offer team billing?",
    a: "Yes, our Team plan includes centralized billing, shared workspaces, and template libraries for your entire organization."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full py-32 px-6 bg-background">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold text-center mb-16">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/10 rounded-xl overflow-hidden bg-surface/50 backdrop-blur-sm">
              <button
                className="w-full px-6 py-4 flex items-center justify-between text-left font-medium"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span>{faq.q}</span>
                <ChevronDown className={`transition-transform ${openIndex === i ? 'rotate-180' : ''}`} size={20} />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-4 text-textMuted text-sm"
                  >
                    {faq.a}
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
