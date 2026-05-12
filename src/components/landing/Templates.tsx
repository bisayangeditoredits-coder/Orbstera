"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Lock, Layout, Briefcase, Palette, TrendingUp, Link as LinkIcon, Rocket, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';

const FALLBACK_TEMPLATES = [
  {
    id: "seq-pitch",
    slug: "seq-pitch",
    title: "Series A Pitch Deck",
    category: "Frameworks",
    color_gradient: "from-blue-500 to-indigo-600",
    text_color: "text-white",
    icon_name: "Briefcase",
    is_premium: false,
  },
  {
    id: "obsidian-cyber",
    slug: "obsidian-cyber",
    title: "Obsidian Cyber",
    category: "Aesthetics",
    color_gradient: "from-zinc-900 to-black",
    text_color: "text-white",
    icon_name: "Palette",
    is_premium: true,
  },
  {
    id: "b2b-sales",
    slug: "b2b-sales",
    title: "Enterprise Sales Playbook",
    category: "Frameworks",
    color_gradient: "from-sky-400 to-blue-600",
    text_color: "text-white",
    icon_name: "TrendingUp",
    is_premium: false,
  }
];

export function Templates() {
  const [templates, setTemplates] = useState<any[]>(FALLBACK_TEMPLATES);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setTemplates(data.slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
      }
    }
    fetchTemplates();
  }, []);

  return (
    <section id="templates" className="w-full py-32 px-6 bg-[#FAFAFA] border-y border-black/[0.05] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(71,59,240,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/[0.05] shadow-sm mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-600">Starting Points</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-neutral-900 tracking-tighter">
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
            const IconComponent = (Icons as any)[tpl.icon_name] || Icons.Layout;
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/templates/${tpl.slug || tpl.id}`} className="group block relative bg-white rounded-[2rem] border border-black/[0.04] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(71,59,240,0.15)] transition-all duration-500 overflow-hidden">
                  
                  {/* Top Preview Area */}
                  <div className={`relative h-48 rounded-[1.5rem] bg-gradient-to-br ${tpl.color_gradient || 'from-gray-100 to-gray-200'} flex flex-col items-center justify-center p-6 overflow-hidden`}>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:16px_16px]" />
                    
                    <motion.div 
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      className="relative w-32 h-32 flex items-center justify-center group-hover:-translate-y-4 transition-all duration-500"
                    >
                      <img 
                        src={
                          tpl.id === "seq-pitch" ? "/psdzone.net-Education-3D-Icons/PNG/Rocket.png" :
                          tpl.id === "obsidian-cyber" ? "/psdzone.net-Education-3D-Icons/PNG/Brush and Color Palette.png" :
                          tpl.id === "b2b-sales" ? "/psdzone.net-Education-3D-Icons/PNG/Trophy.png" :
                          "/psdzone.net-Education-3D-Icons/PNG/Book.png"
                        } 
                        alt={tpl.title}
                        className="w-28 h-28 object-contain drop-shadow-2xl"
                      />
                    </motion.div>
                    
                    <div className={`text-center relative z-10 ${tpl.text_color || 'text-white'}`}>
                      <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">{tpl.category}</span>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-neutral-900 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2">
                        Use Prompt <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-bold text-neutral-900 tracking-tight leading-tight group-hover:text-primary transition-colors">
                        {tpl.title}
                      </h3>
                      {tpl.is_premium && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                          <Lock size={10} strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
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
