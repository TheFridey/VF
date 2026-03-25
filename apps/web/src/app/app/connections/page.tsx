'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, MessageCircle, UserMinus, Loader2, Shield, ArrowRight, Link2, Sparkles, Copy, Gift, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { Connection } from '@/types';

export default function ConnectionsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.getConnections(),
    enabled: !!user?.id,
  });

  const { data: referralHub } = useQuery({
    queryKey: ['referrals', 'hub'],
    queryFn: () => api.getReferralHub(),
    enabled: !!user?.id,
  });

  const removeMutation = useMutation({
    mutationFn: (connectionId: string) => api.removeConnection(connectionId),
    onSuccess: () => {
      toast.success('Connection removed');
      setShowRemoveModal(false);
      setSelectedConnection(null);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to remove connection');
    },
  });

  const referralShareMutation = useMutation({
    mutationFn: (data: { channel: string; surface?: string; connectionId?: string }) => api.recordReferralShare(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', 'hub'] });
    },
  });

  const connections: Connection[] = Array.isArray(data)
    ? data
    : (data?.data || data?.connections || []);
  const biaConnections = connections.filter((connection) => connection.connectionType === 'BROTHERS_IN_ARMS').length;
  const referralPrompt = referralHub?.invitePrompt || 'Who else should be here?';
  const referralRewardMessage = referralHub?.rewardMessage || 'Three verified referrals unlock a free month of BIA Basic.';

  const handleCopyReferralLink = async () => {
    if (!referralHub?.shareUrl) return;

    try {
      await navigator.clipboard.writeText(referralHub.shareUrl);
      toast.success('Invite link copied');
      referralShareMutation.mutate({ channel: 'copy', surface: 'connections_page' });
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const handleWhatsAppShare = () => {
    if (!referralHub?.shareCopy?.whatsapp) return;

    const url = `https://wa.me/?text=${encodeURIComponent(referralHub.shareCopy.whatsapp)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    referralShareMutation.mutate({ channel: 'whatsapp', surface: 'connections_page' });
  };

  const handleRemove = () => {
    if (selectedConnection) removeMutation.mutate(selectedConnection.id);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8 xl:space-y-10">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="p-6 sm:p-7 xl:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Your Network
                </Badge>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Connections</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Keep your reconnections close, pick conversations back up quickly, and stay anchored to the people you&apos;ve found again.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-full sm:max-w-md">
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Total</p>
                  <p className="mt-2 text-2xl font-semibold">{connections.length}</p>
                </div>
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">BIA</p>
                  <p className="mt-2 text-2xl font-semibold">{biaConnections}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Next step</p>
              <p className="mt-2 text-xl font-semibold">Keep conversations active</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Jump back into messages fast so new reconnections keep building momentum.
              </p>
            </div>
            <Link href="/app/messages" className="mt-5 inline-flex items-center text-sm font-medium text-primary">
              Open Messages
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {connections.length > 0 && referralHub?.canInvite && (
        <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/8 via-background to-background">
          <CardContent className="grid gap-5 p-6 sm:p-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] xl:items-end">
            <div>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                <Gift className="mr-1.5 h-3.5 w-3.5" />
                Referral invite
              </Badge>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{referralPrompt}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Help the people you served with find you. Share your personal invite link and bring more of your old unit into VeteranFinder.
              </p>
              <div className="mt-4 rounded-2xl border bg-background/80 p-4 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Reward progress</p>
                <p className="mt-2 text-sm font-medium">{referralRewardMessage}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {referralHub?.qualifiedCount ?? 0} verified referral{(referralHub?.qualifiedCount ?? 0) === 1 ? '' : 's'} so far
                  {typeof referralHub?.shareStats?.totalShares === 'number' ? ` • ${referralHub.shareStats.totalShares} invite share${referralHub.shareStats.totalShares === 1 ? '' : 's'} sent` : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl border bg-background/80 p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Your invite link</p>
                <p className="mt-2 break-all text-sm text-foreground">{referralHub.shareUrl}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={handleWhatsAppShare}>
                  <Share2 className="mr-1.5 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button variant="outline" onClick={handleCopyReferralLink}>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy link
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                We already write the message for you. Send it to the people who should be here next.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {connections.length === 0 ? (
        <Card className="py-14 text-center">
          <CardContent>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No connections yet</h3>
            <p className="mx-auto mb-4 max-w-xl text-muted-foreground">
              Use Brothers in Arms to find veterans you may have served alongside and start building your network.
            </p>
            <Link href="/app/brothers">
              <Button>Find Veterans</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Your Veteran Network</h2>
              <p className="text-sm text-muted-foreground">Built for quick scanning, fast messaging, and easy follow-up.</p>
            </div>
            <Badge variant="outline" className="px-2.5 py-1">{connections.length} total</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {connections.map((connection, index) => (
              <motion.div
                key={connection.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: index * 0.03 }}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <Card className="group h-full overflow-hidden border-border/70 bg-card/90 shadow-sm transition-all hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5">
                  <CardContent className="flex h-full flex-col p-0">
                    <div className="relative">
                      <div className="aspect-[4/3] bg-gradient-to-br from-primary/12 via-muted to-muted/60">
                        {connection.otherUser.profileImageUrl ? (
                          <Image
                            src={connection.otherUser.profileImageUrl}
                            alt={connection.otherUser.displayName}
                            fill
                            sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Avatar name={connection.otherUser.displayName} size="xl" />
                          </div>
                        )}
                      </div>

                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'backdrop-blur-sm',
                            connection.connectionType === 'BROTHERS_IN_ARMS'
                              ? 'border-primary/20 bg-primary/90 text-white'
                              : 'bg-background/80',
                          )}
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          {connection.connectionType === 'BROTHERS_IN_ARMS' ? 'BIA' : 'Community'}
                        </Badge>
                        {connection.overlapScore ? (
                          <Badge variant="outline" className="border-background/30 bg-background/85 backdrop-blur-sm">
                            {Math.round(connection.overlapScore * 100)}% overlap
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <div>
                        <h3 className="text-lg font-semibold">{connection.otherUser.displayName}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Connected {formatRelativeTime(connection.createdAt)}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border bg-muted/35 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Connection</p>
                          <p className="mt-2 text-sm font-medium">
                            {connection.connectionType === 'BROTHERS_IN_ARMS' ? 'Shared veteran context' : 'Community network'}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-muted/35 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                          <p className="mt-2 text-sm font-medium">Ready to message</p>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Link href={`/app/messages?match=${connection.id}`} className="flex-1">
                          <Button size="sm" className="w-full">
                            <MessageCircle className="mr-1.5 h-4 w-4" />
                            Message
                          </Button>
                        </Link>
                        <Link href={`/app/profile/${connection.otherUser.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full">
                            <Link2 className="mr-1.5 h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedConnection(connection);
                          setShowRemoveModal(true);
                        }}
                        className="mt-2 text-muted-foreground hover:text-destructive"
                      >
                        <UserMinus className="mr-1.5 h-4 w-4" />
                        Remove connection
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <Modal
        isOpen={showRemoveModal}
        onClose={() => { setShowRemoveModal(false); setSelectedConnection(null); }}
        title="Remove Connection"
        description={`Are you sure you want to remove ${selectedConnection?.otherUser.displayName}?`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will remove the connection and delete your conversation history. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => { setShowRemoveModal(false); setSelectedConnection(null); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              isLoading={removeMutation.isPending}
              className="flex-1"
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
