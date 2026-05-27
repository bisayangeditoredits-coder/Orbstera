'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const STATS = [
  { value: '10×', label: 'Faster than traditional tools' },
  { value: '50K+', label: 'Decks created worldwide' },
  { value: '98%', label: 'Would recommend Orbstera' },
];

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
  overlap: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80',
  accent: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=500&q=80',
};

export function AboutUs() {
  return (
    <section className="relative w-full overflow-hidden bg-white py-24 sm:py-32">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-indigo-500/[0.06] blur-3xl"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-violet-500/[0.05] blur-3xl"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Story */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/80 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-700 backdrop-blur-sm"
            >
              <Sparkles size={13} className="text-indigo-500" />
              Our story
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]"
            >
              Presentations shouldn&apos;t take{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                ten hours
              </span>
              .
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 text-lg font-medium leading-relaxed text-slate-600"
            >
              Orbstera was born from a simple frustration: brilliant ideas buried under ugly slides,
              endless formatting, and tools that treat design as an afterthought. We believe every
              founder, student, and creative deserves a deck that looks like it came from a world-class
              agency—without the world-class budget.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-4 text-base leading-relaxed text-slate-500"
            >
              We built an AI-native canvas that understands narrative, motion, and visual hierarchy.
              Type your idea. Watch it become cinematic. Present with confidence.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-10 grid grid-cols-3 gap-4"
            >
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-md"
                >
                  <p className="text-2xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="mt-10"
            >
              <Link
                href="/about"
                className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-sm transition-all hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
              >
                Read our full story
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </div>

          {/* Overlapping imagery */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 aspect-[4/5] w-[78%] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/[0.06]"
            >
              <img
                src={IMAGES.hero}
                alt="Orbstera team collaborating"
                className="h-full w-full object-cover"
              />
              <motion.div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, x: -20 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="absolute -bottom-6 left-0 z-20 w-[52%] overflow-hidden rounded-2xl border border-white/80 shadow-xl ring-1 ring-black/[0.05] backdrop-blur-sm"
            >
              <img
                src={IMAGES.overlap}
                alt="Modern workspace"
                className="aspect-[4/3] w-full object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -20, x: 20 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="absolute -right-2 top-8 z-30 w-[44%] overflow-hidden rounded-2xl border border-white/80 shadow-lg ring-1 ring-black/[0.05]"
            >
              <img
                src={IMAGES.accent}
                alt="Team strategy session"
                className="aspect-square w-full object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="absolute -left-4 top-1/2 z-40 -translate-y-1/2 rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-lg backdrop-blur-xl ring-1 ring-indigo-100/80"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Mission</p>
              <p className="mt-1 max-w-[140px] text-xs font-semibold leading-snug text-slate-700">
                Democratize world-class presentation design.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
