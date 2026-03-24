import type { ReactNode } from 'react';
import { Clock3, MessageSquareText, ShieldCheck, UserRoundSearch } from 'lucide-react';
import { Reveal } from '@/components/home/home-motion';

function PreviewCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.28)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-3 text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">{children}</div>
    </div>
  );
}

export function ProofLayerSection() {
  return (
    <section className="border-y border-sky-100 bg-[linear-gradient(180deg,#f6fbff_0%,#ffffff_100%)]">
      <div className="w-full px-6 py-16 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <Reveal className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">How it works in practice</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            You can see who you&apos;re talking to before you say a word.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Profiles show verified service history. Messages are private by
            default. Every account goes through a review before it can connect
            with anyone.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Reveal>
            <PreviewCard eyebrow="Profile preview" title="Service history sits alongside the person.">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <UserRoundSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-950">Nathan H.</p>
                    <p className="text-sm text-slate-500">Royal Signals · 2006-2015 · BIA member</p>
                  </div>
                </div>
                <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  <div className="flex justify-between gap-4">
                    <span>Regiment overlap</span>
                    <span className="font-medium text-slate-950">3 shared postings</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Verification</span>
                    <span className="font-medium text-sky-700">Reviewed and active</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>What helps search</span>
                    <span className="font-medium text-slate-950">Branch, years, unit context</span>
                  </div>
                </div>
              </div>
            </PreviewCard>
          </Reveal>

          <Reveal delay={0.08}>
            <PreviewCard eyebrow="Forum preview" title="Threads are easy to scan, with context before noise.">
              <div className="space-y-3">
                {[
                  ['Pinned', 'Royal Signals reunions 2026', 'Latest reply 2h ago · 18 replies'],
                  ['Latest', 'Anyone served through Blandford in 2010?', 'Latest reply 5h ago · 9 replies'],
                  ['Room notes', 'Career transition recommendations', 'Latest reply yesterday · 12 replies'],
                ].map(([badge, title, meta]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                        {badge}
                      </span>
                      <span className="text-xs text-slate-400">{meta}</span>
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-950">{title}</p>
                  </div>
                ))}
              </div>
            </PreviewCard>
          </Reveal>

          <Reveal delay={0.16}>
            <PreviewCard eyebrow="Messaging preview" title="Messages stay private, direct, and clearly read.">
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  Verification and moderation state travel with the conversation.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
                    <span className="font-medium text-slate-950">Marcus P.</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Read 5m ago
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm leading-6 text-slate-700">
                      I think we crossed paths in Catterick. The service years match.
                    </div>
                    <div className="ml-auto max-w-[85%] rounded-2xl bg-sky-600 px-3 py-2 text-sm leading-6 text-white">
                      That sounds right. I remember the signals detachment there.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Member messaging with read-state clarity
                </div>
              </div>
            </PreviewCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
