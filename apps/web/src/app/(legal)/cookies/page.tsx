'use client';

import Link from 'next/link';
import { ArrowLeft, Cookie } from 'lucide-react';
import { CONTACT_EMAILS } from '@/lib/contact-emails';
import { VeteranFinderLogo } from '@/components/brand/veteranfinder-logo';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <VeteranFinderLogo markClassName="h-9" textClassName="text-xl font-bold" />
          </Link>
          <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <Cookie className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Cookie Policy</h1>
        </div>
        <p className="text-muted-foreground mb-8">Last updated: February 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit a website. They are 
              widely used to make websites work more efficiently and to provide information to website owners.
            </p>
            <p>
              We use cookies and similar technologies (such as local storage) to provide, secure, and improve 
              our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p>VeteranFinder uses cookies for the following purposes:</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Essential Cookies (Strictly Necessary)</h3>
            <p>
              These cookies are required for the website to function and cannot be switched off. They include:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left">Cookie Name</th>
                    <th className="border border-border p-3 text-left">Purpose</th>
                    <th className="border border-border p-3 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">auth-storage</td>
                    <td className="border border-border p-3">Stores authentication tokens to keep you logged in</td>
                    <td className="border border-border p-3">7 days</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">session_id</td>
                    <td className="border border-border p-3">Identifies your session for security purposes</td>
                    <td className="border border-border p-3">Session</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">csrf_token</td>
                    <td className="border border-border p-3">Protects against cross-site request forgery attacks</td>
                    <td className="border border-border p-3">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Functional Cookies</h3>
            <p>
              These cookies enable enhanced functionality and personalisation:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left">Cookie Name</th>
                    <th className="border border-border p-3 text-left">Purpose</th>
                    <th className="border border-border p-3 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">theme</td>
                    <td className="border border-border p-3">Remembers your light/dark mode preference</td>
                    <td className="border border-border p-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">locale</td>
                    <td className="border border-border p-3">Remembers your language preference</td>
                    <td className="border border-border p-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">cookie_consent</td>
                    <td className="border border-border p-3">Stores your cookie preferences</td>
                    <td className="border border-border p-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Analytics Cookies</h3>
            <p>
              If enabled, these cookies help us understand how visitors interact with our website:
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left">Cookie Name</th>
                    <th className="border border-border p-3 text-left">Purpose</th>
                    <th className="border border-border p-3 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">_ga</td>
                    <td className="border border-border p-3">Google Analytics - distinguishes users</td>
                    <td className="border border-border p-3">2 years</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-mono text-xs">_gid</td>
                    <td className="border border-border p-3">Google Analytics - distinguishes users</td>
                    <td className="border border-border p-3">24 hours</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Note: Analytics cookies are only set with your consent. We use privacy-focused analytics 
              that do not track you across websites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Third-Party Cookies</h2>
            <p>
              We minimise the use of third-party cookies. Any third-party services we use are bound by 
              data processing agreements and must comply with GDPR requirements.
            </p>
            <p>Third parties that may set cookies include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Payment Processors:</strong> For secure payment processing (when applicable)</li>
              <li><strong>Analytics Providers:</strong> To help us improve our service (only with your consent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">4.1 Cookie Consent</h3>
            <p>
              When you first visit VeteranFinder, you will see a cookie banner asking for your consent to 
              non-essential cookies. You can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accept all cookies</li>
              <li>Reject non-essential cookies</li>
              <li>Customise your preferences</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">4.2 Browser Settings</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>View what cookies are stored on your device</li>
              <li>Delete some or all cookies</li>
              <li>Block cookies from being set</li>
              <li>Set your browser to notify you when cookies are being set</li>
            </ul>
            <p className="mt-4">
              Please note that blocking essential cookies may prevent you from using VeteranFinder&apos;s 
              core features such as logging in.
            </p>

            <h3 className="text-xl font-medium mt-6 mb-3">4.3 How to Manage Cookies in Popular Browsers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Chrome:</strong>{' '}
                <a href="https://support.google.com/chrome/answer/95647" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Manage cookies in Chrome
                </a>
              </li>
              <li>
                <strong>Firefox:</strong>{' '}
                <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Manage cookies in Firefox
                </a>
              </li>
              <li>
                <strong>Safari:</strong>{' '}
                <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Manage cookies in Safari
                </a>
              </li>
              <li>
                <strong>Edge:</strong>{' '}
                <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Manage cookies in Edge
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Local Storage</h2>
            <p>
              In addition to cookies, we use browser local storage for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Storing authentication tokens securely</li>
              <li>Caching user preferences</li>
              <li>Improving application performance</li>
            </ul>
            <p className="mt-4">
              Local storage can be cleared through your browser&apos;s developer tools or settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Do Not Track</h2>
            <p>
              Some browsers have a &quot;Do Not Track&quot; feature that signals to websites that you do not want 
              to be tracked. VeteranFinder respects these signals and will not set non-essential tracking 
              cookies when DNT is enabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or 
              applicable laws. We will notify you of significant changes by updating the date at the top 
              of this policy and, where appropriate, through our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> {CONTACT_EMAILS.privacy}</li>
              <li><strong>Subject:</strong> Cookie Policy Enquiry</li>
            </ul>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            <Link href="/dpia" className="text-primary hover:underline">Data Protection Impact Assessment</Link>
            <Link href="/about" className="text-primary hover:underline">About Us</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
