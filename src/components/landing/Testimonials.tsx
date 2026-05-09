"use client";

import { motion } from 'framer-motion';

const testimonials = [
  {
    quote:
      "It used to take me 6 hours to build a Series A deck. Now it takes 15 minutes, and the result looks like I hired a full agency.",
    author: "Sarah J.",
    role: "Founder & CEO, Nexus",
    initials: "SJ",
    color: "from-primary to-purple-500",
  },
  {
    quote:
      "The ability to just type my thoughts and have them instantly structured into a beautiful narrative is literally magic.",
    author: "Michael T.",
    role: "Marketing Director",
    initials: "MT",
    color: "from-secondary to-emerald-500",
  },
  {
    quote:
      "PPTMaker's export actually works. The fonts, the layers, the layout — everything translates perfectly into PowerPoint.",
    author: "Elena R.",
    role: "Creative Lead",
    initials: "ER",
    color: "from-accent to-rose-500",
  },
  {
    quote:
      "I pitched to a VC using a PPTMaker deck on Monday. Got a second meeting on Wednesday. Coincidence? I think not.",
    author: "James K.",
    role: "Co-founder, Stellar AI",
    initials: "JK",
    color: "from-blue-500 to-cyan-500",
  },
];

export function Testimonials() {
  return (
    <section className="w-full py-32 px-6 bg-surface border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-4">
            Loved by Creators
          </h2>
          <p className="text-textMuted max-w-xl mx-auto">
            From solo founders to enterprise teams &mdash; here&apos;s what people are saying.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 flex flex-col gap-6"
            >
              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, s) => (
                  <span key={s} className="text-yellow-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-textMain leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold`}>
                  {t.initials}
                </div>
                <div>
                  <div className="font-medium text-sm text-textMain">{t.author}</div>
                  <div className="text-textMuted text-xs">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
