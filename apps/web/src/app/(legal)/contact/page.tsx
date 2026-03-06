'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Mail, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Message sent! We\'ll get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            We&apos;d love to hear from you. Get in touch with our team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">General Enquiries</h3>
                    <a href="mailto:hello@veteranfinder.com" className="text-primary hover:underline">
                      hello@veteranfinder.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Support</h3>
                    <a href="mailto:support@veteranfinder.com" className="text-primary hover:underline">
                      support@veteranfinder.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Data Protection</h3>
                    <a href="mailto:dpo@veteranfinder.com" className="text-primary hover:underline">
                      dpo@veteranfinder.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Response Times</h3>
              <p className="text-sm text-muted-foreground">
                We aim to respond to all enquiries within 24-48 hours during business days.
                For urgent matters, please mark your email as urgent.
              </p>
            </div>

            <div className="bg-primary/5 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Report a Safety Concern</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If you need to report harassment, abuse, or a safety issue, please email us 
                directly at:
              </p>
              <a href="mailto:safety@veteranfinder.com" className="text-primary font-medium hover:underline">
                safety@veteranfinder.com
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-1">
                  Subject
                </label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Enquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="verification">Verification Help</option>
                  <option value="privacy">Privacy / Data Request</option>
                  <option value="feedback">Feedback / Suggestions</option>
                  <option value="business">Business / Partnership</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t">
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
