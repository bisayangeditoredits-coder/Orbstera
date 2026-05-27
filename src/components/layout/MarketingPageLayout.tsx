import { Footer } from '@/components/layout/Footer';

type MarketingPageLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
};

export function MarketingPageLayout({
  title,
  description,
  children,
  className = '',
}: MarketingPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <main className={`px-6 pt-10 pb-16 sm:pt-14 ${className}`.trim()}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
