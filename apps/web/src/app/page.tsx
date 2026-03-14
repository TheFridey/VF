import { Footer } from '@/components/layout/footer';
import { CtaSection } from '@/components/home/cta-section';
import { FeatureGridSection } from '@/components/home/feature-grid';
import { HeroSection } from '@/components/home/hero-section';
import { HowItWorksSection } from '@/components/home/how-it-works';
import { SiteHeader } from '@/components/home/site-header';
import { TrustBar } from '@/components/home/trust-bar';
import { UseCasesSection } from '@/components/home/use-cases-section';
import { VerificationSection } from '@/components/home/verification-section';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader />
      <main>
        <HeroSection />
        <TrustBar />
        <HowItWorksSection />
        <FeatureGridSection />
        <VerificationSection />
        <UseCasesSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
