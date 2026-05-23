import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#FAFAFA] border-t border-black/[0.04] py-16 px-6 text-slate-500 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.png.png" alt="Orbstera Logo" className="h-8 w-auto object-contain drop-shadow-sm transition-all" />
            <span className="font-extrabold text-2xl tracking-tighter text-slate-900 group-hover:text-primary transition-colors">Orbstera</span>
          </Link>
          <p className="text-[15px] max-w-xs leading-relaxed font-medium">
            A new medium for presenting ideas. Powered by AI.
          </p>
        </div>
        
        <div className="flex gap-16 md:gap-24">
          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-[0.2em]">Product</h4>
            <div className="flex flex-col gap-4 text-[14px] font-medium">
              <Link href="/learn" className="hover:text-slate-900 transition-colors">How to Use</Link>
              <Link href="/templates" className="hover:text-slate-900 transition-colors">Templates</Link>
              <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-[0.2em]">Company</h4>
            <div className="flex flex-col gap-4 text-[14px] font-medium">
              <Link href="/about" className="hover:text-slate-900 transition-colors">About</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
              <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-black/[0.04] flex flex-col md:flex-row justify-between items-center gap-6 text-[13px] font-medium">
        <p>© 2026 Orbstera AI. All rights reserved.</p>
        <div className="flex gap-6 sm:gap-8 flex-wrap justify-center">
          <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
          <Link href="/refund" className="hover:text-slate-900 transition-colors">Refund Policy</Link>
        </div>
      </div>
    </footer>
  );
}
