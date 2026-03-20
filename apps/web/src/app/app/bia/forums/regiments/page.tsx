'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Search,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/auth-store';
import { ForumPanel, ForumShell, ForumStage } from '@/components/bia/forum-shell';
import { useBiaPageAccess } from '@/hooks/use-bia-page-access';
import { REGIMENT_BRANCH_LABELS, getRegimentsByBranch, type RegimentBranch } from '@/lib/regiments';
import { cn } from '@/lib/utils';

const BRANCH_ORDER: RegimentBranch[] = [
  'BRITISH_ARMY',
  'ROYAL_MARINES',
  'ROYAL_NAVY',
  'ROYAL_AIR_FORCE',
  'RESERVE_FORCES',
];

const BRANCH_COLOURS: Record<RegimentBranch, { badge: string; dot: string; border: string }> = {
  BRITISH_ARMY: { badge: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100', dot: 'bg-emerald-300', border: 'hover:border-emerald-300/45' },
  ROYAL_MARINES: { badge: 'border-rose-300/25 bg-rose-400/10 text-rose-100', dot: 'bg-rose-300', border: 'hover:border-rose-300/45' },
  ROYAL_NAVY: { badge: 'border-sky-300/25 bg-sky-400/10 text-sky-100', dot: 'bg-sky-300', border: 'hover:border-sky-300/45' },
  ROYAL_AIR_FORCE: { badge: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100', dot: 'bg-cyan-300', border: 'hover:border-cyan-300/45' },
  RESERVE_FORCES: { badge: 'border-amber-300/25 bg-amber-400/10 text-amber-100', dot: 'bg-amber-300', border: 'hover:border-amber-300/45' },
};

export default function RegimentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const access = useBiaPageAccess('forums');
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['regiments'],
    queryFn: () => api.getRegiments(),
    staleTime: 30_000,
    enabled: access.canAccess,
  });

  const myRegiment = (user as any)?.veteranDetails?.regiment as string | undefined;
  const countMap: Record<string, number> = {};
  if (data?.regiments) {
    for (const regiment of data.regiments) countMap[regiment.slug] = regiment.userCount ?? 0;
  }

  const grouped = getRegimentsByBranch();
  const ranked = [...(data?.regiments ?? [])].sort((a, b) => (b.userCount ?? 0) - (a.userCount ?? 0));
  const top3 = ranked.slice(0, 3);
  const lowerQuery = query.toLowerCase();

  const matchesQuery = (name: string, category: string, slug: string) => (
    !lowerQuery ||
    name.toLowerCase().includes(lowerQuery) ||
    category.toLowerCase().includes(lowerQuery) ||
    slug.toLowerCase().includes(lowerQuery)
  );

  if (access.shouldBlockRender || isLoading) {
    return (
      <ForumStage>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-emerald-400" />
        </div>
      </ForumStage>
    );
  }

  return (
    <ForumStage>
      <ForumShell>
        <ForumPanel className="overflow-hidden border-emerald-300/15">
          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => router.push('/app/bia/forums')}
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to forums</span>
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
                <Swords className="h-3.5 w-3.5" />
                Regiment Network
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Full-width access to every regiment and corps forum.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-300">
                  Browse the whole regiment network, see where the strongest member clusters are, and jump into your own
                  unit&apos;s private spaces for heritage, reunions, support, and operational discussion.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: 'Regiments', value: data?.regiments?.length || 0, helper: 'Across the network' },
                { label: 'Top unit', value: top3[0]?.userCount ?? 0, helper: top3[0]?.name || 'Loading' },
                { label: 'Your unit', value: myRegiment ? 1 : 0, helper: myRegiment ? 'Linked to your profile' : 'Set in profile settings' },
              ].map(({ label, value, helper }) => (
                <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
                  <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{helper}</p>
                </div>
              ))}
            </div>
          </div>
        </ForumPanel>

        {top3.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            {top3.map((regiment, index) => (
              <ForumPanel key={regiment.slug} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => router.push(`/app/bia/forums/regiments/${regiment.slug}`)}
                  className="block w-full p-5 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                      <Trophy className="h-3 w-3" />
                      Rank {index + 1}
                    </div>
                    <span className="text-2xl">{index === 0 ? '1' : index === 1 ? '2' : '3'}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-white">{regiment.name}</h2>
                  <p className="mt-2 text-sm text-slate-400">{regiment.userCount} members currently linked to this regiment.</p>
                </button>
              </ForumPanel>
            ))}
          </div>
        )}

        <ForumPanel className="p-5 sm:p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search regiment, corps, division, or slug..."
              className="w-full rounded-[20px] border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>
        </ForumPanel>

        <div className="space-y-6">
          {BRANCH_ORDER.map((branch) => {
            const regiments = (grouped[branch] ?? []).filter((regiment) => matchesQuery(regiment.name, regiment.category, regiment.slug));
            if (regiments.length === 0) return null;

            const colours = BRANCH_COLOURS[branch];

            return (
              <section key={branch} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Badge className={cn('border', colours.badge)}>
                    {REGIMENT_BRANCH_LABELS[branch]}
                  </Badge>
                  <p className="text-sm text-slate-400">{regiments.length} results</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {regiments.map((regiment) => {
                    const memberCount = countMap[regiment.slug] ?? 0;
                    const isMine = myRegiment === regiment.slug;

                    return (
                      <ForumPanel
                        key={regiment.slug}
                        className={cn(
                          'group cursor-pointer p-0 transition-all duration-300 hover:-translate-y-1',
                          colours.border,
                          isMine && 'border-emerald-300/30',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => router.push(`/app/bia/forums/regiments/${regiment.slug}`)}
                          className="block w-full p-5 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={cn('mt-1 h-2.5 w-2.5 rounded-full', colours.dot)} />
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold text-white">{regiment.name}</h3>
                                  {isMine && (
                                    <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100">
                                      Your regiment
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-sm text-slate-400">{regiment.category}</p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-white" />
                          </div>

                          <div className="mt-5 flex items-center justify-between rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Users className="h-4 w-4 text-slate-500" />
                              <span>Linked members</span>
                            </div>
                            <span className="text-lg font-semibold text-white">{memberCount}</span>
                          </div>
                        </button>
                      </ForumPanel>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </ForumShell>
    </ForumStage>
  );
}
