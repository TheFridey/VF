'use client';

import Link from 'next/link';
import { Shield, Heart, Users, Lock, Award, ArrowLeft, CheckCircle } from 'lucide-react';
import { CONTACT_EMAILS, toMailto } from '@/lib/contact-emails';

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">VeteranFinder</span>
          </Link>
          <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About VeteranFinder</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A trust-led platform built specifically for the military community. Helping veterans 
            reconnect with those they served alongside and rebuild trusted support networks.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Mission</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg">
              VeteranFinder was born from a simple observation: the bonds formed during military service 
              are unlike any other. Yet when service members return to civilian life, maintaining those 
              connections becomes incredibly difficult. Old contacts fade, units disperse, and the 
              shared experiences that once united brothers and sisters in arms become distant memories.
            </p>
            <p className="text-lg">
              Our mission is to bridge that gap. We&apos;ve built a platform that serves two core purposes:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-card rounded-lg p-6 border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Brothers in Arms</h3>
              <p className="text-muted-foreground">
                Our unique reconnection feature helps verified veterans find people they may have served 
                alongside. Using service history matching, we identify potential connections based on 
                overlapping service periods, units, and deployment locations.
              </p>
            </div>

            <div className="bg-card rounded-lg p-6 border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Veteran Community Support</h3>
              <p className="text-muted-foreground">
                Beyond one-to-one reconnection, VeteranFinder provides messaging, directories, forums, 
                and BIA tools to help veterans stay connected through trusted community support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
          
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Trust &amp; Security</h3>
                <p className="text-muted-foreground">
                  Security isn&apos;t an afterthought—it&apos;s foundational. We use military-grade encryption 
                  for all private communications, implement rigorous verification processes, and maintain 
                  strict data protection standards compliant with UK GDPR and DUAA.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Award className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Authenticity</h3>
                <p className="text-muted-foreground">
                  We take &quot;stolen valour&quot; seriously. Our verification process ensures that those 
                  claiming veteran status are genuine. This protects both the integrity of the 
                  veteran community and the trust users place in our platform.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
                <p className="text-muted-foreground">
                  Your data is yours. We collect only what&apos;s necessary, never sell personal 
                  information, and give you complete control over your privacy settings. Service 
                  history is shared only with your explicit consent.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Heart className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Community Wellbeing</h3>
                <p className="text-muted-foreground">
                  We understand that many veterans face unique challenges including isolation, 
                  mental health struggles, and difficulty adjusting to civilian life. Our platform 
                  is designed with sensitivity to these realities, providing a supportive environment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-12 text-center">What Makes Us Different</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Verified veteran status badges',
              'Service period overlap matching',
              'End-to-end encrypted messaging',
              'Strict moderation and reporting',
              'No third-party data sales—ever',
              'GDPR-compliant data handling',
              'Full account deletion on request',
              'Transparent privacy practices',
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Commitment to Veterans</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg">
              We recognise the sacrifices made by those who serve. VeteranFinder is committed to:
            </p>
            <ul className="text-lg space-y-3 mt-6">
              <li>Never exploiting or commercialising service data beyond platform functionality</li>
              <li>Maintaining the highest standards of respect for military service</li>
              <li>Supporting veteran mental health awareness</li>
              <li>Providing resources and referrals for those in need</li>
              <li>Listening to community feedback and evolving our platform accordingly</li>
            </ul>
            <p className="text-lg mt-6">
              This isn&apos;t just another social app. It&apos;s a platform built with purpose, designed 
              specifically for those who have served.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Team</h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
            VeteranFinder is built by a team that understands the importance of trust, security, 
            and community. We&apos;re committed to serving those who have served.
          </p>
          {/* Team members can be added here when ready */}
          <div className="text-center">
            <p className="text-muted-foreground">
              Interested in joining our team or partnering with us?<br />
              Contact us at <a href={toMailto(CONTACT_EMAILS.hello)} className="text-primary hover:underline">{CONTACT_EMAILS.hello}</a>
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Get in Touch</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="font-semibold mb-2">General Enquiries</h3>
              <a href={toMailto(CONTACT_EMAILS.hello)} className="text-primary hover:underline">
                {CONTACT_EMAILS.hello}
              </a>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Support</h3>
              <a href={toMailto(CONTACT_EMAILS.support)} className="text-primary hover:underline">
                {CONTACT_EMAILS.support}
              </a>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Privacy Concerns</h3>
              <a href={toMailto(CONTACT_EMAILS.privacy)} className="text-primary hover:underline">
                {CONTACT_EMAILS.privacy}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link href="/cookies" className="text-muted-foreground hover:text-foreground">Cookie Policy</Link>
            <Link href="/dpia" className="text-muted-foreground hover:text-foreground">DPIA</Link>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            © {new Date().getFullYear()} VeteranFinder Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
