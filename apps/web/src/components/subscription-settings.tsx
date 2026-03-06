'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Crown,
  Check,
  Shield,
  MessageCircle,
  Video,
  Loader2,
  ExternalLink,
  AlertCircle,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  tier: string;
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  BIA_BASIC: 'BIA',
  BIA_PLUS: 'BIA+',
  PREMIUM_MONTHLY: 'Legacy Premium Monthly',
  PREMIUM_ANNUAL: 'Legacy Premium Annual',
  BUNDLE_PREMIUM_BIA: 'Legacy Bundle',
  BUNDLE_ULTIMATE: 'Legacy Ultimate Bundle',
};

export function SubscriptionSettings() {
  const { data: subscription, isLoading } = useQuery<Subscription>({
    queryKey: ['subscription'],
    queryFn: () => api.getSubscription(),
  });

  const portalMutation = useMutation({
    mutationFn: () => api.createPortalSession(),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to open billing portal');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelSubscription(),
    onSuccess: () => {
      toast.success('Subscription will be cancelled at the end of your billing period');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPremium = subscription?.tier !== 'FREE';
  const isActive = subscription?.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isPremium && <Crown className="h-5 w-5 text-yellow-500" />}
              Your Subscription
            </CardTitle>
            <Badge variant={isPremium ? 'default' : 'outline'}>
              {subscription ? (PLAN_LABELS[subscription.tier] || 'Legacy Paid Plan') : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremium && subscription && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className={cn(isActive ? 'text-green-600' : 'text-orange-600')}>
                {subscription.status}
                {subscription.cancelAtPeriodEnd && ' (Cancelling)'}
              </span>
            </div>
          )}

          {isPremium && subscription?.currentPeriodEnd && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {subscription.cancelAtPeriodEnd ? 'Access until' : 'Next billing date'}
              </span>
              <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          )}

          {isPremium && (
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Manage Billing
              </Button>
              {!subscription?.cancelAtPeriodEnd && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your subscription?')) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Cancel
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isPremium && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Upgrade to BIA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Check, label: 'Veteran Reconnection', desc: 'Find and reconnect with old colleagues' },
                { icon: MessageCircle, label: 'Private Forums', desc: 'Trusted veteran-only discussions' },
                { icon: Video, label: 'Video Calls', desc: 'Talk face-to-face with your network' },
                { icon: Building2, label: 'Directory Access', desc: 'Business and mentorship directory tools' },
              ].map((feature) => (
                <div key={feature.label} className="text-center p-4 rounded-lg bg-muted/50">
                  <feature.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h5 className="font-medium text-sm">{feature.label}</h5>
                  <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={() => (window.location.href = '/app/premium')}>
              View BIA Plans
            </Button>

            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-muted-foreground">
                <p>All paid plans include a 7-day free trial.</p>
                <p className="mt-1">Payments are processed securely through Stripe.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SubscriptionSettings;
