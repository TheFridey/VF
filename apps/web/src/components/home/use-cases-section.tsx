import { MessageSquareQuote, Search, Shield } from 'lucide-react';
import { Reveal } from '@/components/home/home-motion';

const scenarios = [
  {
    icon: Search,
    title: 'Looking for old oppos',
    description: 'You served together years ago and lost touch. The platform helps rebuild that line of contact with more context than a cold social search.',
  },
  {
    icon: MessageSquareQuote,
    title: 'Finding the right unit space',
    description: 'Regiment and corps forums make it easier to reconnect around shared history, support, and events without forcing everything into one feed.',
  },
  {
    icon: Shield,
    title: 'Staying in trusted company',
    description: 'Some people join to reconnect, others to stay close to a veteran-only community once they are back in civilian life.',
  },
];

export function UseCasesSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#ffffff_0%,#f5fbff_100%)]">
      <div className="w-full px-6 py-16 sm:px-8 lg:px-10 xl:px-14 2xl:px-20">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Why veterans join</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Representative use cases, not inflated promises.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            These are common reasons the platform is useful. They are examples of product intent rather than performance claims.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {scenarios.map((scenario, index) => (
            <Reveal key={scenario.title} delay={index * 0.08}>
              <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <scenario.icon className="h-5 w-5 text-sky-600" />
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{scenario.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{scenario.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
