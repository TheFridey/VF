'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Rocket, Heart, Hand, Shield, Briefcase, Lock,
  ChevronRight, Clock, Users, Crown, AlertCircle, Swords,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatRelativeTime } from '@/lib/utils';

const ICONS: Record<string, any> = {
  Rocket, Heart, Hand, Shield, Briefcase, Lock, MessageSquare,
};

export default function ForumsPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['bia-forums'],
    queryFn: () => api.getBiaForumCategories(),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8 text-green-500" />
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-amber-950/60 border border-amber-600/40 rounded-xl p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-200">BIA Membership Required</p>
          <p className="text-sm text-amber-300/80 mt-1">
            The Private Veterans Forums are exclusively available to BIA members.
          </p>
          <button
            onClick={() => router.push('/app/premium')}
            className="mt-3 text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            View Membership Plans
          </button>
        </div>
      </div>
    </div>
  );

  const biaCategories = data?.categories?.filter((c: any) => c.tier === 'BIA') || [];
  const bunkerCategories = data?.categories?.filter((c: any) => c.tier === 'BIA_PLUS') || [];
  const isBiaPlus = bunkerCategories.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Veterans Forums</h1>
        <p className="text-slate-400 mt-1">Private community forums — exclusively for BIA members.</p>
      </div>

      {/* Regiment Forums Banner */}
      <div
        className="bg-slate-800 border border-green-700/50 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-green-500 hover:bg-slate-700 transition-all group"
        onClick={() => router.push('/app/bia/forums/regiments')}
      >
        <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0 group-hover:bg-green-500/25 transition-colors">
          <Swords className="w-6 h-6 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white group-hover:text-green-300 transition-colors">Regiment & Corps Forums</p>
          <p className="text-sm text-slate-400 mt-0.5">Private forums for your regiment — only members can post. See which regiment has the most veterans.</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-green-400 transition-colors shrink-0" />
      </div>

      {/* BIA Forums */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-green-400" />
          <h2 className="font-semibold text-slate-200 text-sm uppercase tracking-wide">BIA Community</h2>
          <Badge variant="outline" className="text-green-400 border-green-500/40 text-xs">BIA</Badge>
        </div>

        {biaCategories.map((cat: any) => {
          const Icon = ICONS[cat.icon] || MessageSquare;
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
                  {cat.latestThread && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">Latest: {cat.latestThread.title}</span>
                      <span className="shrink-0">· {formatRelativeTime(cat.latestThread.lastPostAt)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 hidden sm:block mr-1">
                  <p className="text-sm font-semibold text-slate-200">{cat.threadCount}</p>
                  <p className="text-xs text-slate-500">threads</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </section>

      {/* The Bunker (BIA+) */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-amber-400" />
          <h2 className="font-semibold text-slate-200 text-sm uppercase tracking-wide">The Bunker</h2>
          <Badge variant="outline" className="text-amber-400 border-amber-500/40 text-xs">BIA+</Badge>
        </div>

        {isBiaPlus ? (
          bunkerCategories.map((cat: any) => {
            const Icon = ICONS[cat.icon] || MessageSquare;
            return (
              <div
                key={cat.id}
                className="bg-slate-800 border border-amber-800/40 hover:border-amber-500/60 hover:bg-slate-750 rounded-xl transition-all cursor-pointer group"
                onClick={() => router.push(`/app/bia/forums/${cat.slug}`)}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-100 group-hover:text-amber-300 transition-colors text-sm">{cat.name}</h3>
                    <p className="text-sm text-slate-400 truncate mt-0.5">{cat.description}</p>
                    {cat.latestThread && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">Latest: {cat.latestThread.title}</span>
                        <span className="shrink-0">· {formatRelativeTime(cat.latestThread.lastPostAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 hidden sm:block mr-1">
                    <p className="text-sm font-semibold text-slate-200">{cat.threadCount}</p>
                    <p className="text-xs text-slate-500">threads</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-800 border border-amber-800/30 rounded-xl p-5 flex gap-4">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-100">Upgrade to BIA+ to unlock The Bunker</p>
              <p className="text-sm text-slate-400 mt-1">
                Access premium forums, The Bunker, Ops Room, and Classified — exclusively for BIA+ members.
              </p>
              <button
                onClick={() => router.push('/app/premium')}
                className="mt-3 text-sm bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Upgrade to BIA+
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
