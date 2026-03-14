'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, Users, Trophy, ChevronRight, Swords, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { REGIMENT_BRANCH_LABELS, getRegimentsByBranch, type RegimentBranch } from '@/lib/regiments';
import { cn } from '@/lib/utils';

const BRANCH_ORDER: RegimentBranch[] = [
  'BRITISH_ARMY',
  'ROYAL_MARINES',
  'ROYAL_NAVY',
  'ROYAL_AIR_FORCE',
  'RESERVE_FORCES',
];

const BRANCH_COLOURS: Record<RegimentBranch, { badge: string; border: string; bg: string; dot: string }> = {
  BRITISH_ARMY:    { badge: 'text-green-400 border-green-500/40',  border: 'border-green-700/30',  bg: 'bg-green-500/5',  dot: 'bg-green-400' },
  ROYAL_MARINES:   { badge: 'text-red-400 border-red-500/40',      border: 'border-red-700/30',    bg: 'bg-red-500/5',    dot: 'bg-red-400' },
  ROYAL_NAVY:      { badge: 'text-blue-400 border-blue-500/40',    border: 'border-blue-700/30',   bg: 'bg-blue-500/5',   dot: 'bg-blue-400' },
  ROYAL_AIR_FORCE: { badge: 'text-sky-400 border-sky-500/40',      border: 'border-sky-700/30',    bg: 'bg-sky-500/5',    dot: 'bg-sky-400' },
  RESERVE_FORCES:  { badge: 'text-amber-400 border-amber-500/40',  border: 'border-amber-700/30',  bg: 'bg-amber-500/5',  dot: 'bg-amber-400' },
};

export default function RegimentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['regiments'],
    queryFn: () => api.getRegiments(),
    staleTime: 30_000,
  });

  // Map of slug → userCount from the API response
  const countMap: Record<string, number> = {};
  if (data?.regiments) {
    for (const r of data.regiments) countMap[r.slug] = r.userCount ?? 0;
  }

  // The current user's own regiment (if set)
  const myRegiment = (user as any)?.veteranDetails?.regiment as string | undefined;

  // Build grouped view using the static list (preserves logical order)
  const grouped = getRegimentsByBranch();

  // Global top-3 for the leaderboard
  const sorted = [...(data?.regiments ?? [])].sort((a, b) => (b.userCount ?? 0) - (a.userCount ?? 0));
  const top3 = sorted.slice(0, 3);

  const lowerQ = query.toLowerCase();
  function matchesQuery(name: string, category: string, slug: string) {
    if (!lowerQ) return true;
    return name.toLowerCase().includes(lowerQ) || category.toLowerCase().includes(lowerQ) || slug.includes(lowerQ);
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/app/bia/forums')} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-green-400" />
            Regiment & Corps Forums
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Private forums for every UK regiment. Only members can post — see who has the most veterans.
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      {!isLoading && top3.length > 0 && (
        <div className="bg-slate-800 border border-amber-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">Top Regiments by Members</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {top3.map((r, i) => (
              <div
                key={r.slug}
                className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push(`/app/bia/forums/regiments/${r.slug}`)}
              >
                <div className="text-2xl mb-0.5">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <p className="text-xs font-semibold text-slate-100 leading-tight line-clamp-2">{r.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.userCount} {r.userCount === 1 ? 'member' : 'members'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search regiment, corps or service..."
          className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500/50 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Spinner className="w-8 h-8 text-green-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {BRANCH_ORDER.map((branch) => {
            const regiments = (grouped[branch] ?? []).filter((r) =>
              matchesQuery(r.name, r.category, r.slug),
            );
            if (regiments.length === 0) return null;

            const colours = BRANCH_COLOURS[branch];

            return (
              <section key={branch} className="space-y-1.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border', colours.badge)}>
                    {REGIMENT_BRANCH_LABELS[branch]}
                  </span>
                </div>

                <div className="space-y-1">
                  {regiments.map((r) => {
                    const count = countMap[r.slug] ?? 0;
                    const isMyRegiment = myRegiment === r.slug;

                    return (
                      <div
                        key={r.slug}
                        onClick={() => router.push(`/app/bia/forums/regiments/${r.slug}`)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group',
                          isMyRegiment
                            ? 'bg-green-950/30 border-green-700/50 hover:border-green-500 hover:bg-green-950/50'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750',
                        )}
                      >
                        {/* Colour dot */}
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', colours.dot)} />

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate transition-colors',
                            isMyRegiment ? 'text-green-300' : 'text-slate-100 group-hover:text-green-300',
                          )}>
                            {r.name}
                            {isMyRegiment && (
                              <span className="ml-2 text-xs text-green-400 font-normal">(yours)</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{r.category}</p>
                        </div>

                        {/* Member count */}
                        <div className="flex items-center gap-1 text-sm shrink-0">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className={cn('font-semibold text-sm', count > 0 ? 'text-slate-200' : 'text-slate-600')}>
                            {count}
                          </span>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 transition-colors shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
