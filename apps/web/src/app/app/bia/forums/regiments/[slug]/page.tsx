'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Lock,
  MessageSquare,
  Shield,
  Swords,
  UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ForumPanel, ForumShell, ForumStage } from '@/components/bia/forum-shell';
import { REGIMENT_BRANCH_LABELS, type RegimentBranch } from '@/lib/regiments';
import { cn, formatRelativeTime } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  MessageSquare,
  Shield,
  Clock,
  Swords,
};

const BRANCH_COLOURS: Record<string, string> = {
  BRITISH_ARMY: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  ROYAL_MARINES: 'border-rose-300/25 bg-rose-400/10 text-rose-100',
  ROYAL_NAVY: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
  ROYAL_AIR_FORCE: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100',
  RESERVE_FORCES: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
};

export default function RegimentForumPage() {
  const router = useRouter();
  const { slug } = useParams() as { slug: string };

  const { data, isLoading, error } = useQuery({
    queryKey: ['regiment-forums', slug],
    queryFn: () => api.getRegimentForumCategories(slug),
    retry: false,
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
            <button
              type="button"
              onClick={() => router.push('/app/bia/forums/regiments')}
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>All regiments</span>
            </button>

            <div className="mt-6 flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <Lock className="h-6 w-6 text-slate-300" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Private access</p>
                  <h1 className="mt-2 text-2xl font-semibold text-white">This regiment forum is members only</h1>
                </div>
                <p className="max-w-2xl text-sm leading-7 text-slate-300">
                  Access is restricted to veterans whose profile is linked to this regiment. Update your regiment in settings to unlock the right unit space.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/app/settings')}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-300"
                  >
                    <UserPlus className="h-4 w-4" />
                    Update my regiment
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/app/bia/forums/regiments')}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    View all regiments
                  </button>
                </div>
              </div>
            </div>
          </ForumPanel>
        </ForumShell>
      </ForumStage>
    );
  }

  const regiment = data?.regiment;
  const categories = data?.categories ?? [];
  const totalThreads = categories.reduce((sum: number, category: any) => sum + (category.threadCount ?? 0), 0);
  const latestActivity = categories
    .map((category: any) => category.latestThread?.lastPostAt)
    .filter(Boolean)
    .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0];
  const branchClass = BRANCH_COLOURS[regiment?.branch ?? ''] ?? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100';

  return (
    <ForumStage>
      <ForumShell>
        <ForumPanel className="overflow-hidden border-emerald-300/15">
          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => router.push('/app/bia/forums/regiments')}
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>All regiments</span>
              </button>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border', branchClass)}>
                    {REGIMENT_BRANCH_LABELS[regiment?.branch as RegimentBranch]}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    5 tailored rooms
                  </Badge>
                </div>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {regiment?.name}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-300">
                  A private unit space for heritage, reunions, support, and operational conversation. Each room is seeded
                  with tailored starter threads so the section feels alive from the first visit.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: 'Rooms', value: categories.length, helper: 'General, history, reunions, support, ops' },
                { label: 'Threads', value: totalThreads, helper: 'Seeded across the regiment space' },
                { label: 'Latest', value: latestActivity ? formatRelativeTime(latestActivity) : 'Now', helper: 'Most recent activity' },
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

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((category: any) => {
            const Icon = ICON_MAP[category.icon] ?? MessageSquare;

            return (
              <ForumPanel key={category.id} className="group cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/35">
                <button
                  type="button"
                  onClick={() => router.push(`/app/bia/forums/${category.slug}`)}
                  className="block w-full text-left"
                >
                  <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-white">{category.name}</h2>
                          <p className="mt-1 text-sm text-slate-400">{category.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition-colors group-hover:text-white" />
                    </div>
                  </div>

                  <div className="space-y-4 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Threads</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{category.threadCount ?? 0}</p>
                      </div>
                    </div>

                    {category.latestThread ? (
                      <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Latest thread</span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-100">{category.latestThread.title}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatRelativeTime(category.latestThread.lastPostAt)} by {category.latestThread.author?.profile?.displayName || 'Unknown'}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                        No activity yet. Open the room and start the first thread.
                      </div>
                    )}
                  </div>
                </button>
              </ForumPanel>
            );
          })}
        </div>
      </ForumShell>
    </ForumStage>
  );
}
