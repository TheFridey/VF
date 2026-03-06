import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'VeteranFinder Admin',
  description: 'Admin panel for VeteranFinder',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
