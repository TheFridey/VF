'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const LazyToaster = dynamic(
  () => import('react-hot-toast').then((module) => module.Toaster),
  { ssr: false },
);

export function ConditionalToaster() {
  const pathname = usePathname();

  if (pathname === '/') {
    return null;
  }

  return (
    <LazyToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: 'border border-slate-200 bg-slate-800 text-white shadow-lg',
        success: {
          className: 'border border-emerald-200 bg-emerald-600 text-white shadow-lg',
        },
        error: {
          className: 'border border-red-200 bg-red-500 text-white shadow-lg',
        },
      }}
    />
  );
}
