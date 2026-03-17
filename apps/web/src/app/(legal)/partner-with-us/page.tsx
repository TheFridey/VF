import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Layers3,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Float, Reveal, ScrollCue } from '@/components/home/home-motion';
import { SiteHeader } from '@/components/home/site-header';
import { Button } from '@/components/ui/button';
import { PartnerEnquiryForm } from '@/components/partnerships/partner-enquiry-form';
import { CONTACT_EMAILS, toMailto } from '@/lib/contact-emails';

export const metadata: Metadata = {
  title: 'Partner With Us | VeteranFinder',
  description: 'Explore curated partnership opportunities with VeteranFinder for charities, veteran organisations, support providers, and aligned businesses.',
};

const whoThisIsFor = [
  {
    title: 'Charities and veteran organisations',
    description: 'Trusted organisations offering welfare, transition, practical support, or community services for veterans and their families.',
    icon: ShieldCheck,
  },
  {
    title: 'Mental health, housing, and welfare support',
    description: 'Providers whose services need careful context, credibility, and appropriate visibility rather than broad untargeted promotion.',
    icon: ShieldCheck,
  },
  {
    title: 'Training and employment partners',
    description: 'Teams helping veterans with career transition, skills development, mentoring, or long-term employment pathways.',
    icon: Briefcase,
  },
  {
    title: 'Relevant businesses with a clear fit',
    description: 'Selected businesses whose offer is genuinely useful to the VeteranFinder audience and appropriate for a trust-first platform.',
    icon: Building2,
  },
] as const;

const opportunityCards = [
  {
    title: 'Dashboard placement',
    description: 'Limited placements inside the logged-in experience for relevant support, offers, or member resources.',
  },
  {
    title: 'Resource and support visibility',
    description: 'Curated inclusion in areas where members are already looking for practical help, guidance, or service pathways.',
  },
  {
    title: 'Forum and community visibility',
    description: 'Selective exposure within moderated community spaces where relevance and tone matter more than volume.',
  },
  {
    title: 'Email and spotlight features',
    description: 'Occasional spotlight placements for aligned organisations when the context and timing are right.',
  },
] as const;

const processSteps = [
  'You submit an enquiry with enough detail for us to assess fit.',
  'The VeteranFinder team reviews relevance, audience value, and placement suitability manually.',
  'If there is a fit, we reply with tailored options, availability, and quoted pricing.',
  'Any partnership is curated, limited, and reviewed against audience trust.',
] as const;

