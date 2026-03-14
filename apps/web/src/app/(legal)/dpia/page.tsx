'use client';

import Link from 'next/link';
import { Shield, ArrowLeft, FileText, AlertTriangle, CheckCircle, Lock, Eye, Trash2 } from 'lucide-react';

export default function DPIAPage() {
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
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Data Protection Impact Assessment</h1>
        </div>
        <p className="text-muted-foreground mb-8">Project: VeteranFinder | Status: Draft – Pre-Launch | Jurisdiction: United Kingdom</p>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Living Document</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This DPIA is maintained as a living document and will be updated as the platform evolves.
                Last reviewed: February 2025
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview and Purpose</h2>
            <p>
              This Data Protection Impact Assessment (DPIA) assesses the risks to the rights and freedoms of 
              individuals arising from the processing of personal data by VeteranFinder.
            </p>
            <p>VeteranFinder is a trust-led digital platform designed to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Enable military veterans to reconnect with individuals they served alongside (&quot;Brothers In Arms&quot; / BIA functionality)</li>
              <li>Enable verified veterans to communicate through messaging, video, forums, and directory features</li>
            </ul>
            <p>
              The platform processes personal data that may directly or indirectly reveal special category data, 
              including inferred political or social affiliations and mental-health-adjacent 
              information. As such, a DPIA is required under UK GDPR and DUAA due to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>High-risk processing</li>
              <li>Novel data combinations</li>
              <li>Potentially vulnerable data subjects</li>
              <li>Private communications at scale</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Processing</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">2.1 Nature of Processing</h3>
            <p>VeteranFinder processes personal data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Verify veteran status</li>
              <li>Enable profile creation</li>
              <li>Connect veterans with shared service history</li>
              <li>Facilitate private messaging</li>
              <li>Provide optional paid feature enhancements</li>
            </ul>
            <p>Processing is ongoing, automated, and user-initiated.</p>

            <h3 className="text-xl font-medium mt-6 mb-3">2.2 Categories of Data Subjects</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>UK military veterans</li>
              <li>Potentially vulnerable individuals (e.g., those experiencing isolation or mental health challenges)</li>
            </ul>
            <p className="font-medium mt-4">No children are permitted on the platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Categories of Personal Data</h2>
            
            <div className="grid gap-6 mt-6">
              <div className="bg-card rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">3.1 Standard Personal Data</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Name or chosen display name</li>
                  <li>Age range</li>
                  <li>Email address</li>
                  <li>Account identifiers</li>
                  <li>Coarse location (region/city level only)</li>
                  <li>Device and log data (IP address, timestamps)</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">3.2 Veteran-Specific Data</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Veteran status (verified/unverified)</li>
                  <li>Service branch</li>
                  <li>Unit or regiment (historical)</li>
                  <li>Service timeframes</li>
                  <li>Deployment regions (high-level only)</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">3.3 Communications Data</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Private messages between users</li>
                  <li>Reports and moderation interactions</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <h4 className="font-semibold mb-2">3.4 Media Data</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Profile images</li>
                  <li>Optional profile video</li>
                  <li>Optional music/media links</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold mb-2 text-amber-700 dark:text-amber-300">3.5 Special Category / Inferred Sensitive Data</h4>
                <p className="text-sm mb-2">The platform may directly or indirectly process or infer:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Political or social affiliations (military service history)</li>
                  <li>Mental-health-adjacent information (through user disclosures)</li>
                </ul>
                <p className="text-sm mt-2 font-medium">These are treated as high-risk data regardless of whether explicitly declared.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Lawful Basis for Processing</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">4.1 Article 6 – UK GDPR</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Consent:</strong> Profile creation, optional media uploads, and community feature participation</li>
              <li><strong>Legitimate Interests:</strong> Platform safety, moderation, fraud prevention, reconnection functionality</li>
            </ul>
            <p>A Legitimate Interests Assessment (LIA) supports this processing, with user interests overriding commercial gain.</p>

            <h3 className="text-xl font-medium mt-6 mb-3">4.2 Article 9 – Special Category Data</h3>
            <p>Processing relies on:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Explicit consent provided by users during onboarding and feature activation</li>
              <li>Data minimisation to avoid unnecessary capture of sensitive data</li>
            </ul>
            <p className="font-medium">Users may withdraw consent at any time.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Necessity and Proportionality</h2>
            <p>The processing is necessary to achieve the platform&apos;s stated aims:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Without service history data, BIA reconnection is not possible</li>
              <li>Without messaging, reconnection and community support cannot occur</li>
              <li>Without service history data, meaningful reconnection cannot function</li>
            </ul>
            <p>All processing is proportionate, optional where possible, and user-controlled.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Risk Assessment</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">6.1 Identified Risks</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left">Risk</th>
                    <th className="border border-border p-3 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3 font-medium">Impersonation / Stolen Valour</td>
                    <td className="border border-border p-3">False claims of service status</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-medium">Unauthorised Access</td>
                    <td className="border border-border p-3">Account compromise or insider misuse</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-medium">Emotional Harm</td>
                    <td className="border border-border p-3">Distress caused by reconnection or rejection</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-medium">Harassment or Abuse</td>
                    <td className="border border-border p-3">Misuse of messaging features</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-medium">Re-identification</td>
                    <td className="border border-border p-3">Linking service history to real-world identity</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-medium">Data Misuse</td>
                    <td className="border border-border p-3">Use of data outside user expectations</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-medium mt-6 mb-3">6.2 Risk Severity</h3>
            <p>Risks are assessed as <strong>medium to high</strong> due to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Trust-sensitive user base</li>
              <li>Identity-linked histories</li>
              <li>Private communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Safeguards and Mitigations</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">7.1 Technical Measures</h4>
                </div>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Strong password hashing (Argon2id)</li>
                  <li>Encrypted data in transit (TLS 1.3)</li>
                  <li>Encrypted sensitive data at rest (AES-256-GCM)</li>
                  <li>Role-based access control</li>
                  <li>Audit logging for admin access</li>
                  <li>Rate-limiting and abuse detection</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">7.2 Organisational Measures</h4>
                </div>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Strict internal access policies</li>
                  <li>No blanket staff access to private messages</li>
                  <li>Moderation access only upon report or flag</li>
                  <li>Clear escalation procedures</li>
                  <li>Incident response plan</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">7.3 User Controls</h4>
                </div>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Granular privacy settings</li>
                  <li>Ability to block and report users</li>
                  <li>Ability to delete account and data</li>
                  <li>Clear consent flows</li>
                </ul>
              </div>

              <div className="bg-card rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">7.4 Data Minimisation &amp; Retention</h4>
                </div>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Only essential data collected</li>
                  <li>Messaging data retained only while accounts active</li>
                  <li>Deleted accounts anonymised or erased within defined periods</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Residual Risk Assessment</h2>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">After safeguards, residual risk is assessed as:</p>
                  <ul className="mt-2 space-y-1 text-green-700 dark:text-green-300">
                    <li>• Low to medium, and proportionate to the platform&apos;s purpose</li>
                    <li>• Acceptable in light of safeguards, transparency, and user benefit</li>
                    <li>• No unmitigated high risks remain that would require prior consultation with the ICO at this stage</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Consultation and Review</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>No external consultation has been undertaken at this stage</li>
              <li>ICO consultation will be considered if new high-risk processing is introduced</li>
            </ul>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Review Schedule</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pre-launch (this document)</li>
              <li>Post-mobile app launch</li>
              <li>Introduction of paid tiers</li>
              <li>Expansion beyond the UK</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. DPIA Outcome</h2>
            <div className="bg-primary/5 rounded-lg p-6 border">
              <p className="text-lg">
                The processing described is <strong>lawful, necessary, and proportionate</strong>. With the 
                safeguards outlined, VeteranFinder&apos;s data processing is compliant with UK GDPR and DUAA requirements.
              </p>
              <p className="mt-4">
                This DPIA will be maintained as a living document and updated as the platform evolves.
              </p>
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Prepared by:</strong> VeteranFinder (Founder / Data Protection Lead)<br />
                  <strong>Approval:</strong> Pending formal company incorporation
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>
            <Link href="/about" className="text-primary hover:underline">About Us</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
