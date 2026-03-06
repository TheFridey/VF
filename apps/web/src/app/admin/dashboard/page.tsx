'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Shield,
  Heart,
  Flag,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  Clock,
  AlertTriangle,
  Database,
  Server,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { adminApi } from '@/lib/admin-api';
import { formatRelativeTime, cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  iconColor?: string;
}

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-2 text-sm">
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {change >= 0 ? '+' : ''}{change}%
                </span>
                {changeLabel && (
                  <span className="text-muted-foreground ml-1">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-lg bg-muted', iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboardStats(),
    refetchInterval: 60000,
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => adminApi.getSystemHealth(),
    refetchInterval: 30000,
  });

  const { data: moderationStats } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: () => adminApi.getModerationStats(),
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const dashboardData = stats || {
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    verifiedVeterans: 0,
    pendingVerifications: 0,
    totalMatches: 0,
    matchesToday: 0,
    openReports: 0,
    userGrowth: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={dashboardData.totalUsers?.toLocaleString() || 0}
          change={dashboardData.userGrowth}
          changeLabel="vs last week"
          icon={Users}
        />
        <StatCard
          title="Verified Veterans"
          value={dashboardData.verifiedVeterans?.toLocaleString() || 0}
          icon={Shield}
          iconColor="text-green-500"
        />
        <StatCard
          title="Total Matches"
          value={dashboardData.totalMatches?.toLocaleString() || 0}
          icon={Heart}
          iconColor="text-pink-500"
        />
        <StatCard
          title="Open Reports"
          value={dashboardData.openReports || 0}
          icon={Flag}
          iconColor={dashboardData.openReports > 10 ? 'text-red-500' : 'text-yellow-500'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Verification Requests</span>
                </div>
                <Badge variant={dashboardData.pendingVerifications > 0 ? 'warning' : 'outline'}>
                  {dashboardData.pendingVerifications || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Flag className="h-5 w-5 text-red-500" />
                  <span>Open Reports</span>
                </div>
                <Badge variant={dashboardData.openReports > 0 ? 'destructive' : 'outline'}>
                  {dashboardData.openReports || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span>Suspended Users</span>
                </div>
                <Badge variant="outline">
                  {dashboardData.suspendedUsers || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5" />
                    <span>API Server</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">Healthy</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5" />
                    <span>Database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {health?.database?.latency ? `${health.database.latency}ms` : 'OK'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5" />
                    <span>Redis Cache</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {health?.redis?.latency ? `${health.redis.latency}ms` : 'OK'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Stats */}
      {moderationStats && (
        <Card>
          <CardHeader>
            <CardTitle>Reports by Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(moderationStats.byReason || {}).map(([reason, count]) => (
                <div key={reason} className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{count as number}</p>
                  <p className="text-sm text-muted-foreground">
                    {reason.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">New Users Today</p>
            <p className="text-2xl font-bold">{dashboardData.newUsersToday || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">New Users This Week</p>
            <p className="text-2xl font-bold">{dashboardData.newUsersWeek || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Matches Today</p>
            <p className="text-2xl font-bold">{dashboardData.matchesToday || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
