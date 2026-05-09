import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-borderSubtle bg-white py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="space-y-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png.png" alt="Orbstera Logo" className="h-8 w-auto object-contain" />
            <span className="font-space-grotesk font-bold text-2xl tracking-tight text-primary">Orbstera</span>
          </Link>
          <p className="text-textSecondary text-[15px] max-w-xs leading-relaxed">
            The futuristic presentation generation platform for creative professionals.
          </p>
        </div>
        
        <div className="flex gap-20">
          <div className="space-y-6">
            <h4 className="font-bold text-textMain text-sm uppercase tracking-widest">Product</h4>
            <div className="flex flex-col gap-3 text-[14px] font-medium text-textSecondary">
              <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
              <Link href="#templates" className="hover:text-primary transition-colors">Templates</Link>
              <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold text-textMain text-sm uppercase tracking-widest">Company</h4>
            <div className="flex flex-col gap-3 text-[14px] font-medium text-textSecondary">
              <Link href="/about" className="hover:text-primary transition-colors">About</Link>
              <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
              <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-10 border-t border-borderSubtle flex flex-col md:flex-row justify-between items-center gap-6 text-[13px] font-medium text-textSecondary">
        <p>© 2026 Orbstera AI. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