export default function PartnerWithUsPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4faff_0%,#fbfdff_24%,#ffffff_100%)] text-slate-950">
      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden border-b border-sky-100 pt-28">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="hero-grid-motion absolute inset-0 opacity-70" />
            <div className="hero-top-glow absolute inset-x-[-12%] top-[-12%] h-[26rem]" />
            <div className="hero-sweep-left absolute inset-y-[-6%] left-[-14%] w-[32rem]" />
            <div className="hero-sweep-right absolute inset-y-[-8%] right-[-10%] w-[28rem]" />
            <div className="hero-orb-one absolute left-[-7rem] top-24 h-72 w-72 rounded-full opacity-80" />
            <div className="hero-orb-two absolute right-[-7rem] top-16 h-[22rem] w-[22rem] rounded-full opacity-80" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.98)_100%)]" />
          </div>

          <div className="relative z-10 w-full px-6 pb-20 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <Reveal className="max-w-[43rem]">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 backdrop-blur">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Curated partnerships
                </div>

                <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-[4rem] lg:leading-[1.04]">
                  Partner with a trusted veteran-focused platform.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
                  VeteranFinder is built around verified access, community trust, and responsible visibility. We work with a limited number of aligned organisations whose support or services genuinely belong in front of our audience.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-sky-600 shadow-[0_18px_42px_-24px_rgba(14,165,233,0.44)] hover:bg-sky-700">
                    <Link href="#partner-enquiry">
                      Start an enquiry
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-sky-200 bg-white/80 text-slate-800 hover:bg-white">
                    <a href={toMailto(CONTACT_EMAILS.partnerships)}>
                      Email partnerships
                    </a>
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  {[
                    'Manual review on every enquiry',
                    'Limited placements only',
                    'Quoted pricing after review',
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-sky-100 bg-white/88 px-3 py-1.5 text-sm text-slate-700 shadow-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <Float>
                  <div className="relative mx-auto max-w-[33rem] rounded-[34px] border border-sky-100 bg-white/88 p-6 shadow-[0_28px_80px_-40px_rgba(14,116,144,0.24)] backdrop-blur">
                    <div className="absolute inset-x-10 top-10 h-32 rounded-full bg-sky-100/80 blur-3xl" />
                    <div className="relative rounded-[28px] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3f9ff_100%)] p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Partnership profile</p>
                          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Visibility with context</h2>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-white/90 p-3 text-sky-700 shadow-sm">
                          <Layers3 className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-8 space-y-4">
                        <div className="rounded-[24px] border border-sky-100 bg-white/96 p-4 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Audience fit</p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">
                            VeteranFinder serves a verified veteran-focused audience where relevance, privacy, and trust are more important than broad reach.
                          </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Placement examples</p>
                            <div className="mt-3 space-y-2 text-sm text-slate-700">
                              <p>Dashboard placement</p>
                              <p>Support hub inclusion</p>
                              <p>Email spotlight rotation</p>
                            </div>
                          </div>
                          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">How we work</p>
                            <div className="mt-3 space-y-2 text-sm text-slate-700">
                              <p>Manual review</p>
                              <p>Limited availability</p>
                              <p>Pricing quoted individually</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Float>
              </Reveal>
            </div>

            <ScrollCue className="mt-12 hidden md:flex" />
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="w-full px-6 py-20 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
            <Reveal className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why partner with VeteranFinder</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                The value is trust, relevance, and placement quality.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                VeteranFinder is not designed as a broad ad marketplace. It is a veteran-focused environment where support, services, and partner visibility need to feel appropriate to the community, the context, and the moment.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: 'Verified veteran-focused audience',
                  description: 'The platform is built around verification and member trust, which means visibility has more meaning than generic untargeted impressions.',
                  icon: Users,
                },
                {
                  title: 'Curated partnerships only',
                  description: 'We assess fit carefully and limit placements so the experience remains credible, calm, and useful for members.',
                  icon: ShieldCheck,
                },
                {
                  title: 'Support surfaced in the right places',
                  description: 'Relevant organisations can be introduced in ways that match the member journey, whether that is a dashboard touchpoint, resource area, or spotlight feature.',
                  icon: Layers3,
                },
              ].map(({ title, description, icon: Icon }, index) => (
                <Reveal key={title} delay={index * 0.08}>
                  <div className="h-full rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.28)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-950">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]">
          <div className="w-full px-6 py-20 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Who this is for</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  For organisations that belong in a veteran-first ecosystem.
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  We welcome enquiries from organisations that can support veterans meaningfully and respectfully, whether that is through direct services, practical resources, or carefully considered visibility.
                </p>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2">
                {whoThisIsFor.map(({ title, description, icon: Icon }, index) => (
                  <Reveal key={title} delay={index * 0.08}>
                    <div className="h-full rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-38px_rgba(15,23,42,0.26)]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="w-full px-6 py-20 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
            <Reveal className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Partner opportunities</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Examples of how suitable partners can be surfaced.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Final options depend on relevance, availability, and the nature of the organisation. We quote individually after review rather than publishing fixed rate cards.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {opportunityCards.map((item, index) => (
                <Reveal key={item.title} delay={index * 0.08}>
                  <div className="h-full rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
                    <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.12}>
              <div className="mt-8 rounded-[30px] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] p-6">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Important</p>
                    <p className="mt-3 text-base leading-8 text-slate-700">
                      Placements are limited. Relevance matters. Pricing is quoted individually after review and is never positioned as a simple buy-now inventory list.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 text-sm leading-7 text-slate-600">
                    <p className="font-semibold text-slate-950">What we look for</p>
                    <div className="mt-3 space-y-2">
                      <p>Clear value for the VeteranFinder audience</p>
                      <p>Appropriate tone for a veteran-first setting</p>
                      <p>Trustworthy services, support, or offers</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]">
          <div className="w-full px-6 py-20 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Review process</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  Every enquiry is checked by the team before anything goes live.
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  That keeps the platform credible for veterans and ensures partners receive options that actually match the opportunity.
                </p>
              </Reveal>

              <div className="space-y-4">
                {processSteps.map((step, index) => (
                  <Reveal key={step} delay={index * 0.08}>
                    <div className="flex gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.24)]">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-sm leading-7 text-slate-600">{step}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="partner-enquiry" className="bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]">
          <div className="w-full px-6 py-20 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Enquiry</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Start the conversation.
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Share a few details and we will review the fit manually. If it looks aligned, we will come back with suitable options and quoted pricing.
              </p>
            </Reveal>

            <div className="mt-10">
              <PartnerEnquiryForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
