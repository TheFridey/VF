import { Briefcase, Building2, MessageSquare, Search, Shield, Swords } from 'lucide-react';
import { Reveal } from '@/components/home/home-motion';

const features = [
  {
    icon: Search,
    title: 'Reconnection-first profiles',
    description: 'Profiles, service details, and overlap data are structured to help veterans find the right people, not just collect activity.',
  },
  {
    icon: MessageSquare,
    title: 'Private messaging',
    description: 'Once trust is established, messaging keeps conversations direct and simple rather than pushing people through noisy public feeds.',
  },
  {
    icon: Swords,
    title: 'Regiment and corps forums',
    description: 'Private discussion spaces give veterans a place to reconnect around unit history, support, reunions, and practical shared context.',
  },
  {
    icon: Shield,
    title: 'Moderation and reporting',
    description: 'Staff tools are built for verification, reports, and audit visibility so safety decisions are easier to review and maintain.',
  },
  {
    icon: Building2,
    title: 'BIA business and community tools',
    description: 'Membership areas add structured ways to connect through business listings, veteran support, and community participation.',
  },
  {
    icon: Briefcase,
    title: 'Useful follow-on features',
    description: 'Career resources, mentorship, and community areas are there to support long-term value after the first reconnection happens.',
  },
];

export function FeatureGridSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fcff_100%)]">
      <div className="w-full px-6 py-16 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">What the platform includes</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Built around reconnection first, then community.</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delay={index * 0.06}>
              <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <Icon className="h-5 w-5 text-sky-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
