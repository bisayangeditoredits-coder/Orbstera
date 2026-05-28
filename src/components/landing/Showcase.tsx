"use client";


import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const BENTO_ITEMS = [
  {
    title: 'Pitch Decks',
    desc: 'Raise your next round with stunning cinematic presentations.',
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop',
    colSpan: 'col-span-1 md:col-span-2',
    rowSpan: 'row-span-1 md:row-span-2',
  },
  {
    title: 'Portfolios',
    desc: 'Showcase your creative work perfectly on any device.',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600&auto=format&fit=crop',
    colSpan: 'col-span-1',
    rowSpan: 'row-span-1',
  },
  {
    title: 'Case Studies',
    desc: 'Turn dry data into compelling visual narratives.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop',
    colSpan: 'col-span-1',
    rowSpan: 'row-span-1',
  },
];

export function Showcase() {
  return (
    <section className="w-full bg-[#FAFAFA] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 
            className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl"
          >
            Create beautiful presentations, documents, and websites.
          </h2>
          <p 
            className="mt-6 text-lg text-slate-600 leading-relaxed font-medium"
          >
            No design skills required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px] md:auto-rows-[300px]">
          {BENTO_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`group relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-lg ${item.colSpan} ${item.rowSpan}`}
            >
              <div className="absolute inset-0">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 mix-blend-multiply" 
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{item.title}</h3>
                <p className="text-white/80 max-w-sm text-sm sm:text-base leading-relaxed">{item.desc}</p>
                <div className="mt-4 flex items-center text-white/90 text-sm font-semibold opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                  <span>See example</span>
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
