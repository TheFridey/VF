'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Lock,
  MapPinned,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Float, ScrollCue } from '@/components/home/home-motion';

const proofPoints = [
  'Veteran-only access with verification',
  'Private messaging and moderation controls',
  'Regiment, service, and community context built in',
];

const phrases = ['the same regiment', 'the same tour', 'the same years', 'the same stories'];

const steps = [
  {
    label: 'Shared context',
    title: 'Service history gives the search meaning',
    description: 'Profiles are built around the details that matter for reconnection, not endless posting.',
    icon: MapPinned,
  },
  {
    label: 'Verification',
    title: 'Access is based on trust',
    description: 'Veteran status is reviewed so the network stays grounded and private.',
    icon: Shield,
  },
  {
    label: 'First contact',
    title: 'The conversation can start quietly',
    description: 'When you find the right person, messages and forums give you a simpler way back in.',
    icon: MessageSquare,
  },
];

const signalCards = [
  {
    icon: Clock3,
    title: 'A calmer first step',
    description: 'No public feed, no pressure to perform, just enough structure to help you find the right people.',
  },
  {
    icon: Lock,
    title: 'Private by default',
    description: 'Verification, moderation, and member-only areas are part of the product, not marketing garnish.',
  },
];

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const [activePhrase, setActivePhrase] = useState(0);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const orbOneY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const orbTwoY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.88], [1, 0.74]);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActivePhrase((current) => (current + 1) % phrases.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-screen items-center overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#fbfcfb_0%,#f4f6f7_100%)] pt-24"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <motion.div
          className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl"
          style={{ y: prefersReducedMotion ? 0 : orbOneY }}
        />
        <motion.div
          className="absolute bottom-10 right-[-6rem] h-96 w-96 rounded-full bg-sky-100/55 blur-3xl"
          style={{ y: prefersReducedMotion ? 0 : orbTwoY }}
        />
      </div>

      <Float delay={0.2} amplitude={8} className="absolute left-[9%] top-40 hidden xl:block">
        <div className="rounded-2xl border border-emerald-200 bg-white/90 p-3 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
          <Shield className="h-5 w-5 text-emerald-700" />
        </div>
      </Float>
      <Float delay={1.1} amplitude={10} className="absolute right-[12%] top-52 hidden xl:block">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
          <Users className="h-5 w-5 text-slate-700" />
        </div>
      </Float>
      <Float delay={1.8} amplitude={7} className="absolute bottom-28 right-[18%] hidden xl:block">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.28)] backdrop-blur">
          <Sparkles className="h-5 w-5 text-amber-600" />
        </div>
      </Float>

      <motion.div
        className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:px-8"
        style={{ opacity: prefersReducedMotion ? 1 : heroOpacity }}
      >
        <div className="grid gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
          <div className="max-w-3xl">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800 backdrop-blur"
            >
              <Shield className="h-3.5 w-3.5" />
              Verified veteran network
            </motion.div>

            <motion.h1
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl"
            >
              Somewhere in here is someone who remembers
              <span className="mt-2 block text-emerald-800">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phrases[activePhrase]}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
                    transition={{ duration: 0.35 }}
                    className="inline-block"
                  >
                    {phrases[activePhrase]}.
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16 }}
              className="mt-5 max-w-2xl text-lg leading-8 text-slate-700"
            >
              VeteranFinder helps UK veterans find the people they served with through verified access, service
              context, and a quieter kind of community experience built for reconnection rather than noise.
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button asChild size="lg" className="bg-emerald-700 shadow-[0_18px_40px_-24px_rgba(4,120,87,0.45)] hover:bg-emerald-800">
                <Link href="/auth/register">
                  Start looking
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 bg-white/80 text-slate-800 hover:bg-white">
                <Link href="/auth/login">Already a member?</Link>
              </Button>
            </motion.div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((item, index) => (
                <motion.div
                  key={item}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.32 + index * 0.08 }}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  className="rounded-2xl border border-slate-200 bg-white/88 px-4 py-4 text-sm text-slate-700 shadow-sm backdrop-blur"
                >
                  <CheckCircle2 className="mb-3 h-4 w-4 text-emerald-700" />
                  {item}
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.18 }}
            className="rounded-[32px] border border-slate-200 bg-white/86 p-6 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.32)] backdrop-blur"
          >
            <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">What this feels like</p>
              <div className="mt-5 space-y-4">
                {steps.map(({ icon: Icon, label, title, description }, index) => (
                  <motion.div
                    key={title}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.35 + index * 0.09 }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-950">{title}</p>
                        <p className="mt-1 text-sm text-slate-600">{description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {signalCards.map(({ icon: Icon, title, description }, index) => (
                <motion.div
                  key={title}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.58 + index * 0.1 }}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  <p className="mt-3 text-sm font-medium text-slate-950">{title}</p>
                  <p className="mt-1 text-sm text-slate-600">{description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <ScrollCue className="mt-14" />
      </motion.div>
    </section>
  );
}
