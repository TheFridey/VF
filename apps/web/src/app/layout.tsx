import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { CookieConsent } from '@/components/cookie-consent';
import { ConditionalToaster } from '@/components/layout/conditional-toaster';
import { UrgentHelpButton } from '@/components/support/urgent-help-button';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VeteranFinder | Veteran Reconnection and Verified Community Access',
  description: 'A trust-first platform for veterans to reconnect, verify their status, and access moderated community spaces.',
  keywords: ['veterans', 'reconnection', 'verification', 'community', 'regiment forums'],
  icons: {
    icon: '/veteranfinder-mark.svg',
    shortcut: '/veteranfinder-mark.svg',
    apple: '/veteranfinder-mark.svg',
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
          {children}
          <UrgentHelpButton />
          <CookieConsent />
          <ConditionalToaster />
        </Providers>
      </body>
    </html>
  );
}
