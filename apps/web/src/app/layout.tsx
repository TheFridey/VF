import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PageAnalyticsTracker } from '@/components/analytics/page-analytics-tracker';
import { Providers } from './providers';
import { CookieConsent } from '@/components/cookie-consent';
import { ConditionalToaster } from '@/components/layout/conditional-toaster';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VeteranFinder | Find the people you served with',
  description:
    'The only UK platform built for veterans to reconnect through shared service. Verified. Private. Veterans only.',
  keywords: ['veterans', 'reconnection', 'regiment', 'military', 'UK veterans', 'find veterans'],
  icons: {
    icon: '/veteranfinder-mark.svg',
    shortcut: '/veteranfinder-mark.svg',
    apple: '/veteranfinder-mark.svg',
  },
  openGraph: {
    title: 'VeteranFinder | Find the people you served with',
    description:
      'The only UK platform built for veterans to reconnect through shared service. Verified. Private. Veterans only.',
    url: 'https://veteranfinder.co.uk',
    siteName: 'VeteranFinder',
    images: [
      {
        url: 'https://veteranfinder.co.uk/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VeteranFinder — Find the people you served with',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VeteranFinder | Find the people you served with',
    description:
      'The only UK platform built for veterans to reconnect through shared service. Verified. Private. Veterans only.',
    images: ['https://veteranfinder.co.uk/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <PageAnalyticsTracker />
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </div>
          <CookieConsent />
          <ConditionalToaster />
        </Providers>
      </body>
    </html>
  );
}
