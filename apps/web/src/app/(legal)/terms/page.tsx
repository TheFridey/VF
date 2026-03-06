'use client';

import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using VeteranFinder (&quot;the Platform&quot;, &quot;Service&quot;), operated by VeteranFinder Ltd 
              (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not 
              agree to these Terms, you may not use the Platform.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and VeteranFinder Ltd. Please read 
              them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
            <p>To use VeteranFinder, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Be legally capable of entering into a binding contract</li>
              <li>Not be prohibited from using the Service under applicable law</li>
              <li>Not have been previously banned from the Platform</li>
              <li>Not be a registered sex offender</li>
            </ul>
            <p className="mt-4">
              For the Brothers in Arms (BIA) reconnection feature, you must be a verified military veteran.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <p>When creating an account, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your information</li>
              <li>Keep your password secure and confidential</li>
              <li>Not share your account with others</li>
              <li>Notify us immediately of any unauthorised access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Veteran Verification</h2>
            <p>
              VeteranFinder offers a verification process for military veterans. By submitting verification documents:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You confirm your military service is genuine and accurately represented</li>
              <li>You consent to our secure processing of verification documents (e.g., DD-214)</li>
              <li>You understand documents are deleted immediately after verification</li>
              <li>You acknowledge that &quot;stolen valour&quot; (false claims of military service) will result in permanent ban</li>
            </ul>
            <p className="mt-4">
              Verification status may be revoked if we discover false or misleading information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Conduct</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Harass, bully, stalk, intimidate, or threaten any user</li>
              <li>Post content that is defamatory, abusive, obscene, or hateful</li>
              <li>Impersonate any person or entity, including falsely claiming military service</li>
              <li>Use the Platform for any illegal purpose</li>
              <li>Solicit money from other users</li>
              <li>Engage in spam, phishing, or fraudulent activity</li>
              <li>Upload malware, viruses, or harmful code</li>
              <li>Scrape, harvest, or collect user data without permission</li>
              <li>Circumvent security measures or access restrictions</li>
              <li>Use automated systems (bots) without authorisation</li>
              <li>Post sexually explicit content in profiles or messages</li>
              <li>Advertise or promote commercial services</li>
              <li>Share other users&apos; personal information without consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Content Guidelines</h2>
            <h3 className="text-xl font-medium mt-6 mb-3">6.1 Your Content</h3>
            <p>
              You retain ownership of content you post (&quot;User Content&quot;). By posting, you grant us a worldwide, 
              non-exclusive, royalty-free licence to use, display, and distribute your content in connection 
              with the Service.
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">6.2 Prohibited Content</h3>
            <p>You may not post content that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Is illegal, harmful, or violates others&apos; rights</li>
              <li>Contains nudity or sexually explicit material</li>
              <li>Promotes violence, terrorism, or self-harm</li>
              <li>Contains hate speech or discriminatory content</li>
              <li>Infringes intellectual property rights</li>
              <li>Contains personal information of others without consent</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">6.3 Content Moderation</h3>
            <p>
              We reserve the right to review, remove, or disable access to any content that violates these 
              Terms. We may also suspend or terminate accounts for violations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Safety</h2>
            <p>
              While we implement safety measures, we cannot guarantee your safety when interacting with other 
              users. You are responsible for your own safety. We recommend:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Meeting in public places for initial meetings</li>
              <li>Informing friends or family of your plans</li>
              <li>Not sharing financial information with matches</li>
              <li>Reporting suspicious behaviour immediately</li>
              <li>Trusting your instincts and ending conversations if uncomfortable</li>
            </ul>
            <p className="mt-4">
              If you experience harassment, threats, or unsafe behaviour, please report it immediately and 
              contact local authorities if necessary.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Privacy</h2>
            <p>
              Your privacy is important to us. Our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> explains 
              how we collect, use, and protect your personal data. By using the Platform, you consent to our 
              data practices as described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Premium Features</h2>
            <p>
              We may offer premium subscription plans with enhanced features. If you purchase a subscription:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payment will be charged to your chosen payment method</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
              <li>You can cancel anytime through your account settings</li>
              <li>Refunds are subject to our refund policy and applicable law</li>
              <li>Prices may change with notice before your next renewal</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Intellectual Property</h2>
            <p>
              The VeteranFinder name, logo, and all related marks, designs, and content are the property of 
              VeteranFinder Ltd or its licensors. You may not use our intellectual property without prior 
              written permission.
            </p>
            <p className="mt-4">
              The Platform and its original content, features, and functionality are protected by copyright, 
              trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Disclaimers</h2>
            <p>
              THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
              EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Platform will be uninterrupted, secure, or error-free</li>
              <li>Results obtained will be accurate or reliable</li>
              <li>Any matches or connections will meet your expectations</li>
              <li>User-provided information is accurate or truthful</li>
            </ul>
            <p className="mt-4">
              We do not conduct criminal background checks on users. You interact with other users at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, VETERANFINDER LTD SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Loss of profits, data, or goodwill</li>
              <li>Personal injury or emotional distress</li>
              <li>Any conduct of other users</li>
              <li>Unauthorised access to your account or data</li>
            </ul>
            <p className="mt-4">
              Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim, 
              or £100, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless VeteranFinder Ltd and its officers, directors, employees, 
              and agents from any claims, damages, losses, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use of the Platform</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your User Content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Termination</h2>
            <p>
              You may terminate your account at any time through the Settings page. We may suspend or terminate 
              your account if you violate these Terms or for any reason with or without notice.
            </p>
            <p className="mt-4">
              Upon termination, your right to use the Platform ceases immediately. Sections that by their nature 
              should survive termination will survive.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or your use of the Platform shall be governed by the laws of 
              England and Wales. You agree to submit to the exclusive jurisdiction of the courts of England and Wales.
            </p>
            <p className="mt-4">
              Before initiating legal proceedings, you agree to attempt to resolve disputes informally by 
              contacting us at legal@veteranfinder.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. We will notify you of material changes by email or through 
              the Platform. Your continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. General Provisions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and us</li>
              <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions continue in effect</li>
              <li><strong>Waiver:</strong> Our failure to enforce any right does not waive that right</li>
              <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Contact Us</h2>
            <p>
              If you have questions about these Terms:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> legal@veteranfinder.com</li>
              <li><strong>Support:</strong> support@veteranfinder.com</li>
              <li><strong>Postal Address:</strong> [To be confirmed upon incorporation]</li>
            </ul>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
            <Link href="/dpia" className="text-primary hover:underline">Data Protection Impact Assessment</Link>
            <Link href="/about" className="text-primary hover:underline">About Us</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
