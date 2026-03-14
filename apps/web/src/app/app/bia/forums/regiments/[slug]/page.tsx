'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import {
  MessageSquare, Rocket, Heart, Shield, Users,
  ChevronRight, Clock, ArrowLeft, Lock, UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { REGIMENT_BRANCH_LABELS, type RegimentBranch } from '@/lib/regiments';
import { formatRelativeTime, cn } from '@/lib/utils';

const ICON_MAP: Record<string, any> = {
  MessageSquare, Rocket, Heart, Shield, Users,
};

const BRANCH_COLOURS: Record<string, string> = {
  BRITISH_ARMY:    'text-green-400 border-green-500/40',
  ROYAL_MARINES:   'text-red-400 border-red-500/40',
  ROYAL_NAVY:      'text-blue-400 border-blue-500/40',
  ROYAL_AIR_FORCE: 'text-sky-400 border-sky-500/40',
  RESERVE_FORCES:  'text-amber-400 border-amber-500/40',
};

export default function RegimentForumPage() {
  const router = useRouter();
  const { slug } = useParams() as { slug: string };

  const { data, isLoading, error } = useQuery({
    queryKey: ['regiment-forums', slug],
    queryFn: () => api.getRegimentForumCategories(slug),
    retry: false, // don't retry 403s
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8 text-green-500" />
    </div>
  );

  // Access denied — user is not in this regiment
  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => router.push('/app/bia/forums/regiments')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Regiments
        </button>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Regiment Members Only</h2>
          <p className="text-slate-400 text-sm mb-6">
            This forum is private — only veterans of this regiment can access it.
            To join, update your regiment in your profile settings.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push('/app/settings')}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Update My Regiment
            </button>
            <button
              onClick={() => router.push('/app/bia/forums/regiments')}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              View All Regiments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const regiment = data?.regiment;
  const categories = data?.categories ?? [];
  const branchColour = BRANCH_COLOURS[regiment?.branch ?? ''] ?? 'text-green-400 border-green-500/40';

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/app/bia/forums/regiments')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Regiments
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{regiment?.name}</h1>
              {regiment?.branch && (
                <Badge variant="outline" className={cn('text-xs', branchColour)}>
                  {REGIMENT_BRANCH_LABELS[regiment.branch as RegimentBranch]}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Private forums for {regiment?.name} veterans · {categories.length} discussion areas
            </p>
          </div>
        </div>
      </div>

      {/* Forum categories */}
      <div className="space-y-1.5">
        {categories.map((cat: any) => {
          const Icon = ICON_MAP[cat.icon] ?? MessageSquare;
          return (
            <div
              key={cat.id}
              className="bg-slate-800 border border-slate-700 hover:border-green-500/60 hover:bg-slate-750 rounded-xl transition-all cursor-pointer group"
              onClick={() => router.push(`/app/bia/forums/${cat.slug}`)}
            >
              <div className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <Icon className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-100 group-hover:text-green-300 transition-colors text-sm">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-slate-400 truncate mt-0.5">{cat.description}</p>
                  {cat.latestThread ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">Latest: {cat.latestThread.title}</span>
                      <span>· {formatRelativeTime(cat.latestThread.lastPostAt)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1.5">No threads yet — be the first to post.</p>
                  )}
                </div>
                <div className="text-right shrink-0 hidden sm:block mr-1">
                  <p className="text-sm font-semibold text-slate-200">{cat.threadCount ?? 0}</p>
                  <p className="text-xs text-slate-500">threads</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
