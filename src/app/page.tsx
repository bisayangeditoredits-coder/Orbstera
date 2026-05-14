import dynamic from 'next/dynamic';
import { HeroSection } from '@/components/landing/HeroSection';
import { Footer } from '@/components/layout/Footer';

const SocialProof = dynamic(() => import('@/components/landing/SocialProof').then((m) => ({ default: m.SocialProof })));
const Showcase = dynamic(() => import('@/components/landing/Showcase').then((m) => ({ default: m.Showcase })));
const Features = dynamic(() => import('@/components/landing/Features').then((m) => ({ default: m.Features })));
const Integrations = dynamic(() => import('@/components/landing/Integrations').then((m) => ({ default: m.Integrations })));
const EditorPreview = dynamic(() => import('@/components/landing/EditorPreview').then((m) => ({ default: m.EditorPreview })));
const Templates = dynamic(() => import('@/components/landing/Templates').then((m) => ({ default: m.Templates })));
const Pricing = dynamic(() => import('@/components/landing/Pricing').then((m) => ({ default: m.Pricing })));
const Testimonials = dynamic(() => import('@/components/landing/Testimonials').then((m) => ({ default: m.Testimonials })));
const FAQ = dynamic(() => import('@/components/landing/FAQ').then((m) => ({ default: m.FAQ })));
const DesktopDownload = dynamic(() => import('@/components/landing/DesktopDownload').then((m) => ({ default: m.DesktopDownload })));
const CTA = dynamic(() => import('@/components/landing/CTA').then((m) => ({ default: m.CTA })));

export default function Home() {
  return (
    <main className="flex min-h-screen w-full max-w-[100vw] flex-col items-center justify-between overflow-x-clip">
      <HeroSection />
      <SocialProof />
      <Showcase />
      <Features />
      <Integrations />
      <EditorPreview />
      <Templates />
      <Pricing />
      <Testimonials />
      <FAQ />
      <DesktopDownload />
      <CTA />
      <Footer />
    </main>
  );
}
