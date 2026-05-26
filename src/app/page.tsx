import dynamic from 'next/dynamic';
import { HeroSection } from '@/components/landing/HeroSection';
import { Footer } from '@/components/layout/Footer';

const SocialProof = dynamic(() => import('@/components/landing/SocialProof').then((m) => ({ default: m.SocialProof })));
const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks').then((m) => ({ default: m.HowItWorks })));

const FeatureDemos = dynamic(() => import('@/components/landing/FeatureDemos').then((m) => ({ default: m.FeatureDemos })));
const AnalyticsMockup = dynamic(() => import('@/components/landing/AnalyticsMockup').then((m) => ({ default: m.AnalyticsMockup })));
const Features = dynamic(() => import('@/components/landing/Features').then((m) => ({ default: m.Features })));
const Showcase = dynamic(() => import('@/components/landing/Showcase').then((m) => ({ default: m.Showcase })));
const AboutUs = dynamic(() => import('@/components/landing/AboutUs').then((m) => ({ default: m.AboutUs })));
const Team = dynamic(() => import('@/components/landing/Team').then((m) => ({ default: m.Team })));
const Pricing = dynamic(() => import('@/components/landing/Pricing').then((m) => ({ default: m.Pricing })));
const Testimonials = dynamic(() => import('@/components/landing/Testimonials').then((m) => ({ default: m.Testimonials })));
const FAQ = dynamic(() => import('@/components/landing/FAQ').then((m) => ({ default: m.FAQ })));
const CTA = dynamic(() => import('@/components/landing/CTA').then((m) => ({ default: m.CTA })));

export default function Home() {
  return (
    <main className="flex min-h-screen w-full max-w-[100vw] flex-col items-center justify-between overflow-x-clip">
      <HeroSection />
      <SocialProof />
      <HowItWorks />

      <FeatureDemos />
      <AnalyticsMockup />
      <Showcase />
      <Features />
      <AboutUs />
      <Team />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      
      {/* Massive Premium Element Section */}
      <section className="w-full bg-[#FAFAFA] pt-8 pb-16 sm:pt-12 sm:pb-24 overflow-hidden border-t border-black/[0.04]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-5xl mx-auto max-h-[500px] flex items-center justify-center">
            <img 
              src="/premium-icons/oRBSTERA-ELEMENT 1.png" 
              alt="Orbstera Premium Element" 
              className="w-full h-auto max-h-[500px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
