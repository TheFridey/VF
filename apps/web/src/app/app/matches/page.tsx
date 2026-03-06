'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Users, MessageCircle, Trash2, Loader2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { Match } from '@/types';

export default function MatchesPage() {
  const queryClient = useQueryClient();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.getMatches(),
  });

  const unmatchMutation = useMutation({
    mutationFn: (matchId: string) => api.unmatch(matchId),
    onSuccess: () => {
      toast.success('Connection removed');
      setShowUnmatchModal(false);
      setSelectedMatch(null);
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to remove connection');
    },
  });

  const matches: Match[] = Array.isArray(data) ? data : (data?.data || data?.matches || []);

  const handleUnmatch = () => {
    if (selectedMatch) {
      unmatchMutation.mutate(selectedMatch.id);
    }
  };

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
        <h1 className="text-2xl font-bold">My Connections</h1>
        <Badge variant="outline">{matches.length} total</Badge>
      </div>

      {matches.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No connections yet</h3>
            <p className="text-muted-foreground mb-4">
              Find veterans you may have served alongside and start reconnecting.
            </p>
            <Link href="/app/brothers">
              <Button>Find Veterans</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Card key={match.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {match.otherUser.profileImageUrl ? (
                      <img
                        src={match.otherUser.profileImageUrl}
                        alt={match.otherUser.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Avatar name={match.otherUser.displayName} size="xl" />
                    )}
                  </div>

                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={cn('bg-military-olive text-white')}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      BIA
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">
                    {match.otherUser.displayName}
                  </h3>

                  {match.overlapScore && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {Math.round(match.overlapScore * 100)}% service overlap
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mb-3">
                    Connected {formatRelativeTime(match.createdAt)}
                  </p>

                  <div className="flex gap-2">
                    <Link href={`/app/messages?match=${match.id}`} className="flex-1">
                      <Button size="sm" className="w-full">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMatch(match);
                        setShowUnmatchModal(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showUnmatchModal}
        onClose={() => {
          setShowUnmatchModal(false);
          setSelectedMatch(null);
        }}
        title="Remove Connection"
        description={`Are you sure you want to remove ${selectedMatch?.otherUser.displayName}?`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will remove the connection and delete conversation history. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowUnmatchModal(false);
                setSelectedMatch(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnmatch}
              isLoading={unmatchMutation.isPending}
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
