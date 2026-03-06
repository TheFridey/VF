'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, MapPin, Calendar, Loader2, UserPlus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatBranch, isVerifiedVeteran, cn } from '@/lib/utils';
import type { BrothersCandidate } from '@/types';

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

  // Show message if not a verified veteran
  if (!isVerifiedVeteran(user?.role || '')) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <Shield className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Verification Required</h2>
        <p className="text-muted-foreground mb-6">
          Brothers in Arms is exclusively for verified veterans. Get verified to find service
          members you may have served alongside.
        </p>
        <Button onClick={() => (window.location.href = '/app/settings')}>
          Get Verified
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Brothers in Arms
          </h1>
          <p className="text-muted-foreground">
            Find veterans you may have served alongside
          </p>
        </div>
      </div>

      {/* Pending Connection Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Requests ({pendingRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request: any) => (
              <div
                key={request.id}
                className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
              >
                <Avatar
                  src={request.from.profileImageUrl}
                  name={request.from.displayName}
                  size="md"
                />
                <div className="flex-1">
                  <p className="font-medium">{request.from.displayName}</p>
                  {request.message && (
                    <p className="text-sm text-muted-foreground">&quot;{request.message}&quot;</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      respondToConnectionMutation.mutate({ requestId: request.id, accept: true })
                    }
                    disabled={respondToConnectionMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      respondToConnectionMutation.mutate({ requestId: request.id, accept: false })
                    }
                    disabled={respondToConnectionMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {candidates.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No matches found</h3>
            <p className="text-muted-foreground">
              We couldn&apos;t find veterans with overlapping service periods. Make sure your
              service details are up to date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Left side - Avatar and basic info */}
                  <div className="p-4 sm:p-6 flex items-start gap-4 sm:border-r">
                    <Avatar
                      src={candidate.profileImageUrl}
                      name={candidate.displayName}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{candidate.displayName}</h3>
                        {candidate.veteranInfo?.isVerified && (
                          <Shield className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      {candidate.veteranInfo && (
                        <p className="text-sm text-muted-foreground">
                          {formatBranch(candidate.veteranInfo.branch)}
                          {candidate.veteranInfo.rank && ` • ${candidate.veteranInfo.rank}`}
                        </p>
                      )}
                      {candidate.location && (
                        <p className="text-sm text-muted-foreground flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {candidate.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side - Overlap info */}
                  <div className="flex-1 p-4 sm:p-6 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            (candidate.overlapScore || 0) >= 0.7
                              ? 'success'
                              : (candidate.overlapScore || 0) >= 0.4
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {Math.round((candidate.overlapScore || 0) * 100)}% Match
                        </Badge>
                      </div>
                      <Button size="sm" onClick={() => handleConnect(candidate)}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Connect
                      </Button>
                    </div>

                    {candidate.overlappingPeriods && candidate.overlappingPeriods.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Overlapping Service:</p>
                        {candidate.overlappingPeriods.map((period, i) => (
                          <div
                            key={i}
                            className="text-sm bg-background rounded p-2 flex items-center gap-2"
                          >
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {formatBranch(period.branch)} • {period.dateRange}
                              {period.location && ` • ${period.location}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {candidate.bio && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {candidate.bio}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connection Request Modal */}
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
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
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
            <label className="block text-sm font-medium mb-1.5">
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
            <p className="text-xs text-muted-foreground mt-1">
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
