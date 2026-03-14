import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Float, Reveal } from '@/components/home/home-motion';

export function CtaSection() {
  return (
    <section className="relative overflow-hidden border-t border-slate-200 bg-slate-50">
      <Float delay={0.4} amplitude={8} className="absolute left-[8%] top-16 hidden xl:block">
        <div className="h-16 w-16 rounded-full bg-emerald-100/80 blur-2xl" />
      </Float>
      <Float delay={1.1} amplitude={10} className="absolute bottom-10 right-[10%] hidden xl:block">
        <div className="h-20 w-20 rounded-full bg-sky-100/80 blur-2xl" />
      </Float>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.28)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Join with clarity
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Start with a straightforward account, then verify when you are ready.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                The platform is designed to keep expectations clear: account creation, profile setup, verification review,
                then access to the parts of VeteranFinder that depend on trust.
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="space-y-3 text-sm text-slate-600">
                <p className="font-medium text-slate-950">What you can expect next</p>
                <p>Create your account and complete the core profile details that help us place you properly.</p>
                <p>Submit verification evidence when you are ready so access is based on the same standard for everyone.</p>
                <p>Use messages, reconnection tools, BIA spaces, and regiment forums once your status allows it.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
                  <Link href="/auth/register">
                    Create an account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-white">
                  <Link href="/auth/login">Log in</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
