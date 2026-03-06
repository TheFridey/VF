'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, RefreshCw, Shield, Bell, Globe, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { adminApi } from '@/lib/admin-api';
import { useAuthStore } from '@/stores/auth-store';

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => adminApi.getSystemHealth(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">System configuration and settings</p>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>Current system status and metrics</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">API Server</span>
                  <Badge variant="success">Online</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Uptime: {health?.uptime || 'N/A'}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Database</span>
                  <Badge variant={health?.database?.connected ? 'success' : 'destructive'}>
                    {health?.database?.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Latency: {health?.database?.latency || 'N/A'}ms
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Redis Cache</span>
                  <Badge variant={health?.redis?.connected ? 'success' : 'destructive'}>
                    {health?.redis?.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Latency: {health?.redis?.latency || 'N/A'}ms
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Settings - Admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Platform Settings
            </CardTitle>
            <CardDescription>Configure platform-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Connection Request Limit (Free Users)</label>
                <Input type="number" defaultValue={10} disabled />
                <p className="text-xs text-muted-foreground">
                  Maximum connection requests per day for non-premium users
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Connection Request Limit (Premium)</label>
                <Input type="number" defaultValue={100} disabled />
                <p className="text-xs text-muted-foreground">
                  Maximum connection requests per day for premium users
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Edit Window (minutes)</label>
                <Input type="number" defaultValue={5} disabled />
                <p className="text-xs text-muted-foreground">
                  Time allowed to edit messages after sending
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Verification Evidence Retention (days)</label>
                <Input type="number" defaultValue={30} disabled />
                <p className="text-xs text-muted-foreground">
                  Days to keep verification documents after review
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Settings management is currently in development. Contact the development team to modify these values.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Security Settings - Admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Configure security and authentication settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Login Attempts</label>
                <Input type="number" defaultValue={5} disabled />
                <p className="text-xs text-muted-foreground">
                  Account locks after this many failed attempts
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Lockout Duration (minutes)</label>
                <Input type="number" defaultValue={15} disabled />
                <p className="text-xs text-muted-foreground">
                  Duration of account lockout after max attempts
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">JWT Access Token Expiry (minutes)</label>
                <Input type="number" defaultValue={15} disabled />
                <p className="text-xs text-muted-foreground">
                  Access token validity period
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">JWT Refresh Token Expiry (days)</label>
                <Input type="number" defaultValue={7} disabled />
                <p className="text-xs text-muted-foreground">
                  Refresh token validity period
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure system notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for important events
                </p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Admin Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Get notified of critical system events
                </p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Report Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when new reports are submitted
                </p>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-mono">{process.env.NODE_ENV || 'development'}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">API URL</span>
              <span className="font-mono">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted rounded">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">1.0.0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
