import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'VeteranFinder — Command Centre',
  description: 'Admin panel for VeteranFinder',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ background: '#060a12' }}>
      <body suppressHydrationWarning style={{ background: '#060a12', margin: 0 }}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0d1524',
              border: '1px solid #1a2636',
              color: '#c8d6e5',
              fontFamily: "'Barlow', sans-serif",
              fontSize: 13,
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#060a12' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#060a12' } },
          }}
        />
      </body>
    </html>
  );
}
