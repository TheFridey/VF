'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Mail, MessageSquare, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { CONTACT_EMAILS, toMailto } from '@/lib/contact-emails';
import { VeteranFinderLogo } from '@/components/brand/veteranfinder-logo';

const SUBJECT_OPTIONS = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'verification', label: 'Verification Help' },
  { value: 'privacy', label: 'Privacy / Data Request' },
  { value: 'feedback', label: 'Feedback / Suggestions' },
  { value: 'business', label: 'Business / Partnership' },
  { value: 'other', label: 'Other' },
] as const;

type ContactSubject = (typeof SUBJECT_OPTIONS)[number]['value'];

export default function ContactPage() {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    subject: ContactSubject | '';
    message: string;
  }>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.subject) {
      toast.error('Please choose a subject');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject,
        message: formData.message.trim(),
      });
      toast.success('Message sent. We will get back to you within 24 to 48 hours.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error('Message failed to send. Please try again or email support directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <VeteranFinderLogo markClassName="h-9" textClassName="text-xl font-bold" />
          </Link>
          <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            We&apos;d love to hear from you. Every website enquiry is routed through VeteranFinder&apos;s Resend mail flow.
          </p>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h2 className="mb-6 text-2xl font-semibold">Get in Touch</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">General Enquiries</h3>
                    <a href={toMailto(CONTACT_EMAILS.hello)} className="text-primary hover:underline">
                      {CONTACT_EMAILS.hello}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Support</h3>
                    <a href={toMailto(CONTACT_EMAILS.support)} className="text-primary hover:underline">
                      {CONTACT_EMAILS.support}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Data Protection</h3>
                    <a href={toMailto(CONTACT_EMAILS.dpo)} className="text-primary hover:underline">
                      {CONTACT_EMAILS.dpo}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-6">
              <h3 className="mb-2 font-semibold">Response Times</h3>
              <p className="text-sm text-muted-foreground">
                We aim to respond to all enquiries within 24 to 48 hours during business days.
                For urgent matters, please mark your email as urgent.
              </p>
            </div>

            <div className="rounded-lg bg-primary/5 p-6">
              <h3 className="mb-2 font-semibold">Report a Safety Concern</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                If you need to report harassment, abuse, or a safety issue, please email us directly at:
              </p>
              <a href={toMailto(CONTACT_EMAILS.safety)} className="font-medium text-primary hover:underline">
                {CONTACT_EMAILS.safety}
              </a>
            </div>
          </div>

          <div>
            <h2 className="mb-6 text-2xl font-semibold">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@veteranfinder.co.uk"
                />
              </div>

              <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium">
                  Subject
                </label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(event) => setFormData({ ...formData, subject: event.target.value as ContactSubject | '' })}
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a subject</option>
                  {SUBJECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(event) => setFormData({ ...formData, message: event.target.value })}
                  required
                  rows={5}
                  className="w-full resize-none rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="How can we help you?"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">About Us</Link>
            <Link href="/dpia" className="text-muted-foreground hover:text-foreground">DPIA</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
