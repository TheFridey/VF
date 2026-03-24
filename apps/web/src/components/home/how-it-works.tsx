import { ArrowRight, FileCheck, MessageCircleMore, UserPlus } from 'lucide-react';
import { Reveal } from '@/components/home/home-motion';

const steps = [
  {
    icon: UserPlus,
    title: 'Create your account',
    description: 'Email, password, and your service details. Takes about three minutes.',
  },
  {
    icon: FileCheck,
    title: 'Submit verification evidence',
    description: 'A photo of your veteran card or service document is enough. A moderator reviews it — usually within 48 hours.',
  },
  {
    icon: MessageCircleMore,
    title: 'Reconnect and participate',
    description: 'Search by regiment, years served, and deployment. When you find someone, message them directly. Private by default.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#f4fbff_0%,#f8fbff_100%)]">
      <div className="w-full px-6 py-16 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">What happens next</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Three steps. That&apos;s it.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Create your profile first. Verification is what unlocks search and private messaging, so the reconnection starts in the right order.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['Create your profile', 'Upload proof', 'Moderator review', 'Reconnect privately'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-sky-100 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </Reveal>
        <div className="relative mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {steps.map((step, index) => (
            <div key={step.title} className="contents">
              <Reveal delay={index * 0.08}>
                <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1">
                  <step.icon className="h-5 w-5 text-sky-600" />
                  <h3 className="mt-4 text-xl font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                </div>
              </Reveal>
              {index < steps.length - 1 && (
                <div className="hidden items-center justify-center lg:flex">
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
