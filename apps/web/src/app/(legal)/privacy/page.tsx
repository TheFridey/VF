'use client';

import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { CONTACT_EMAILS } from '@/lib/contact-emails';

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2025</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              VeteranFinder Ltd (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy and personal data. 
              This Privacy Policy explains how we collect, use, store, and protect your information when you use 
              our platform.
            </p>
            <p>
              We process personal data in accordance with the UK General Data Protection Regulation (UK GDPR), 
              the Data Protection Act 2018, and the Data (Use and Access) Act 2025 (DUAA).
            </p>
            <p>
              <strong>Data Controller:</strong> VeteranFinder Ltd<br />
              <strong>Contact:</strong> {CONTACT_EMAILS.privacy}<br />
              <strong>Registered Address:</strong> [To be confirmed upon incorporation]
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email address, password (securely hashed), display name</li>
              <li><strong>Profile Information:</strong> Age/date of birth, gender, location (city/region level), biography, interests, profile photos</li>
              <li><strong>Veteran Information:</strong> Service branch, rank, unit/regiment, service dates, deployment regions (for verified veterans only)</li>
              <li><strong>Verification Documents:</strong> DD-214 or equivalent service documents (processed securely and not retained after verification)</li>
              <li><strong>Communications:</strong> Messages sent through our platform, support requests, feedback</li>
              <li><strong>Preferences:</strong> Notification settings, privacy settings, and community preferences</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Device Information:</strong> Device type, operating system, browser type</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed, actions taken</li>
              <li><strong>Cookies:</strong> Essential cookies for authentication and preferences (see our Cookie Policy)</li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">2.3 Special Category Data</h3>
            <p>
              Our platform may process or infer special category data including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Political or social affiliations (through military service history)</li>
              <li>Health-related information (if voluntarily disclosed)</li>
            </ul>
            <p>
              We process this data only with your explicit consent under Article 9(2)(a) of UK GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p>We use your personal data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Delivery:</strong> To create and manage your account, enable reconnection and messaging features</li>
              <li><strong>Veteran Reconnection:</strong> To help verified veterans find and reconnect with those they served alongside (Brothers in Arms feature)</li>
              <li><strong>Verification:</strong> To verify your veteran status securely</li>
              <li><strong>Safety &amp; Security:</strong> To detect and prevent fraud, abuse, and violations of our terms</li>
              <li><strong>Communications:</strong> To send service updates, security alerts, and (with consent) marketing communications</li>
              <li><strong>Improvement:</strong> To analyse usage patterns and improve our platform</li>
              <li><strong>Legal Compliance:</strong> To comply with legal obligations and respond to lawful requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Legal Basis for Processing</h2>
            <p>We process your personal data under the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Consent (Article 6(1)(a)):</strong> For profile creation, optional media uploads, marketing communications, and processing of special category data</li>
              <li><strong>Contract (Article 6(1)(b)):</strong> To provide our services as agreed in our Terms of Service</li>
              <li><strong>Legitimate Interests (Article 6(1)(f)):</strong> For platform safety, fraud prevention, and service improvement, where these interests do not override your rights</li>
              <li><strong>Legal Obligation (Article 6(1)(c)):</strong> To comply with applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
            <p>We may share your data with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Other Users:</strong> Your profile information is visible to other users according to your privacy settings</li>
              <li><strong>Service Providers:</strong> Cloud hosting, email services, payment processors (all bound by data processing agreements)</li>
              <li><strong>Legal Authorities:</strong> When required by law, court order, or to protect safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (you would be notified)</li>
            </ul>
            <p className="mt-4">
              <strong>We never sell your personal data to third parties.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p>We implement robust security measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption in Transit:</strong> All data transmitted using TLS 1.3</li>
              <li><strong>Encryption at Rest:</strong> Sensitive data encrypted using AES-256-GCM</li>
              <li><strong>Password Security:</strong> Passwords hashed using Argon2id (industry-leading algorithm)</li>
              <li><strong>Message Encryption:</strong> Private messages are encrypted end-to-end</li>
              <li><strong>Access Controls:</strong> Role-based access, audit logging, principle of least privilege</li>
              <li><strong>Regular Security Reviews:</strong> Ongoing security assessments and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p>We retain your data for the following periods:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
              <li><strong>Deleted Accounts:</strong> Data permanently erased within 30 days of deletion request</li>
              <li><strong>Messages:</strong> Deleted when both parties delete their accounts or a connection is removed</li>
              <li><strong>Verification Documents:</strong> Deleted immediately after verification is complete</li>
              <li><strong>Audit Logs:</strong> Retained for 2 years for security and compliance purposes</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
            <p>Under UK GDPR, you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Right to Restriction:</strong> Limit how we process your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
              <li><strong>Rights Related to Automated Decision-Making:</strong> Not be subject to solely automated decisions with legal effects</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us at <strong>{CONTACT_EMAILS.privacy}</strong> or 
              use the account settings in the app. We will respond within one month.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Account Deletion</h2>
            <p>
              You can delete your account at any time through the Settings page in the app. When you delete your account:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your profile and all personal information will be permanently deleted</li>
              <li>Your messages will be removed from our systems</li>
              <li>Your veteran network connections will be terminated</li>
              <li>Your verification status will be revoked</li>
              <li>This action is irreversible</li>
            </ul>
            <p className="mt-4">
              Some anonymised data may be retained for legal compliance or aggregate analytics purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Transfers</h2>
            <p>
              Your data is primarily stored in the United Kingdom. If we transfer data outside the UK, we ensure 
              appropriate safeguards are in place, such as Standard Contractual Clauses or adequacy decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
            <p>
              VeteranFinder is not intended for anyone under 18 years of age. We do not knowingly collect 
              personal data from children. If we discover that a child has provided us with personal data, 
              we will delete it immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes 
              by email or through the app. Your continued use of the platform after changes constitutes 
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your rights:
            </p>
            <ul className="list-none space-y-2 mt-4">
              <li><strong>Email:</strong> {CONTACT_EMAILS.privacy}</li>
              <li><strong>Data Protection Officer:</strong> {CONTACT_EMAILS.dpo}</li>
              <li><strong>Postal Address:</strong> [To be confirmed upon incorporation]</li>
            </ul>
            <p className="mt-4">
              You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO):
            </p>
            <ul className="list-none space-y-2 mt-2">
              <li><strong>Website:</strong> <a href="https://ico.org.uk" className="text-primary hover:underline">ico.org.uk</a></li>
              <li><strong>Helpline:</strong> 0303 123 1113</li>
            </ul>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
            <Link href="/dpia" className="text-primary hover:underline">Data Protection Impact Assessment</Link>
            <Link href="/about" className="text-primary hover:underline">About Us</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
