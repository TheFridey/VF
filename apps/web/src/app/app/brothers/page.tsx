'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Check,
  Link2,
  Loader2,
  MapPin,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { cn, formatBranch, isVerifiedVeteran } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { BrothersCandidate } from '@/types';

type MatchTone = 'high' | 'medium' | 'low';

type MatchEvidence = {
  label: string;
  tone: MatchTone;
};

type OverlapMeta = {
  label: string;
  badgeCopy: string;
  helperCopy: string;
  showNumericScore: boolean;
  modalSummary: string;
  badgeClass: string;
  ringClass: string;
};

function getOverlapMeta(score: number): OverlapMeta {
  if (score >= 0.7) {
    return {
      label: 'High confidence',
      badgeCopy: 'Shared service evidence',
      helperCopy: 'Multiple service details line up here.',
      showNumericScore: true,
      modalSummary: 'shared-service evidence',
      badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      ringClass: 'from-emerald-500/20 to-transparent',
    };
  }

  if (score >= 0.4) {
    return {
      label: 'Useful lead',
      badgeCopy: 'Context worth checking',
      helperCopy: 'Some service details overlap, but confirm the specifics.',
      showNumericScore: false,
      modalSummary: 'Possible shared-service connection',
      badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      ringClass: 'from-amber-500/20 to-transparent',
    };
  }

  return {
    label: 'Broad suggestion',
    badgeCopy: 'Limited evidence',
    helperCopy: 'Treat this as a prompt to compare unit, tour, or deployment detail.',
    showNumericScore: false,
    modalSummary: 'Limited evidence',
    badgeClass: 'border-border bg-muted text-muted-foreground',
    ringClass: 'from-primary/10 to-transparent',
  };
}

function getBadgeText(score: number, overlapMeta: OverlapMeta): string {
  if (overlapMeta.showNumericScore) {
    return `${Math.round(score * 100)}% ${overlapMeta.badgeCopy}`;
  }

  return overlapMeta.label;
}

function getModalSummary(score: number, overlapMeta: OverlapMeta): string {
  if (overlapMeta.showNumericScore) {
    return `${Math.round(score * 100)}% ${overlapMeta.modalSummary}`;
  }

  return overlapMeta.modalSummary;
}

