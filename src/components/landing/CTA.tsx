import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTA() {
  return (
    <section className="w-full py-32 px-6 relative overflow-hidden flex items-center justify-center min-h-[60vh]">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface to-background z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl aspect-square bg-primary/20 rounded-full blur-[200px] z-0" />
      
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center glass-panel p-12 md:p-20 rounded-3xl border border-white/10 shadow-2xl">
        <h2 className="text-4xl md:text-6xl font-space-grotesk font-bold mb-6 text-balance">
          Ready to build your best presentation?
        </h2>
        <p className="text-xl text-textMuted mb-10 max-w-2xl mx-auto">
          Join thousands of professionals who have upgraded their workflow with Orbstera AI.
        </p>
        
        <div className="flex flex-col md:flex-row justify-center gap-4 w-full max-w-md mx-auto">
          <Link href="/editor" className="group relative flex items-center justify-center gap-3 px-12 py-5 bg-accent-gradient text-white rounded-full font-bold overflow-hidden transition-all shadow-[0_15px_45px_-10px_rgba(71,59,240,0.5)] hover:shadow-[0_25px_60px_-10px_rgba(71,59,240,0.6)] hover:-translate-y-1 active:scale-95">
            <span className="relative z-10 text-lg">Start Creating</span>
            <ArrowRight size={22} className="relative z-10 group-hover:translate-x-1.5 transition-transform" />
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>
    </section>
  );
}
