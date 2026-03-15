'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-slate-200/90 bg-white/92 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl'
          : 'bg-white/78 backdrop-blur-lg',
      )}
    >
      <div className="flex w-full items-center justify-between px-6 py-4 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <Link href="/" className="flex items-center gap-2 text-slate-950">
          <Shield className="h-7 w-7 text-sky-600" />
          <span className="text-lg font-semibold tracking-tight">VeteranFinder</span>
        </Link>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="text-slate-700 hover:text-slate-950">
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button asChild className="bg-sky-600 hover:bg-sky-700">
            <Link href="/auth/register">Join VeteranFinder</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
