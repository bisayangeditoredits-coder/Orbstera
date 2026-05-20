import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#0A0A0A] border-t border-white/5 py-16 px-6 text-white/60 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.png.png" alt="Orbstera Logo" className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all" />
            <span className="font-extrabold text-2xl tracking-tighter text-white group-hover:text-primary transition-colors">Orbstera</span>
          </Link>
          <p className="text-[15px] max-w-xs leading-relaxed font-medium">
            The futuristic presentation generation platform for creative professionals.
          </p>
        </div>
        
        <div className="flex gap-16 md:gap-24">
          <div className="space-y-6">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em]">Product</h4>
            <div className="flex flex-col gap-4 text-[14px] font-medium">
              <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="/templates" className="hover:text-white transition-colors">Templates Library</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold text-white text-xs uppercase tracking-[0.2em]">Company</h4>
            <div className="flex flex-col gap-4 text-[14px] font-medium">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[13px] font-medium">
        <p>© 2026 Orbstera AI. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
        </div>
      </div>
    </footer>
  );
}
