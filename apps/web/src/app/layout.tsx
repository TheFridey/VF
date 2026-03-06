import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import { CookieConsent } from '@/components/cookie-consent';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VeteranFinder - Connect with Fellow Veterans',
  description: 'Veteran reconnection platform to find old colleagues, comrades, and trusted military community support.',
  keywords: ['veterans', 'military', 'brothers in arms', 'reconnection', 'service history'],
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
          <CookieConsent />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#22c55e',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
