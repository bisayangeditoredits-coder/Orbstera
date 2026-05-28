import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-[#FAFAFA] border-t border-black/[0.04] py-20 px-8 relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-12 md:gap-8">
        
        {/* Product Column */}
        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-[15px]">Product</h4>
          <Link href="/pricing" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Pricing</Link>
          <Link href="/templates" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Templates</Link>
        </div>

        {/* Company Column */}
        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-[15px]">Company</h4>
          <Link href="/about" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">About</Link>
          <Link href="/contact" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Contact us</Link>
        </div>

        {/* Social Column */}
        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-[15px]">Social</h4>
          <a href="https://twitter.com/orbstera" target="_blank" rel="noreferrer" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">X (Twitter)</a>
          <a href="https://linkedin.com/company/orbstera" target="_blank" rel="noreferrer" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">LinkedIn</a>
          <a href="https://github.com/orbstera" target="_blank" rel="noreferrer" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">GitHub</a>
        </div>

        {/* Legal Column */}
        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-slate-900 text-[15px]">Legal</h4>
          <Link href="/faq" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">FAQ</Link>
          <Link href="/privacy" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Terms of Service</Link>
          <Link href="/refund" className="text-[14px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Refund Policy</Link>
        </div>

      </div>

      <div className="max-w-6xl mx-auto mt-28 flex justify-end">
        <p className="text-[13px] text-slate-400 font-medium">© 2026 Orbstera AI, Inc.</p>
      </div>
    </footer>
  );
}
