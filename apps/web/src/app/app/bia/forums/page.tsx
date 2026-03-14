'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Clock,
  Crown,
  Hand,
  Heart,
  Lock,
  MessageSquare,
  Rocket,
  Shield,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ForumBreadcrumbs, ForumPanel, ForumShell, ForumStage } from '@/components/bia/forum-shell';
import { formatRelativeTime, cn } from '@/lib/utils';

const ICONS: Record<string, any> = {
  Rocket,
  Heart,
  Hand,
  Shield,
  Briefcase,
  Lock,
  MessageSquare,
};

function CategoryCard({
  category,
  accent,
  onClick,
}: {
  category: any;
  accent: 'green' | 'amber';
  onClick: () => void;
}) {
  const Icon = ICONS[category.icon] || MessageSquare;
  const isAmber = accent === 'amber';

  return (
    <ForumPanel
      className={cn(
        'group cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1',
        isAmber ? 'hover:border-amber-400/60' : 'hover:border-emerald-400/60',
      )}
    >
      <button type="button" onClick={onClick} className="block w-full text-left">
        <div className={cn(
          'border-b px-5 py-4',
          isAmber ? 'border-amber-400/15 bg-amber-500/10' : 'border-emerald-400/15 bg-emerald-500/10',
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                isAmber ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white transition-colors group-hover:text-white/90">
                  {category.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-300/80">{category.description}</p>
              </div>
            </div>
            <ArrowRight className={cn(
              'mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1',
              isAmber ? 'text-amber-300/70' : 'text-emerald-300/70',
            )} />
          </div>
        </div>

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Latest Thread</span>
            </div>
            {category.latestThread ? (
              <>
                <p className="line-clamp-2 text-[15px] font-medium leading-7 text-slate-100">{category.latestThread.title}</p>
                <p className="text-xs leading-6 text-slate-400">
                  {formatRelativeTime(category.latestThread.lastPostAt)} by {category.latestThread.author?.profile?.displayName || 'Unknown'}
                </p>
              </>
            ) : (
              <p className="text-sm leading-7 text-slate-400">No threads yet. Start the tone for this forum.</p>
            )}
          </div>

          <div className="flex items-center gap-4 sm:justify-end">
            <div>
              <p className="text-2xl font-semibold text-white">{category.threadCount}</p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Threads</p>
            </div>
          </div>
        </div>
      </button>
    </ForumPanel>
  );
}

export default function ForumsPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['bia-forums'],
    queryFn: () => api.getBiaForumCategories(),
  });

  if (isLoading) {
    return (
      <ForumStage>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-emerald-400" />
        </div>
      </ForumStage>
    );
  }

  if (error) {
    return (
      <ForumStage>
        <ForumShell className="max-w-4xl">
          <ForumPanel className="p-6 sm:p-8">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
                <AlertCircle className="h-6 w-6 text-amber-300" />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-amber-300/80">Members Only</p>
                  <h1 className="mt-2 text-2xl font-semibold text-white">BIA membership required</h1>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  The Veterans Forums are part of the paid BIA community. Upgrade to unlock private discussions,
                  regiment spaces, and premium BIA+ rooms.
                </p>
                <Button onClick={() => router.push('/app/premium')} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                  View Membership Plans
                </Button>
              </div>
            </div>
          </ForumPanel>
        </ForumShell>
      </ForumStage>
    );
  }

  const categories = data?.categories || [];
  const biaCategories = categories.filter((c: any) => c.tier === 'BIA');
  const bunkerCategories = categories.filter((c: any) => c.tier === 'BIA_PLUS');
  const totalThreads = categories.reduce((sum: number, category: any) => sum + (category.threadCount || 0), 0);
  const latestActivity = categories
    .map((category: any) => category.latestThread?.lastPostAt)
    .filter(Boolean)
    .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0];
  const isBiaPlus = bunkerCategories.length > 0;

  return (
    <ForumStage>
      <ForumShell>
        <ForumBreadcrumbs
          items={[
            { label: 'BIA', href: '/app/bia' },
            { label: 'Forums' },
          ]}
          className="px-1"
        />

        <ForumPanel className="overflow-hidden">
          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                <Shield className="h-3.5 w-3.5" />
                Brothers in Arms Forums
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  A premium veteran forum network built to feel private, useful, and worth returning to.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-slate-300">
                  Explore curated BIA community rooms, premium BIA+ discussions inside The Bunker, and regiment-only
                  spaces for veterans who want sharper conversations, better context, and a stronger sense of belonging.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => router.push('/app/bia/forums/regiments')} className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                  Explore Regiment Forums
                </Button>
                {!isBiaPlus && (
                  <Button variant="outline" onClick={() => router.push('/app/premium')} className="border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20">
                    Upgrade to BIA+
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: 'BIA Rooms', value: biaCategories.length, helper: 'Core member forums', icon: MessageSquare },
                { label: 'BIA+ Rooms', value: bunkerCategories.length, helper: 'Premium spaces', icon: Crown },
                { label: 'Live Threads', value: totalThreads, helper: latestActivity ? `Latest ${formatRelativeTime(latestActivity)}` : 'Freshly seeded', icon: Trophy },
              ].map(({ label, value, helper, icon: Icon }) => (
                <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{helper}</p>
                </div>
              ))}
            </div>
          </div>
        </ForumPanel>

        <ForumPanel className="overflow-hidden border-emerald-400/15">
          <button
            type="button"
            onClick={() => router.push('/app/bia/forums/regiments')}
            className="group grid w-full gap-5 p-6 text-left sm:p-8 xl:grid-cols-[1.2fr_0.8fr]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
                <Swords className="h-7 w-7" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="border border-emerald-300/30 bg-emerald-400/10 text-emerald-100">Regiment Network</Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">Private Access</Badge>
                </div>
                <h2 className="text-2xl font-semibold text-white">Regiment and corps forums, designed around belonging.</h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-300">
                  Every regiment and corps gets its own tailored discussion spaces, covering general chat, heritage,
                  reunions, support, and operations. Veteran access stays private to the right unit, while admins can
                  shape the tone across the whole network.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="space-y-3">
                {[
                  'Tailored starter threads for each regiment forum',
                  'Member counts and latest activity visible at a glance',
                  'Full-width, premium browsing across the whole section',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="h-2 w-2 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-200">
                <span>Browse Regiment Forums</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        </ForumPanel>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-300/70">
                <Users className="h-3.5 w-3.5" />
                <span>BIA Community</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Member rooms for practical, grounded conversation.</h2>
            </div>
            <Badge className="border border-emerald-300/25 bg-emerald-400/10 text-emerald-100">BIA</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {biaCategories.map((category: any) => (
              <CategoryCard
                key={category.id}
                category={category}
                accent="green"
                onClick={() => router.push(`/app/bia/forums/${category.slug}`)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-amber-300/70">
                <Crown className="h-3.5 w-3.5" />
                <span>The Bunker</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Premium rooms with more focus, trust, and depth.</h2>
            </div>
            <Badge className="border border-amber-300/25 bg-amber-400/10 text-amber-100">BIA+</Badge>
          </div>

          {isBiaPlus ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {bunkerCategories.map((category: any) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  accent="amber"
                  onClick={() => router.push(`/app/bia/forums/${category.slug}`)}
                />
              ))}
            </div>
          ) : (
            <ForumPanel className="border-amber-300/20 p-6 sm:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10">
                    <Lock className="h-5 w-5 text-amber-200" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Upgrade to unlock The Bunker</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                      Gain access to premium rooms for career strategy, trusted introductions, business growth,
                      and more deliberate peer-to-peer conversations.
                    </p>
                  </div>
                </div>
                <Button onClick={() => router.push('/app/premium')} className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                  Upgrade to BIA+
                </Button>
              </div>
            </ForumPanel>
          )}
        </section>
      </ForumShell>
    </ForumStage>
  );
}
