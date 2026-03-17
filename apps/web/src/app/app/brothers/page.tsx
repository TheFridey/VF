'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Shield, MapPin, Calendar, Loader2, UserPlus, Check, X, ArrowRight, Sparkles, Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatBranch, isVerifiedVeteran, cn } from '@/lib/utils';
import type { BrothersCandidate } from '@/types';

function getOverlapMeta(score: number) {
  if (score >= 0.7) {
    return {
      label: 'Strong overlap',
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      ringClass: 'from-emerald-500/20 to-transparent',
    };
  }

  if (score >= 0.4) {
    return {
      label: 'Possible match',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      ringClass: 'from-amber-500/20 to-transparent',
    };
  }

  return {
    label: 'Worth reviewing',
    badgeClass: 'border-border bg-muted text-muted-foreground',
    ringClass: 'from-primary/10 to-transparent',
  };
}

export default function BrothersPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState<BrothersCandidate | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['brothers-search'],
    queryFn: () => api.searchBrothers(),
    enabled: isVerifiedVeteran(user?.role || ''),
  });

  const { data: connectionRequests } = useQuery({
    queryKey: ['connection-requests'],
    queryFn: () => api.getConnectionRequests(),
    enabled: isVerifiedVeteran(user?.role || ''),
  });

  const sendConnectionMutation = useMutation({
    mutationFn: ({ userId, message }: { userId: string; message?: string }) =>
      api.sendConnectionRequest(userId, message),
    onSuccess: () => {
      toast.success('Connection request sent!');
      setShowRequestModal(false);
      setSelectedCandidate(null);
      setConnectionMessage('');
      queryClient.invalidateQueries({ queryKey: ['brothers-search'] });
    },
    onError: () => {
      toast.error('Failed to send request');
    },
  });

  const respondToConnectionMutation = useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      api.respondToConnection(requestId, accept),
    onSuccess: (_, variables) => {
      toast.success(variables.accept ? 'Connection accepted!' : 'Request declined');
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to respond to request');
    },
  });

  const candidates: BrothersCandidate[] = Array.isArray(searchResults) ? searchResults : (searchResults?.data || searchResults?.candidates || []);
  const pendingRequests = connectionRequests?.requests || connectionRequests?.incoming || [];
  const strongMatches = candidates.filter((candidate) => (candidate.overlapScore || 0) >= 0.7).length;

  const handleConnect = (candidate: BrothersCandidate) => {
    setSelectedCandidate(candidate);
    setShowRequestModal(true);
  };

  const handleSendRequest = () => {
    if (selectedCandidate) {
      sendConnectionMutation.mutate({
        userId: selectedCandidate.id,
        message: connectionMessage || undefined,
      });
    }
  };

  if (!isVerifiedVeteran(user?.role || '')) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Shield className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">Verification Required</h2>
        <p className="mb-6 text-muted-foreground">
          Brothers in Arms is exclusively for verified veterans. Get verified to find service
          members you may have served alongside.
        </p>
        <Button onClick={() => { window.location.href = '/app/settings'; }}>
          Get Verified
        </Button>
      </div>
    );
  }

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
                  Brothers in Arms
                </Badge>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find Veterans</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Reconnect through shared service history, overlapping tours, and likely unit or location links.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-full sm:max-w-md">
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Matches</p>
                  <p className="mt-2 text-2xl font-semibold">{candidates.length}</p>
                </div>
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Strong overlap</p>
                  <p className="mt-2 text-2xl font-semibold">{strongMatches}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Pending activity</p>
              <p className="mt-2 text-3xl font-semibold">{pendingRequests.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Requests waiting on your response stay here so reconnecting never gets lost.
              </p>
            </div>
            <div className="mt-5 inline-flex items-center text-sm font-medium text-primary">
              Review incoming requests
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </section>

      {pendingRequests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Pending Requests</h2>
              <p className="text-sm text-muted-foreground">Respond quickly to keep reconnections moving.</p>
            </div>
            <Badge variant="outline" className="px-2.5 py-1">{pendingRequests.length} awaiting response</Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {pendingRequests.map((request: any, index: number) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
              >
                <Card className="h-full border-primary/10 bg-card/80 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={request.from.profileImageUrl}
                        name={request.from.displayName}
                        size="lg"
                        className="ring-2 ring-background shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold">{request.from.displayName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Wants to reconnect through VeteranFinder</p>
                      </div>
                    </div>
                    {request.message && (
                      <div className="rounded-2xl border bg-muted/40 p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Message</p>
                        <p className="mt-2 text-sm text-foreground/90">&quot;{request.message}&quot;</p>
                      </div>
                    )}
                    <div className="mt-auto flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => respondToConnectionMutation.mutate({ requestId: request.id, accept: true })}
                        disabled={respondToConnectionMutation.isPending}
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => respondToConnectionMutation.mutate({ requestId: request.id, accept: false })}
                        disabled={respondToConnectionMutation.isPending}
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {candidates.length === 0 ? (
        <Card className="py-14 text-center">
          <CardContent>
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No veterans found yet</h3>
            <p className="mx-auto max-w-xl text-muted-foreground">
              We couldn&apos;t find veterans with overlapping service periods. Make sure your
              service history is complete to improve reconnection matching.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Potential Reconnections</h2>
              <p className="text-sm text-muted-foreground">Prioritised by shared service overlap and likely context.</p>
            </div>
            <Badge variant="outline" className="px-2.5 py-1">{candidates.length} veterans found</Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {candidates.map((candidate, index) => {
              const overlapMeta = getOverlapMeta(candidate.overlapScore || 0);

              return (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: index * 0.03 }}
                  whileHover={{ y: -4 }}
                  className="h-full"
                >
                  <Card className="group relative h-full overflow-hidden border-border/70 bg-card/90 shadow-sm transition-all hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5">
                    <div className={cn('absolute inset-x-0 top-0 h-24 bg-gradient-to-br', overlapMeta.ringClass)} />
                    <CardContent className="relative flex h-full flex-col p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar
                            src={candidate.profileImageUrl}
                            name={candidate.displayName}
                            size="lg"
                            className="ring-2 ring-background shadow-md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-lg font-semibold">{candidate.displayName}</h3>
                              {candidate.veteranInfo?.isVerified && (
                                <Shield className="h-4 w-4 text-emerald-500" />
                              )}
                            </div>
                            {candidate.veteranInfo && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatBranch(candidate.veteranInfo.branch)}
                                {candidate.veteranInfo.rank && ` • ${candidate.veteranInfo.rank}`}
                              </p>
                            )}
                            {candidate.location && (
                              <p className="mt-1 flex items-center text-sm text-muted-foreground">
                                <MapPin className="mr-1 h-3.5 w-3.5" />
                                {candidate.location}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={overlapMeta.badgeClass}>
                          {Math.round((candidate.overlapScore || 0) * 100)}% overlap
                        </Badge>
                      </div>

                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border bg-muted/35 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Match quality</p>
                          <p className="mt-2 text-sm font-medium">{overlapMeta.label}</p>
                        </div>
                        <div className="rounded-2xl border bg-muted/35 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Signals</p>
                          <p className="mt-2 text-sm font-medium">
                            {(candidate.overlapReasons?.length || candidate.overlappingPeriods?.length || 0)} clues
                          </p>
                        </div>
                      </div>

                      {candidate.overlapReasons && candidate.overlapReasons.length > 0 ? (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why you may know them</p>
                          <div className="flex flex-wrap gap-2">
                            {candidate.overlapReasons.slice(0, 4).map((reason: string, i: number) => (
                              <span key={i} className="rounded-full border bg-primary/5 px-3 py-1 text-xs text-foreground/90">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : candidate.overlappingPeriods && candidate.overlappingPeriods.length > 0 ? (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Overlapping service</p>
                          <div className="space-y-2">
                            {candidate.overlappingPeriods.slice(0, 2).map((period: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 rounded-2xl border bg-muted/35 p-3 text-sm">
                                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span>
                                  {formatBranch(period.branch)} • {period.dateRange}
                                  {period.location && ` • ${period.location}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {candidate.bio && (
                        <p className="mb-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {candidate.bio}
                        </p>
                      )}

                      <div className="mt-auto flex items-center gap-2">
                        <Button className="flex-1" onClick={() => handleConnect(candidate)}>
                          <UserPlus className="mr-1.5 h-4 w-4" />
                          Send request
                        </Button>
                        <div className="flex h-10 items-center rounded-xl border px-3 text-sm font-medium text-muted-foreground">
                          <Link2 className="mr-1.5 h-4 w-4" />
                          Reconnect
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      <Modal
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedCandidate(null);
          setConnectionMessage('');
        }}
        title="Send Connection Request"
        description={`Connect with ${selectedCandidate?.displayName}`}
        size="md"
      >
        <div className="space-y-4">
          {selectedCandidate && (
            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <Avatar
                src={selectedCandidate.profileImageUrl}
                name={selectedCandidate.displayName}
                size="md"
              />
              <div>
                <p className="font-medium">{selectedCandidate.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(selectedCandidate.overlapScore * 100)}% service overlap
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Add a message (optional)
            </label>
            <textarea
              value={connectionMessage}
              onChange={(e) => setConnectionMessage(e.target.value)}
              placeholder="Hey, I think we might have served together at..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {connectionMessage.length}/500 characters
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRequestModal(false);
                setSelectedCandidate(null);
                setConnectionMessage('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendRequest}
              isLoading={sendConnectionMutation.isPending}
              className="flex-1"
            >
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
