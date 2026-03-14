'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users, MessageCircle, Shield, Award, ChevronRight, ArrowRight,
  BookOpen, Briefcase, Building2, TrendingUp, Link2,
  CheckCircle2, Star,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeTime, cn } from '@/lib/utils';

function StatCard({ label, value, icon: Icon, trend }: { label: string; value: string | number; icon: any; trend?: string }) {
  return (
    <div className="flex items-center space-x-4 p-4 rounded-xl border bg-card hover:bg-accent/30 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      {trend && (
        <div className="ml-auto flex items-center space-x-1 text-xs text-emerald-600 font-medium shrink-0">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

function QuickLink({ href, label, description, icon: Icon, badge }: {
  href: string; label: string; description: string; icon: any; badge?: string;
}) {
  return (
    <Link href={href} className="group flex items-center space-x-4 p-4 rounded-xl border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-semibold">{label}</p>
          {badge && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{badge}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const displayName = user?.profile?.displayName || 'Veteran';
  const isVerified  = user?.role === 'VETERAN_VERIFIED' || user?.role === 'VETERAN_MEMBER';
  const isUnverified = user?.role === 'VETERAN_UNVERIFIED';

  const { data: membership } = useQuery({
    queryKey: ['membership'],
    queryFn: () => api.getSubscription(),
    enabled: !!user,
  });

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.getConnections(),
    enabled: !!user,
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    enabled: !!user,
  });

  const { data: unreadCounts } = useQuery({
    queryKey: ['unreadCounts'],
    queryFn: () => api.getUnreadCounts(),
    enabled: !!user,
  });

  const isMember        = membership?.tier !== 'FREE';
  const isBiaPlus       = membership?.tier === 'BIA_PLUS';
  const connectionCount = (connections as any)?.connections?.length ?? 0;
  const unreadMessages  = unreadCounts?.total || 0;
  const recentConvos    = (conversations as any)?.conversations?.slice(0, 3) || [];

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">

      {/* Hero greeting */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {greeting}, {displayName.split(' ')[0]} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back to your veteran community.
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 shrink-0">
            {isMember ? (
              <Badge className="bg-primary/10 text-primary border border-primary/30 px-3 py-1">
                <Award className="h-3.5 w-3.5 mr-1.5" />
                {isBiaPlus ? 'BIA+ Member' : 'BIA Member'}
              </Badge>
            ) : isVerified ? (
              <Badge variant="outline" className="px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                Verified Veteran
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Verification / Upgrade banners */}
      {isUnverified && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Verify your veteran status</p>
              <p className="text-xs text-amber-700 dark:text-amber-500">Get verified to unlock Brothers in Arms and connect with other veterans.</p>
            </div>
          </div>
          <Link href="/app/settings/verification">
            <Button size="sm" variant="outline" className="shrink-0 border-amber-500/40 text-amber-700 hover:bg-amber-500/10">
              Get Verified
            </Button>
          </Link>
        </div>
      )}

      {isVerified && !isMember && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center space-x-3">
            <Award className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unlock Brothers in Arms</p>
              <p className="text-xs text-muted-foreground">Access private forums, the business directory, mentorship and more.</p>
            </div>
          </div>
          <Link href="/app/premium">
            <Button size="sm" className="shrink-0">
              Learn More
            </Button>
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <StatCard label="Connections" value={connectionCount} icon={Link2} />
        <StatCard label="Unread messages" value={unreadMessages} icon={MessageCircle} />
        <StatCard label="Community" value="UK Veterans" icon={Shield} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column - main actions */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent conversations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Recent Messages</h2>
              <Link href="/app/messages" className="text-xs text-muted-foreground hover:text-primary flex items-center space-x-1 transition-colors">
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentConvos.length > 0 ? (
              <div className="space-y-2">
                {recentConvos.map((convo: any) => (
                  <Link key={convo.connectionId} href={`/app/messages/${convo.connectionId}`}
                    className="flex items-center space-x-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors group">
                    <div className="relative">
                      <Avatar src={convo.user?.photoUrl} name={convo.user?.displayName} size="md" />
                      {convo.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn('text-sm font-medium truncate', convo.unreadCount > 0 && 'font-semibold')}>{convo.user?.displayName}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                          {convo.lastMessageAt ? formatRelativeTime(convo.lastMessageAt) : ''}
                        </span>
                      </div>
                      <p className={cn('text-xs truncate', convo.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                        {convo.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed bg-muted/20 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                {isVerified && (
                  <Link href="/app/brothers" className="mt-2 text-xs text-primary hover:underline">
                    Find veterans to connect with
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {isVerified && (
                <QuickLink
                  href="/app/brothers"
                  label="Find Veterans"
                  description="Search for veterans to connect with"
                  icon={Users}
                />
              )}
              <QuickLink
                href="/app/connections"
                label="My Connections"
                description={`${connectionCount} veteran${connectionCount !== 1 ? 's' : ''} in your network`}
                icon={Link2}
              />
              <QuickLink
                href="/app/messages"
                label="Messages"
                description={unreadMessages > 0 ? `${unreadMessages} unread message${unreadMessages !== 1 ? 's' : ''}` : 'No new messages'}
                icon={MessageCircle}
              />
              <QuickLink
                href="/app/profile"
                label="My Profile"
                description="Update your service history and bio"
                icon={Shield}
              />
            </div>
          </div>
        </div>

        {/* Right column - sidebar */}
        <div className="space-y-6">

          {/* BIA Community links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Community</h2>
              {isMember && (
                <Badge className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border border-primary/30">
                  {isBiaPlus ? 'BIA+' : 'BIA'}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {[
                { href: '/app/bia/forums',     label: 'Forums',             icon: BookOpen,   memberOnly: true  },
                { href: '/app/bia/directory',  label: 'Business Directory', icon: Building2,  memberOnly: true  },
                { href: '/app/bia/mentorship', label: 'Mentorship',         icon: Users,      memberOnly: true  },
                { href: '/app/bia/careers',    label: 'Career Resources',   icon: Briefcase,  memberOnly: false },
              ].map(({ href, label, icon: Icon, memberOnly }) => {
                const locked = memberOnly && !isMember;
                return (
                  <Link key={href} href={locked ? '/app/premium' : href}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors group',
                      locked ? 'opacity-70 hover:bg-muted/50' : 'hover:border-primary/40 hover:bg-primary/5',
                    )}>
                    <div className="flex items-center space-x-2.5">
                      <Icon className={cn('h-4 w-4 transition-colors', locked ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-primary')} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    {locked ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">BIA</Badge>
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </Link>
                );
              })}
            </div>

            {!isMember && isVerified && (
              <Link href="/app/premium"
                className="mt-3 flex items-center justify-center space-x-2 w-full px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/15 transition-colors">
                <Award className="h-4 w-4" />
                <span>Get BIA Membership</span>
              </Link>
            )}
          </div>

          {/* Platform stats */}
          <div className="p-4 rounded-xl border bg-muted/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platform</h3>
            <div className="space-y-2">
              {[
                { label: 'Verified veterans', value: '2,400+', icon: CheckCircle2 },
                { label: 'Active connections', value: '8,100+', icon: Link2 },
                { label: 'Service branches', value: '6', icon: Star },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </div>
                  <span className="text-xs font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
