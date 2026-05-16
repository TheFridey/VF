'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VeteranFinderLogo } from '@/components/brand/veteranfinder-logo';

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
      <div className="flex w-full flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4 lg:px-10 xl:px-14 2xl:px-20">
        <Link href="/" className="min-w-0 text-slate-950">
          <VeteranFinderLogo
            priority
            markClassName="h-8 sm:h-9"
            textClassName="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg"
          />
        </Link>
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
          <Button asChild variant="ghost" className="hidden text-slate-700 hover:text-slate-950 sm:inline-flex">
            <Link href="/status">System Status</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="justify-center whitespace-nowrap px-2 text-slate-700 hover:text-slate-950 sm:px-3"
          >
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="min-w-0 bg-sky-600 px-3 text-center leading-tight hover:bg-sky-700 sm:h-10 sm:px-4"
          >
            <Link href="/auth/register">Create your profile</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
