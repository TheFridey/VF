'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setPrefersReducedMotion(false);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

function revealDelayClass(delay: number) {
  if (delay >= 0.24) return 'delay-300';
  if (delay >= 0.16) return 'delay-200';
  if (delay >= 0.08) return 'delay-150';
  if (delay > 0) return 'delay-75';
  return '';
}

function revealDistanceClass(distance: number) {
  if (distance >= 30) return 'translate-y-8';
  if (distance >= 20) return 'translate-y-6';
  return 'translate-y-4';
}

export function Reveal({ children, className, delay = 0, distance = 24 }: RevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <div
      ref={ref}
      className={cn(
        className,
        'transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
        revealDelayClass(delay),
        isVisible || prefersReducedMotion ? 'translate-y-0 opacity-100' : `opacity-0 ${revealDistanceClass(distance)}`,
      )}
    >
      {children}
    </div>
  );
}

type FloatProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amplitude?: number;
};

export function Float({ children, className, delay = 0 }: FloatProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div
      className={cn(
        className,
        !prefersReducedMotion && 'hero-float-slow',
        !prefersReducedMotion && delay >= 0.8 && 'hero-float-delayed',
      )}
    >
      {children}
    </div>
  );
}

export function ScrollCue({ className }: { className?: string }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className={cn('flex flex-col items-center gap-3 text-slate-400', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Scroll</span>
      <div className="flex h-10 w-6 items-start justify-center rounded-full border border-slate-300 p-1.5">
        <div className="animate-scroll-indicator h-2 w-1.5 rounded-full bg-slate-400" />
      </div>
    </div>
  );
}
