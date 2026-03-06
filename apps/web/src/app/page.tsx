'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Users, 
  Lock, 
  CheckCircle, 
  Star,
  MessageCircle,
  Award,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (startOnView && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasStarted, end, duration]);

  return { count, ref };
}

// Intersection observer hook for animations
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });
    
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
}

// Floating animation component
function FloatingElement({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    let startTime: number;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = (currentTime - startTime) / 1000;
      setOffset(Math.sin(elapsed + delay) * 10);
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [delay]);

  return (
    <div className={className} style={{ transform: `translateY(${offset}px)` }}>
      {children}
    </div>
  );
}

// Animated stat counter
function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useAnimatedCounter(value);
  
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold mb-2">
        <span ref={ref}>{count.toLocaleString()}</span>{suffix}
      </div>
      <div className="text-primary-foreground/80">{label}</div>
    </div>
  );
}

// Feature card with hover animation
function FeatureCard({ icon: Icon, title, description, delay }: { icon: any; title: string; description: string; delay: number }) {
  const { ref, isInView } = useInView();
  
  return (
    <div
      ref={ref}
      className={cn(
        "text-center p-8 rounded-2xl bg-card border shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 group",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6 group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// Step card component (prevents hook in map issue)
function StepCard({ icon: Icon, title, desc, index }: { icon: any; title: string; desc: string; index: number }) {
  const { ref, isInView } = useInView();
  
  return (
    <div 
      ref={ref}
      className={cn(
        "text-center relative transition-all duration-500",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-6 shadow-lg relative z-10 hover:scale-110 transition-transform cursor-pointer">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{desc}</p>
    </div>
  );
}

// Testimonial card
function TestimonialCard({ quote, name, role, delay }: { quote: string; name: string; role: string; delay: number }) {
  const { ref, isInView } = useInView();
  
  return (
    <div
      ref={ref}
      className={cn(
        "bg-card rounded-2xl p-6 shadow-lg border relative transition-all duration-500",
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="absolute -top-3 left-6">
        <div className="bg-primary text-primary-foreground rounded-full p-2">
          <MessageCircle className="h-4 w-4" />
        </div>
      </div>
      <div className="flex gap-1 mb-3 mt-2">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-muted-foreground mb-4 italic">&quot;{quote}&quot;</p>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b transition-all duration-300">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                VeteranFinder
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost">Log In</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="group">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
          <div 
            className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
            style={{ transform: `translateY(${scrollY * 0.3}px)` }}
          />
          <div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
            style={{ transform: `translateY(${scrollY * -0.2}px)` }}
          />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        {/* Floating decorative elements */}
        <FloatingElement delay={0} className="absolute top-32 right-[20%] hidden lg:block">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
        </FloatingElement>
        <FloatingElement delay={1} className="absolute top-48 left-[15%] hidden lg:block">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
        </FloatingElement>
        <FloatingElement delay={2} className="absolute bottom-32 right-[25%] hidden lg:block">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
            <Users className="h-7 w-7 text-white" />
          </div>
        </FloatingElement>

        <div className="container mx-auto px-4">
          <div 
            className="max-w-4xl mx-auto text-center"
            style={{ opacity: Math.max(0, 1 - scrollY / 400) }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">The #1 Platform for Military Veterans</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-slide-up">
              Reconnect With{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  Your Unit
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                >
                  <path
                    d="M2 10 Q150 -5 298 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-primary"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br />
              With Confidence
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up-delay">
              VeteranFinder helps former service personnel find old colleagues, comrades, and trusted
              community support built around shared military experience.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up-delay-2">
              <Link href="/auth/register">
                <Button size="lg" className="text-lg px-8 h-14 group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Join Free Today
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 group">
                  <Shield className="mr-2 h-5 w-5" />
                  Veteran Sign Up
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground animate-fade-in-delay">
              {[
                { icon: CheckCircle, text: 'Verified Veterans' },
                { icon: Lock, text: 'Military-Grade Encryption' },
                { icon: Award, text: 'GDPR Compliant' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-green-500" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-scroll-indicator" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter value={10000} suffix="+" label="Active Members" />
            <StatCounter value={5000} suffix="+" label="Verified Veterans" />
            <StatCounter value={2500} suffix="+" label="Successful Reconnections" />
            <StatCounter value={98} suffix="%" label="Satisfaction Rate" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why VeteranFinder?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built by veterans, for veterans. We understand what military reconnection requires.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Users}
              title="Veteran Reconnection"
              description="Find old colleagues and comrades from your service years in a trusted veteran-only network."
              delay={0}
            />
            <FeatureCard
              icon={Users}
              title="Brothers in Arms"
              description="Reconnect with service members you may have served alongside. Our unique matching algorithm finds veterans with overlapping service periods."
              delay={100}
            />
            <FeatureCard
              icon={Lock}
              title="Verified & Secure"
              description="All veterans are verified through official documentation. Your privacy and security are our top priority with military-grade encryption."
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">Get started in four simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
            
            <StepCard icon={Users} title="Create Profile" desc="Sign up and tell us about yourself" index={0} />
            <StepCard icon={Shield} title="Get Verified" desc="Veterans submit service records for verification" index={1} />
            <StepCard icon={Users} title="Reconnect" desc="Find veterans with overlapping service history" index={2} />
            <StepCard icon={MessageCircle} title="Connect" desc="Message, call, and rebuild your network" index={3} />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Success Stories</h2>
            <p className="text-xl text-muted-foreground">Real connections from real veterans</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="After 20 years in the Army, I thought I'd never find old faces from my unit again. VeteranFinder changed that."
              name="James M."
              role="British Army Veteran"
              delay={0}
            />
            <TestimonialCard
              quote="The Brothers in Arms feature helped me reconnect with someone from my unit in Afghanistan. We hadn't spoken in 10 years. This platform is special."
              name="Sarah K."
              role="Royal Navy Veteran"
              delay={100}
            />
            <TestimonialCard
              quote="The directory and messaging tools helped me reconnect with ex-colleagues and build a support network after leaving service."
              name="Emily R."
              role="Army Veteran"
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 border-y bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {[
              'Veteran-Owned',
              'SSL Encrypted',
              'GDPR Compliant',
              'Privacy First',
              '24/7 Support',
            ].map((badge, i) => (
              <div key={badge} className="flex items-center space-x-2 text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        {/* Floating elements */}
        <FloatingElement delay={0} className="absolute top-20 left-[10%] opacity-20">
          <Users className="h-16 w-16 text-white" />
        </FloatingElement>
        <FloatingElement delay={1.5} className="absolute bottom-20 right-[15%] opacity-20">
          <Shield className="h-20 w-20 text-white" />
        </FloatingElement>
        
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Ready to Reconnect?</h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join thousands of veterans reconnecting with old colleagues and rebuilding trusted community ties.
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary" className="text-lg px-10 h-14 group shadow-xl hover:scale-105 transition-transform">
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><a href="mailto:support@veteranfinder.com" className="hover:text-foreground transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Compliance</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/dpia" className="hover:text-foreground transition-colors">DPIA</Link></li>
                <li><Link href="/privacy#your-rights" className="hover:text-foreground transition-colors">Your Rights</Link></li>
                <li><a href="mailto:dpo@veteranfinder.com" className="hover:text-foreground transition-colors">Data Protection</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/auth/register" className="hover:text-foreground transition-colors">Create Account</Link></li>
                <li><Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">ICO (UK)</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-semibold">VeteranFinder</span>
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> UK GDPR Compliant</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> AES-256 Encryption</span>
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Veteran Owned</span>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              © {new Date().getFullYear()} VeteranFinder Ltd. All rights reserved. Registered in England and Wales.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
