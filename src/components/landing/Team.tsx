'use client';

import { motion } from 'framer-motion';
import { Share2, Globe } from 'lucide-react';

const TEAM = [
  {
    name: 'Alexandra Chen',
    role: 'Founder & CEO',
    bio: 'Former product lead at a Series C startup. Obsessed with making complex ideas visually irresistible.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Marcus Okonkwo',
    role: 'Chief AI Officer',
    bio: 'PhD in ML systems. Architected Orbstera\'s multi-model orchestration and generative fill pipeline.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Sofia Laurent',
    role: 'Head of Design',
    bio: 'Ex-agency creative director. Defines every layout, motion curve, and pixel of the Orbstera experience.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'James Park',
    role: 'VP of Engineering',
    bio: 'Built real-time collaboration infra at scale. Keeps the canvas buttery-smooth at 60fps.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Priya Sharma',
    role: 'Head of Growth',
    bio: 'Scaled two B2B SaaS products past $10M ARR. Leads partnerships and our global creator community.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Daniel Reyes',
    role: 'Director of Customer Success',
    bio: 'Former enterprise solutions architect. Ensures every team ships decks they\'re proud to present.',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
  },
];

export function Team() {
  return (
    <section className="relative w-full overflow-hidden bg-[#FAFAFA] py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)]" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-600"
          >
            Meet the team
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
          >
            Built by designers, engineers &amp; storytellers.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-lg font-medium leading-relaxed text-slate-600"
          >
            A small, elite team obsessed with one thing: making you look extraordinary every time you
            hit Present.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TEAM.map((member, i) => (
            <motion.article
              key={member.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.08 * i }}
              className="group relative overflow-hidden rounded-3xl border border-white/80 bg-white/60 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/[0.08] hover:ring-indigo-200/60"
            >
              <p className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100 from-indigo-500/[0.04] to-transparent" />

              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/25 via-violet-600/10 to-transparent opacity-70" />
                <motion.div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100"
                />

                <div className="absolute inset-x-0 bottom-0 p-6 translate-y-2 transition-transform duration-500 group-hover:translate-y-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/90">
                    {member.role}
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-white">{member.name}</h3>
                  <p className="mt-2 max-h-0 overflow-hidden text-sm leading-relaxed text-white/75 opacity-0 transition-all duration-500 group-hover:max-h-24 group-hover:opacity-100">
                    {member.bio}
                  </p>
                  <div className="mt-4 flex gap-2 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`${member.name} on LinkedIn`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
                    >
                      <Share2 size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${member.name} profile`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
                    >
                      <Globe size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-16 max-w-2xl rounded-2xl border border-indigo-100/80 bg-white/70 px-6 py-5 text-center shadow-sm backdrop-blur-md ring-1 ring-black/[0.03]"
        >
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            We&apos;re hiring across AI, design, and growth.{' '}
            <a href="/contact" className="font-bold text-indigo-600 underline-offset-2 hover:underline">
              Join us
            </a>{' '}
            and help redefine how the world presents ideas.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