function formatRegimentLabel(regiment?: string | null): string | null {
  if (!regiment) {
    return null;
  }

  return regiment
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toEvidence(reason: string): MatchEvidence {
  if (reason.startsWith('Same regiment:')) {
    return {
      label: reason.replace('Same regiment:', 'Shared regiment:').trim(),
      tone: 'high',
    };
  }

  if (reason.startsWith('Same unit:')) {
    return {
      label: reason.replace('Same unit:', 'Shared battalion or unit:').trim(),
      tone: 'high',
    };
  }

  if (reason.startsWith('Overlapping service ')) {
    return {
      label: reason.replace('Overlapping service ', 'Shared service period: ').trim(),
      tone: 'medium',
    };
  }

  if (reason.startsWith('Both deployed to ')) {
    return {
      label: reason.replace('Both deployed to ', 'Shared deployment: ').trim(),
      tone: 'high',
    };
  }

  if (reason.startsWith('Same station:')) {
    return {
      label: reason.replace('Same station:', 'Shared station:').trim(),
      tone: 'medium',
    };
  }

  if (reason.startsWith('Both served in the ')) {
    return {
      label: reason.replace('Both served in the ', 'Shared branch: ').trim(),
      tone: 'medium',
    };
  }

  return {
    label: reason,
    tone: 'low',
  };
}

function evidenceClassName(tone: MatchTone): string {
  if (tone === 'high') {
    return 'border-emerald-500/20 bg-emerald-500/8 text-foreground';
  }

  if (tone === 'medium') {
    return 'border-amber-500/20 bg-amber-500/8 text-foreground';
  }

  return 'border-border bg-muted/35 text-foreground';
}

function getEvidenceList(candidate: BrothersCandidate): MatchEvidence[] {
  const items = (candidate.overlapReasons || []).map(toEvidence);
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.label.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getCandidateSummary(candidate: BrothersCandidate): string {
  const evidence = getEvidenceList(candidate);

  if (evidence.length > 0) {
    return evidence[0].label;
  }

  if ((candidate.overlappingPeriods?.length || 0) > 0) {
    return 'A service period overlaps, but the shared unit detail is limited.';
  }

  return 'Visible in your wider veteran network, but without a strong shared-service signal yet.';
}

function getLowConfidenceCount(candidates: BrothersCandidate[]): number {
  return candidates.filter((candidate) => (candidate.overlapScore || 0) < 0.4).length;
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
      toast.success('Connection request sent.');
      setShowRequestModal(false);
      setSelectedCandidate(null);
      setConnectionMessage('');
      queryClient.invalidateQueries({ queryKey: ['brothers-search'] });
    },
    onError: () => {
      toast.error('Failed to send request.');
    },
  });

  const respondToConnectionMutation = useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      api.respondToConnection(requestId, accept),
    onSuccess: (_, variables) => {
      toast.success(variables.accept ? 'Connection accepted.' : 'Request declined.');
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to respond to request.');
    },
  });

  const candidates: BrothersCandidate[] = Array.isArray(searchResults)
    ? searchResults
    : (searchResults?.data || searchResults?.candidates || []);
  const pendingRequests = connectionRequests?.requests || connectionRequests?.incoming || [];
  const highConfidenceMatches = candidates.filter((candidate) => (candidate.overlapScore || 0) >= 0.7).length;
  const reviewCount = getLowConfidenceCount(candidates);
  const selectedCandidateMeta = selectedCandidate
    ? getOverlapMeta(selectedCandidate.overlapScore || 0)
    : null;

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
                    Ranked by shared service evidence such as regiment, overlapping years, unit, station,
                    and deployment, not by certainty alone.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:w-full sm:max-w-md">
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Profiles surfaced</p>
                  <p className="mt-2 text-2xl font-semibold">{candidates.length}</p>
                </div>
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">High confidence</p>
                  <p className="mt-2 text-2xl font-semibold">{highConfidenceMatches}</p>
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
            {pendingRequests.map((request: { id: string; message?: string; from: { id: string; displayName?: string; profileImageUrl?: string } }, index: number) => (
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
                        <p className="mt-1 text-sm text-muted-foreground">Wants to reconnect through VeteranFinder.</p>
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
            <h3 className="mb-2 text-lg font-medium">No reconnection leads yet</h3>
            <p className="mx-auto max-w-xl text-muted-foreground">
              We could not find shared service evidence yet. Add or tighten your regiment, service dates,
              unit, station, and deployment details to improve the search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Potential Reconnections</h2>
              <p className="text-sm text-muted-foreground">
                Review the strongest shared-service evidence first, then work down into broader suggestions.
              </p>
            </div>
            <Badge variant="outline" className="px-2.5 py-1">{candidates.length} veterans surfaced</Badge>
          </div>

          {reviewCount > 0 && (
            <Card className="border-amber-500/25 bg-amber-500/5">
              <CardContent className="p-4 sm:p-5">
                <p className="text-sm font-semibold text-foreground">Some results are broad suggestions.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reviewCount} profile{reviewCount === 1 ? '' : 's'} below have lighter matching evidence. Use deployment,
                  battalion, regiment, or station detail before sending a request.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {candidates.map((candidate, index) => {
              const overlapMeta = getOverlapMeta(candidate.overlapScore || 0);
              const evidence = getEvidenceList(candidate);
              const regimentLabel = formatRegimentLabel(candidate.veteranInfo?.regiment);
              const evidenceCount = evidence.length + (candidate.overlappingPeriods?.length || 0);

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
                    <CardContent className="relative flex h-full flex-col p-4 sm:p-5">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                                {candidate.veteranInfo.rank ? ` | ${candidate.veteranInfo.rank}` : ''}
                              </p>
                            )}
                            {regimentLabel && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Regiment on file: {regimentLabel}
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
                        <Badge variant="outline" className={cn('self-start', overlapMeta.badgeClass)}>
                          {getBadgeText(candidate.overlapScore || 0, overlapMeta)}
                        </Badge>
                      </div>

                      <div className="mb-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border bg-muted/35 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Reading</p>
                          <p className="mt-2 text-sm font-medium">{overlapMeta.label}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{overlapMeta.helperCopy}</p>
                        </div>
                        <div className="rounded-2xl border bg-muted/35 p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Evidence count</p>
                          <p className="mt-2 text-sm font-medium">
                            {evidenceCount} shared signal{evidenceCount === 1 ? '' : 's'}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{getCandidateSummary(candidate)}</p>
                        </div>
                      </div>

                      {evidence.length > 0 ? (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Why you may know them
                          </p>
                          <div className="space-y-2">
                            {evidence.slice(0, 4).map((item) => (
                              <div
                                key={item.label}
                                className={cn(
                                  'rounded-2xl border px-3 py-2.5 text-sm leading-6',
                                  evidenceClassName(item.tone),
                                )}
                              >
                                {item.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {candidate.overlappingPeriods && candidate.overlappingPeriods.length > 0 ? (
                        <div className="mb-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Service periods on record
                          </p>
                          <div className="space-y-2">
                            {candidate.overlappingPeriods.slice(0, 2).map((period, periodIndex) => (
                              <div
                                key={`${period.dateRange}-${period.location || 'unknown'}-${periodIndex}`}
                                className="flex items-start gap-2 rounded-2xl border bg-muted/35 p-3 text-sm"
                              >
                                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span>
                                  {formatBranch(period.branch)} | {period.dateRange}
                                  {period.location ? ` | ${period.location}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {!evidence.length && (!candidate.overlappingPeriods || candidate.overlappingPeriods.length === 0) ? (
                        <div className="mb-4 rounded-2xl border border-dashed bg-muted/25 p-3 text-sm text-muted-foreground">
                          This profile is visible to you as part of the broader veteran network, but the shared-service evidence is still light.
                        </div>
                      ) : null}

                      {candidate.bio && (
                        <p className="mb-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {candidate.bio}
                        </p>
                      )}

                      <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button className="w-full sm:flex-1" onClick={() => handleConnect(candidate)}>
                          <UserPlus className="mr-1.5 h-4 w-4" />
                          Send request
                        </Button>
                        <div className="flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-medium text-muted-foreground sm:justify-start">
                          <Link2 className="mr-1.5 h-4 w-4" />
                          Reconnect carefully
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
                  {selectedCandidateMeta
                    ? getModalSummary(selectedCandidate.overlapScore || 0, selectedCandidateMeta)
                    : null}
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
              onChange={(event) => setConnectionMessage(event.target.value)}
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
