'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
};

export function Reveal({ children, className, delay = 0, distance = 24 }: RevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

type FloatProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amplitude?: number;
};

export function Float({ children, className, delay = 0, amplitude = 10 }: FloatProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration: 7, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollCue({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <motion.div
      className={cn('flex flex-col items-center gap-3 text-slate-400', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.6 }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Scroll</span>
      <div className="flex h-10 w-6 items-start justify-center rounded-full border border-slate-300 p-1.5">
        <motion.div
          className="h-2 w-1.5 rounded-full bg-slate-400"
          animate={{ y: [0, 14, 0], opacity: [1, 0.45, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
