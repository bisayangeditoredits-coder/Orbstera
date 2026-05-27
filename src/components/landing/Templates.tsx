"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Lock, Sparkles, Crown } from 'lucide-react';

// Rich visual previews per template slug
const TEMPLATE_PREVIEWS: Record<string, React.ReactNode> = {
  'seq-pitch': (
    <div className="w-full h-full flex flex-col justify-between p-5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
          <div className="w-3 h-3 rounded-sm bg-white/80" />
        </div>
        <div className="h-2 rounded-full bg-white/20 w-20" />
        <div className="ml-auto h-2 rounded-full bg-blue-400/40 w-10" />
      </div>
      <div>
        <div className="h-4 rounded-lg bg-white/90 w-3/4 mb-2" />
        <div className="h-2.5 rounded-full bg-white/30 w-full mb-1.5" />
        <div className="h-2.5 rounded-full bg-white/20 w-5/6 mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {['TAM', 'ARR', 'NPS'].map((label) => (
            <div key={label} className="rounded-xl p-2" style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.3)' }}>
              <div className="text-[8px] font-bold text-blue-300 mb-1">{label}</div>
              <div className="h-3 rounded bg-white/40 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  'obsidian-cyber': (
    <div className="w-full h-full flex flex-col justify-between p-5" style={{ background: 'linear-gradient(135deg, #000000 0%, #0d0d1a 100%)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-2 rounded-full bg-violet-500/60 w-16" />
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-violet-500/80" />
          <div className="w-2 h-2 rounded-full bg-cyan-500/80" />
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <div className="h-5 rounded-lg mb-2 w-4/5" style={{ background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', opacity: 0.9 }} />
        <div className="h-2 rounded-full bg-white/15 w-full mb-1" />
        <div className="h-2 rounded-full bg-white/10 w-2/3 mb-4" />
        <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)' }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-violet-500/40" />
            <div className="h-2 rounded-full bg-violet-300/50 flex-1" />
          </div>
        </div>
      </div>
    </div>
  ),
  'b2b-sales': (
    <div className="w-full h-full flex flex-col justify-between p-5" style={{ background: 'linear-gradient(135deg, #0369a1 0%, #1d4ed8 100%)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 rounded-full bg-white/80 w-24" />
        <div className="ml-auto h-2 rounded-full bg-sky-200/50 w-12" />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-2.5 bg-white/10 border border-white/15">
          <div className="text-[7px] font-bold text-sky-200 mb-1.5">ROI</div>
          <div className="h-6 rounded bg-white/30 w-full" />
        </div>
        <div className="rounded-xl p-2.5 bg-white/10 border border-white/15">
          <div className="text-[7px] font-bold text-sky-200 mb-1.5">vs. Competitors</div>
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-white/60 w-full" />
            <div className="h-1.5 rounded-full bg-white/30 w-3/4" />
            <div className="h-1.5 rounded-full bg-white/20 w-1/2" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-white/10 rounded-xl p-2">
        <div className="w-5 h-5 rounded-lg bg-green-400/80" />
        <div className="h-2 rounded-full bg-white/60 w-24" />
        <div className="ml-auto h-2 rounded-full bg-green-300/60 w-10" />
      </div>
    </div>
  ),
  'data-to-deck': (
    <div className="w-full h-full flex flex-col justify-between p-5" style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #c026d3 100%)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="text-[7px] font-bold text-white/80">https://</div>
        </div>
        <div className="h-2 rounded-full bg-white/20 flex-1" />
        <div className="w-4 h-4 rounded-md bg-white/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-sm bg-fuchsia-300/80" />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[8px] font-bold text-fuchsia-200">AI EXTRACTING →</div>
      </div>
      <div className="space-y-1.5">
        {['Mission', 'Team', 'Services', 'Traction'].map((label) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-300" />
            <div className="h-2 rounded-full bg-white/25 flex-1" />
            <div className="text-[7px] text-white/40">{label}</div>
          </div>
        ))}
      </div>
    </div>
  ),
  'swiss-minimal': (
    <div className="w-full h-full flex flex-col justify-between p-5 bg-white">
      <div className="flex items-end gap-4 mb-3">
        <div className="w-1 h-12 bg-neutral-900 rounded-full" />
        <div>
          <div className="h-5 rounded-sm bg-neutral-900 w-32 mb-1" />
          <div className="h-2 rounded-sm bg-neutral-300 w-20" />
        </div>
      </div>
      <div className="flex-1 flex items-center">
        <div className="text-[32px] font-bold text-neutral-900/10 leading-none tracking-tighter select-none">THINK</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-px flex-1 bg-neutral-200" />
        <div className="mx-3 text-[8px] font-bold tracking-widest text-neutral-400">01 / 12</div>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
    </div>
  ),
  'yc-demo': (
    <div className="w-full h-full flex flex-col justify-between p-5" style={{ background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)' }}>
      <div className="flex items-center justify-between">
        <div className="text-[8px] font-bold text-white/60 tracking-widest">DEMO DAY</div>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(n => (
            <div key={n} className="w-1.5 h-1.5 rounded-full bg-white/40" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-3">
        <div className="text-[9px] font-bold text-orange-200 tracking-widest mb-2">TRACTION</div>
        <div className="text-[28px] font-bold text-white leading-none mb-1">$10K</div>
        <div className="text-[8px] text-white/60 font-bold">MRR · 3 months</div>
      </div>
      <div className="bg-white/15 rounded-xl p-2.5 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-white/20" />
        <div>
          <div className="h-2 rounded-full bg-white/70 w-20 mb-1" />
          <div className="h-1.5 rounded-full bg-white/30 w-14" />
        </div>
      </div>
    </div>
  ),
};

const FALLBACK_TEMPLATES = [
  { id: "seq-pitch", slug: "seq-pitch", title: "Series A Pitch Deck", description: "The classic 12-slide VC structure. Market, traction, team, and ask.", category: "Frameworks", is_premium: false },
  { id: "obsidian-cyber", slug: "obsidian-cyber", title: "Obsidian Cyber", description: "Cyberpunk dark mode with neon accents for AI, Web3, and DevTools.", category: "Aesthetics", is_premium: true },
  { id: "b2b-sales", slug: "b2b-sales", title: "Enterprise Sales Playbook", description: "ROI breakdown, competitor matrix, and 2 case studies for B2B.", category: "Frameworks", is_premium: false },
];

export function Templates() {
  const [templates, setTemplates] = useState<any[]>(FALLBACK_TEMPLATES);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/templates', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data && data.length > 0) setTemplates(data.slice(0, 3)); })
      .catch(e => { if (e.name !== 'AbortError') { /* ignore, fallback templates shown */ } });
    return () => controller.abort();
  }, []);

  return (
    <section id="templates" className="w-full py-32 px-6 bg-[#FAFAFA] border-y border-black/[0.05] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(71,59,240,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/[0.05] shadow-sm mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-600">Starting Points</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-neutral-900 tracking-tighter">
              The Prompt <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Library</span>
            </h2>
            <p className="text-neutral-500 text-lg max-w-xl tracking-tight font-medium">
              Don&apos;t want to start with a blank prompt? Choose from our library of handcrafted, responsive AI frameworks.
            </p>
          </div>
          <Link href="/templates" className="px-6 py-3 rounded-full bg-neutral-900 text-white font-bold text-sm hover:bg-black transition-colors flex items-center gap-2 shadow-lg">
            View Full Library <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl, i) => {
            const preview = TEMPLATE_PREVIEWS[tpl.slug || tpl.id];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={`/templates/${tpl.slug || tpl.id}`}
                  className="group block relative bg-white rounded-[2rem] border border-black/[0.05] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(71,59,240,0.15)] transition-all duration-500 overflow-hidden"
                >
                  {/* Rich Slide Preview Thumbnail */}
                  <div className="relative h-48 rounded-[1.5rem] overflow-hidden">
                    {preview ? (
                      <div className="w-full h-full">{preview}</div>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${tpl.color_gradient || 'from-gray-200 to-gray-300'} flex items-center justify-center`}>
                        <div className="text-white/30 text-4xl font-bold tracking-tighter">{tpl.title?.[0]}</div>
                      </div>
                    )}

                    {/* Slide chrome overlay — makes it look like a real slide */}
                    <div className="absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/10 pointer-events-none" />

                    {/* Premium badge */}
                    {tpl.is_premium && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <Crown size={10} className="text-amber-400" />
                        <span className="text-[9px] font-bold text-amber-300 tracking-wide">PRO</span>
                      </div>
                    )}

                    {/* Category pill */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {tpl.category}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-[1.5rem]">
                      <span className="translate-y-3 group-hover:translate-y-0 transition-all duration-300 bg-white text-neutral-900 px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg">
                        Use Template <ArrowRight size={15} />
                      </span>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="px-4 py-4">
                    <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-tight group-hover:text-primary transition-colors mb-1">
                      {tpl.title}
                    </h3>
                    {tpl.description && (
                      <p className="text-[12px] text-neutral-400 leading-relaxed line-clamp-2">
                        {tpl.description}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
