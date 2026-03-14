'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ForumStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative min-h-[calc(100vh-5rem)] overflow-hidden bg-[#08110f] text-slate-100', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_24%),linear-gradient(180deg,#08110f_0%,#09131c_48%,#060b10_100%)]" />
      <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:72px_100%] opacity-10 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_56px] opacity-10 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="relative px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </div>
  );
}

export function ForumShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1520px] space-y-5 lg:space-y-7', className)}>
      {children}
    </div>
  );
}

export function ForumPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(8,15,23,0.88))] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ForumBreadcrumbs({
  items,
  className,
}: {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav className={cn('flex flex-wrap items-center gap-2 text-xs text-slate-400', className)} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content = item.href && !isLast ? (
          <Link href={item.href} className="transition-colors hover:text-slate-100">
            {item.label}
          </Link>
        ) : (
          <span className={cn(isLast ? 'text-slate-200' : 'text-slate-400')}>{item.label}</span>
        );

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {content}
            {!isLast ? <ChevronRight className="h-3.5 w-3.5 text-slate-600" /> : null}
          </div>
        );
      })}
    </nav>
  );
}
