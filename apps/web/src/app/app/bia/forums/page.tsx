'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Rocket, Heart, Hand, Shield, Briefcase, Lock,
  ChevronRight, Clock, Users, Crown, AlertCircle,
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
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-300">BIA Membership Required</p>
          <p className="text-sm text-yellow-300/70 mt-1">
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
        <p className="text-gray-400 mt-1">Private community forums — exclusively for BIA members.</p>
      </div>

      {/* BIA Forums */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-green-400" />
          <h2 className="font-semibold text-white">BIA Community</h2>
          <Badge variant="outline" className="text-green-400 border-green-500/40 text-xs">BIA</Badge>
        </div>

        {biaCategories.map((cat: any) => {
          const Icon = ICONS[cat.icon] || MessageSquare;
          return (
            <Card
              key={cat.id}
              className="bg-gray-800/60 border-gray-700/50 hover:border-green-500/40 hover:bg-gray-800 transition-all cursor-pointer group"
              onClick={() => router.push(`/app/bia/forums/${cat.slug}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <Icon className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white group-hover:text-green-300 transition-colors">
                      {cat.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{cat.description}</p>
                  {cat.latestThread && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">Latest: {cat.latestThread.title}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(cat.latestThread.lastPostAt)}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-medium text-white">{cat.threadCount}</p>
                  <p className="text-xs text-gray-500">threads</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* The Bunker (BIA+) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-white">The Bunker</h2>
          <Badge variant="outline" className="text-amber-400 border-amber-500/40 text-xs">BIA+</Badge>
        </div>

        {isBiaPlus ? (
          bunkerCategories.map((cat: any) => {
            const Icon = ICONS[cat.icon] || MessageSquare;
            return (
              <Card
                key={cat.id}
                className="bg-gray-800/60 border-amber-700/30 hover:border-amber-500/50 hover:bg-gray-800 transition-all cursor-pointer group"
                onClick={() => router.push(`/app/bia/forums/${cat.slug}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white group-hover:text-amber-300 transition-colors">{cat.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{cat.description}</p>
                    {cat.latestThread && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span className="truncate">Latest: {cat.latestThread.title}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(cat.latestThread.lastPostAt)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-medium text-white">{cat.threadCount}</p>
                    <p className="text-xs text-gray-500">threads</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-amber-400 transition-colors" />
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-gray-800/40 border-amber-700/20">
            <CardContent className="p-6 flex gap-4">
              <Lock className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">Upgrade to BIA+ to unlock The Bunker</p>
                <p className="text-sm text-gray-400 mt-1">
                  Access premium forums, The Bunker, Ops Room, and Classified — exclusively for BIA+ members.
                </p>
                <button
                  onClick={() => router.push('/app/premium')}
                  className="mt-3 text-sm bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Upgrade to BIA+
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
