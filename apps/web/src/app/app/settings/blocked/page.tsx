'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Ban, Loader2, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

export default function BlockedUsersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => api.getBlockedUsers(),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api.unblockUser(userId),
    onSuccess: () => {
      toast.success('User unblocked');
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
    onError: () => {
      toast.error('Failed to unblock user');
    },
  });

  const blockedUsers = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Blocked Users</h1>
      </div>

      {blockedUsers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No blocked users</h3>
            <p className="text-muted-foreground">
              Users you block will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {blockedUsers.map((blocked: any) => (
            <Card key={blocked.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar
                  src={blocked.user.profileImageUrl}
                  name={blocked.user.displayName}
                  size="md"
                />
                <div className="flex-1">
                  <p className="font-medium">{blocked.user.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    Blocked {formatRelativeTime(blocked.createdAt)}
                  </p>
                  {blocked.reason && (
                    <p className="text-sm text-muted-foreground">
                      Reason: {blocked.reason}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblockMutation.mutate(blocked.user.id)}
                  disabled={unblockMutation.isPending}
                >
                  Unblock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
