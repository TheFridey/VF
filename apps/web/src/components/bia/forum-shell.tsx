'use client';

import type { ReactNode } from 'react';
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_28%),linear-gradient(180deg,#08110f_0%,#07111a_50%,#04070b_100%)]" />
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
    <div className={cn('mx-auto w-full max-w-[1600px] space-y-6 lg:space-y-8', className)}>
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
        'rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(8,15,23,0.9))] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}
