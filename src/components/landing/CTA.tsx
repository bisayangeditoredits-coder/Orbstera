import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTA() {
  return (
    <section className="w-full relative overflow-hidden bg-white text-slate-900 py-32 px-6 border-t border-black/[0.04]">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(71,59,240,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000002_1px,transparent_1px),linear-gradient(to_bottom,#00000002_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        <h2 className="text-5xl md:text-7xl font-semibold mb-6 tracking-tighter leading-[1.05]">
          A new medium for presenting ideas.
        </h2>
        
        <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl font-medium tracking-tight">
          Join the next generation of creative professionals using Orbstera to build beautiful web-native presentations.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/editor" className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-full font-bold overflow-hidden transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 w-full sm:w-auto shadow-xl shadow-slate-900/10">
            <span className="relative z-10 text-lg tracking-tight">Try it for free</span>
            <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link href="/learn" className="group flex items-center justify-center gap-3 px-10 py-5 bg-white text-slate-900 border border-slate-200 rounded-full font-bold transition-all hover:bg-slate-50 hover:border-slate-300 w-full sm:w-auto shadow-sm">
            <span className="text-lg tracking-tight">How to use</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
