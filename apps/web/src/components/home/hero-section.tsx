'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const phrases = [
  'the same regiment',
  'the same tour',
  'the same deployment',
  'the same unit',
];

const longestPhrase = phrases.reduce(
  (longest, phrase) => (phrase.length > longest.length ? phrase : longest),
  phrases[0],
);

const TYPING_SPEED_MS = 38;
const DELETING_SPEED_MS = 22;
const PHRASE_HOLD_MS = 850;
const PHRASE_SWITCH_MS = 180;

const trustPoints = [
  'Veteran-only access',
  'Private messaging',
  'Verification built in',
];

const sceneClass = (active: boolean) =>
  [
    'hero-scene absolute inset-4',
    active ? 'hero-scene-active' : 'hero-scene-hidden',
  ].join(' ');

export function HeroSection() {
  const [activePhrase, setActivePhrase] = useState(0);
  const [typedPhrase, setTypedPhrase] = useState('');
  const [isDeletingPhrase, setIsDeletingPhrase] = useState(false);
  const [visualStage, setVisualStage] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncPreference);
      return () => mediaQuery.removeEventListener('change', syncPreference);
    }

    mediaQuery.addListener(syncPreference);

    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  useEffect(() => {
    const currentPhrase = phrases[activePhrase];

    if (prefersReducedMotion) {
      setTypedPhrase(currentPhrase);
      setIsDeletingPhrase(false);
      const timeout = window.setTimeout(() => {
        setActivePhrase((current) => (current + 1) % phrases.length);
      }, 1400);

      return () => window.clearTimeout(timeout);
    } else {
      const shouldPauseAtFullPhrase = typedPhrase === currentPhrase && !isDeletingPhrase;
      const shouldPauseBeforeNextPhrase = isDeletingPhrase && typedPhrase.length === 0;
      const delay = shouldPauseAtFullPhrase
        ? PHRASE_HOLD_MS
        : shouldPauseBeforeNextPhrase
          ? PHRASE_SWITCH_MS
          : isDeletingPhrase
            ? DELETING_SPEED_MS
            : TYPING_SPEED_MS;

      const timeout = window.setTimeout(() => {
        if (!isDeletingPhrase) {
          if (typedPhrase.length < currentPhrase.length) {
            setTypedPhrase(currentPhrase.slice(0, typedPhrase.length + 1));
            return;
          }

          setIsDeletingPhrase(true);
          return;
        }

        if (typedPhrase.length > 0) {
          setTypedPhrase(currentPhrase.slice(0, typedPhrase.length - 1));
          return;
        }

        setIsDeletingPhrase(false);
        setActivePhrase((current) => (current + 1) % phrases.length);
      }, delay);

      return () => window.clearTimeout(timeout);
    }
  }, [activePhrase, isDeletingPhrase, prefersReducedMotion, typedPhrase]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisualStage((current) => (current + 1) % 3);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative isolate flex min-h-screen items-center overflow-hidden border-b border-sky-100 bg-[linear-gradient(180deg,#f4faff_0%,#f9fcff_42%,#ffffff_100%)] pt-24">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="hero-grid-motion absolute inset-0" />
        <div className="hero-top-glow absolute inset-x-[-10%] top-[-12%] h-[24rem]" />
        <div className="hero-sweep-left absolute inset-y-[-10%] left-[-14%] w-[34rem]" />
        <div className="hero-sweep-right absolute inset-y-[-8%] right-[-12%] w-[30rem]" />
        <div className="hero-line-one absolute inset-x-[10%] top-[14%] h-px" />
        <div className="hero-line-two absolute inset-x-[24%] top-[26%] h-px" />
        <div className="hero-line-three absolute inset-x-[6%] top-[38%] h-px" />
        <div className="hero-signal-one absolute left-[12%] top-[22%] h-2.5 w-2.5 rounded-full" />
        <div className="hero-signal-two absolute right-[18%] top-[34%] h-2 w-2 rounded-full" />
        <div className="hero-shimmer absolute inset-y-0 left-[-20%] w-[46rem]" />
        <div className="hero-orb-one absolute left-[-6rem] top-20 h-80 w-80 rounded-full" />
        <div className="hero-orb-two absolute right-[-8rem] top-28 h-[24rem] w-[24rem] rounded-full" />
        <div className="hero-orb-three absolute left-[18%] top-[18%] h-28 w-28 rounded-full" />
        <div className="hero-orb-four absolute right-[16%] top-[52%] h-36 w-36 rounded-full" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.94)_100%)]" />
      </div>

      <div className="hero-float-slow absolute left-[4%] top-24 z-10 hidden xl:block">
        <div className="rounded-2xl border border-sky-200/80 bg-white/85 p-3 shadow-[0_18px_50px_-32px_rgba(14,116,144,0.24)] backdrop-blur">
          <Shield className="h-5 w-5 text-sky-600" />
        </div>
      </div>
      <div className="hero-float-slow hero-float-delayed absolute right-[6%] top-56 z-10 hidden xl:block">
        <div className="rounded-2xl border border-sky-100 bg-white/85 p-3 shadow-[0_18px_50px_-32px_rgba(14,116,144,0.2)] backdrop-blur">
          <Users className="h-5 w-5 text-sky-500" />
        </div>
      </div>

      <div className="relative z-20 w-full px-6 pb-24 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-[42rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 backdrop-blur">
              <Shield className="h-3.5 w-3.5" />
              Verified veteran network
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-[4rem] lg:leading-[1.02]">
              <span className="block">Find the people you served with.</span>
              <span className="mt-2 block min-h-[3.2rem] text-sky-700 sm:min-h-[3.4rem]">
                <span className="sr-only">
                  Match through the same regiment, the same tour, the same deployment, or the same unit.
                </span>
                <span aria-hidden="true" className="relative inline-grid max-w-full items-center align-top">
                  <span className="invisible whitespace-nowrap pr-[3px]">{longestPhrase}</span>
                  <span className="absolute inset-0 inline-flex items-center whitespace-nowrap">
                    <span className="inline-block">{typedPhrase}</span>
                    {!prefersReducedMotion && (
                      <span
                        aria-hidden="true"
                        className="hero-caret ml-px inline-block h-[0.95em] w-[2px] rounded-full bg-sky-500"
                      />
                    )}
                  </span>
                </span>
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              A quieter place for UK veterans to reconnect through shared service, trusted access, and simple private conversation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-sky-600 shadow-[0_18px_40px_-24px_rgba(14,165,233,0.42)] hover:bg-sky-700">
                <Link href="/auth/register">
                  Start here
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-sky-200 bg-white/80 text-slate-800 hover:bg-white">
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {trustPoints.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-sky-100 bg-white/88 px-3 py-1.5 text-sm text-slate-700 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[30rem]">
            <div className="relative overflow-hidden rounded-[34px] border border-sky-100 bg-white/82 p-6 shadow-[0_28px_80px_-42px_rgba(14,116,144,0.24)] backdrop-blur">
              <div className="absolute inset-x-8 top-8 h-28 rounded-full bg-sky-100/70 blur-3xl" />
              <div className="relative rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3f9ff_100%)] p-6">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  <span>Shared overlap</span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] tracking-[0.2em] text-sky-700">
                    Likely match
                  </span>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="relative h-[21.5rem] overflow-hidden rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,#f9fcff_0%,#eff8ff_100%)] p-4">
                    <div className={sceneClass(visualStage === 0)}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-sky-100 bg-white/96 px-4 py-3 shadow-sm">
                          <p className="text-sm font-medium text-slate-950">Liam S.</p>
                          <p className="mt-1 text-xs text-slate-500">Royal Signals, 2009-2014</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">Afghanistan</span>
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">2011</span>
                          </div>
                        </div>
                        <div className="rounded-3xl border border-sky-100 bg-white/96 px-4 py-3 shadow-sm">
                          <p className="text-sm font-medium text-slate-950">Mark T.</p>
                          <p className="mt-1 text-xs text-slate-500">Signals detachment, 2010-2013</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">Afghanistan</span>
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">2011</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex justify-center">
                        <div className="rounded-full border border-sky-200 bg-white/96 px-3 py-2 text-center shadow-sm">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">Afghanistan, 2011</p>
                        </div>
                      </div>
                      <div className="mt-5 rounded-3xl border border-sky-100 bg-white/96 px-4 py-3 text-sm text-slate-700 shadow-sm">
                        <div className="flex items-center gap-2 text-sky-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Shared overlap found</span>
                        </div>
                        <p className="mt-2 leading-6">Afghanistan in 2011 appears in both service histories.</p>
                      </div>
                    </div>

                    <div className={sceneClass(visualStage === 1)}>
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <div className="rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-slate-950 shadow-sm">
                            Liam S.
                          </div>
                          <div className="rounded-full border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-slate-950 shadow-sm">
                            Mark T.
                          </div>
                        </div>

                        <div className="relative mx-3 h-24">
                          <div className="absolute left-7 right-7 top-1/2 h-px -translate-y-1/2 border-t-2 border-dashed border-sky-300/80" />
                          <div className="absolute left-6 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-sky-500" />
                          <div className="absolute right-6 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-sky-400" />
                          <div className="hero-connection-pulse absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-sky-500 shadow-[0_0_0_10px_rgba(14,165,233,0.14)]" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200 bg-white/98 px-3 py-2 text-center shadow-sm">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">Connection forming</p>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-sky-100 bg-white/96 px-4 py-3 text-sm text-slate-700 shadow-sm">
                          <div className="flex items-center gap-2 text-sky-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Shared tour detected</span>
                          </div>
                          <p className="mt-2 leading-6">Afghanistan, 2011 gives the reconnection a real starting point.</p>
                        </div>
                      </div>
                    </div>

                    <div className={sceneClass(visualStage === 2)}>
                      <div className="rounded-full border border-sky-200 bg-white/96 px-3 py-2 text-center shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">First messages</p>
                      </div>
                      <div className="mt-5 space-y-3">
                        <div className="max-w-[82%] rounded-[24px] rounded-tl-md border border-sky-100 bg-white/96 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                          Were you out in Afghanistan in 2011 as well?
                        </div>
                        <div className="rounded-[24px] rounded-tr-md bg-sky-600 px-4 py-3 text-sm leading-6 text-white shadow-[0_18px_30px_-20px_rgba(14,165,233,0.55)] ml-auto max-w-[82%]">
                          Yes. Herrick 14. I think we may have crossed paths.
                        </div>
                        <div className="max-w-[70%] rounded-[24px] rounded-tl-md border border-sky-100 bg-white/96 px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                          That sounds very possible.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map((stage) => (
                      <span
                        key={stage}
                        className={[
                          'h-2.5 rounded-full transition-all duration-500',
                          visualStage === stage ? 'w-8 bg-sky-500' : 'w-2.5 bg-sky-200',
                        ].join(' ')}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Lock className="h-4 w-4 text-sky-600" />
                  Private by default
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 hidden flex-col items-center gap-3 text-slate-400 md:flex">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">Scroll</span>
          <div className="flex h-10 w-6 items-start justify-center rounded-full border border-slate-300 p-1.5">
            <div className="animate-scroll-indicator h-2 w-1.5 rounded-full bg-slate-400" />
          </div>
        </div>
      </div>
    </section>
  );
}
