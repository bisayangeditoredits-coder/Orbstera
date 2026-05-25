'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { ArrowRight, Calendar, User } from '@/components/icons/lucide';

const FEATURED = {
  title: "The Future of AI in Boardrooms",
  excerpt: "How generative AI is fundamentally changing the way executives prepare for weekly syncs, quarterly reviews, and investor roadshows — and why the old way is already dead.",
  category: "AI Trends",
  date: "Oct 12, 2026",
  author: "Alex Sterling",
  image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80",
};

const POSTS = [
  {
    title: "5 Tips for Better Prompts",
    excerpt: "Learn how to write the perfect prompt to get a 10-slide masterpiece from Orbstera's AI engine.",
    category: "Tutorials",
    date: "Sep 28, 2026",
    author: "Samantha Lee",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Why We Chose Next.js for Orbstera",
    excerpt: "A deep dive into our tech stack and how we achieved sub-second render times at scale.",
    category: "Engineering",
    date: "Sep 15, 2026",
    author: "Marcus Johnson",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Designing for AI: Glassmorphism",
    excerpt: "Breaking down the UI choices that make Orbstera feel futuristic yet grounded in clarity.",
    category: "Design",
    date: "Aug 30, 2026",
    author: "Elena Rodriguez",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "The Ethics of AI Generation",
    excerpt: "How we ensure our AI models are safe, unbiased, and genuinely helpful to every user.",
    category: "Ethics",
    date: "Aug 15, 2026",
    author: "Alex Sterling",
    image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=800&q=80"
  },
  {
    title: "Mastering Storytelling with Data",
    excerpt: "Transform your boring charts and tables into compelling, executive-level narratives.",
    category: "Tutorials",
    date: "Aug 01, 2026",
    author: "Elena Rodriguez",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
  }
];

const CATEGORIES = ["All", "AI Trends", "Engineering", "Design", "Tutorials", "Ethics"];

export default function BlogPage() {
  const [active, setActive] = React.useState("All");

  const filtered = active === "All" ? POSTS : POSTS.filter(p => p.category === active);

  return (
    <main className="min-h-screen w-full bg-white pt-24 font-sans text-slate-900 overflow-x-hidden">

      {/* ── 1. EDITORIAL HERO ── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-12 pb-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 mb-6 shadow-sm">
              <div className="w-1.5 h-1.5 bg-[#0009fa] rounded-full" />
              Orbstera Journal
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-[#1E293B]">
              Insights &amp; Resources
            </h1>
          </div>
          <p className="text-slate-500 max-w-xs text-sm leading-relaxed">
            Deep dives on AI, design, and the future of how the world communicates.
          </p>
        </div>

        {/* Featured post — full-width magazine card */}
        <div className="w-full h-[520px] relative overflow-hidden border border-slate-100 shadow-lg group cursor-pointer">
          <img
            src={FEATURED.image}
            alt={FEATURED.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute top-6 left-6 bg-white text-[#0009fa] text-xs font-bold px-3 py-1 uppercase tracking-widest">
            {FEATURED.category}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <div className="flex items-center gap-4 text-white/60 text-xs mb-4">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{FEATURED.date}</span>
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{FEATURED.author}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tighter max-w-3xl mb-6 leading-tight">
              {FEATURED.title}
            </h2>
            <p className="text-white/70 max-w-xl text-sm leading-relaxed mb-8">{FEATURED.excerpt}</p>
            <button
              onClick={() => window.dispatchEvent(new Event('open-lead-modal'))}
              className="inline-flex items-center gap-2 bg-white text-[#1E293B] font-bold text-sm px-6 py-3 hover:bg-[#0009fa] hover:text-white transition-colors group/btn"
            >
              Read Full Article <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. CATEGORY FILTER ── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 py-10 flex items-center gap-4 flex-wrap border-b border-slate-100">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
              active === cat
                ? 'bg-[#1E293B] text-white border-[#1E293B]'
                : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* ── 3. POST GRID ── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 py-16 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-slate-100">
          {filtered.map((post, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="border-b border-r border-slate-100 group cursor-pointer flex flex-col bg-white hover:bg-slate-50 transition-colors"
              onClick={() => window.dispatchEvent(new Event('open-lead-modal'))}
            >
              <div className="w-full h-52 overflow-hidden relative">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-white text-[#0009fa] text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
                  {post.category}
                </div>
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center text-slate-400 text-[11px] font-medium gap-4 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-3 group-hover:text-[#0009fa] transition-colors leading-snug tracking-tight">
                  {post.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2 flex-1">
                  {post.excerpt}
                </p>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#0009fa] uppercase tracking-widest group-hover:gap-3 transition-all">
                  Read Article <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 4. EMAIL SUBSCRIPTION CTA ── */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-12 text-center">
          <p className="text-blue-200 text-xs font-bold uppercase tracking-[0.25em] mb-4">Stay Informed</p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-6">
            Join 12,000+ professionals<br/>reading Orbstera Journal
          </h2>
          <p className="text-blue-100/70 mb-10 max-w-md mx-auto">
            Weekly insights on AI, design, and the future of presentations. Zero spam. Unsubscribe anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 bg-white/15 border border-white/25 text-white placeholder:text-white/40 px-5 py-4 text-sm outline-none focus:border-white/60 transition-colors"
            />
            <button
              onClick={() => window.dispatchEvent(new Event('open-lead-modal'))}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs uppercase tracking-widest px-8 py-4 transition-colors shrink-0"
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
