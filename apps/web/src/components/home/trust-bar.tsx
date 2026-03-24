import { Eye, FileCheck2, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Reveal } from '@/components/home/home-motion';

const items = [
  {
    icon: UserRoundCheck,
    title: 'Veteran-only access',
    description: 'Access is designed around veteran verification rather than open sign-up alone.',
  },
  {
    icon: FileCheck2,
    title: 'Every account verified',
    description: 'Verification requests are reviewed by staff and tracked through a dedicated moderation workflow.',
  },
  {
    icon: ShieldCheck,
    title: 'Moderated by people',
    description: 'Admin and moderation tools are built to support reports, review decisions, and accountability.',
  },
  {
    icon: Eye,
    title: 'No feed. No noise.',
    description: 'The product avoids noisy social mechanics and keeps the experience focused on trust and use.',
  },
];

export function TrustBar() {
  return (
    <section className="border-b border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fcff_100%)]">
      <div className="w-full px-6 py-12 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why trust it</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Help the people you served with find you in the right place.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            VeteranFinder only works if the people joining it trust what they are seeing. These are the signals that make that possible.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={index * 0.08}>
              <div className="rounded-2xl border border-sky-100 bg-white/90 p-5 transition-transform duration-300 hover:-translate-y-1">
              <Icon className="h-5 w-5 text-sky-600" />
              <h3 className="mt-4 text-base font-medium text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
