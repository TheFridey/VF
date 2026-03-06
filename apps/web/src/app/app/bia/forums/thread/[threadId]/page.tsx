'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Shield, Send, Lock, Pin } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { formatRelativeTime, formatBranch, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ThreadViewPage() {
  const router = useRouter();
  const params = useParams();
  const threadId = params.threadId as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['forum-thread', threadId],
    queryFn: () => api.getForumThread(threadId),
  });

  const postMutation = useMutation({
    mutationFn: () => api.createForumPost(threadId, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread', threadId] });
      setReply('');
      toast.success('Reply posted');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
    onError: () => toast.error('Failed to post reply'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8 text-green-500" />
    </div>
  );

  const thread = data?.thread;
  const posts = data?.posts || [];
  const category = thread?.category;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push(`/app/bia/forums/${category?.slug}`)}
          className="text-gray-400 hover:text-white transition-colors mt-1 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {thread?.isPinned && <Pin className="w-4 h-4 text-green-400" />}
            {thread?.isLocked && <Lock className="w-4 h-4 text-gray-500" />}
            <h1 className="text-xl font-bold text-white">{thread?.title}</h1>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {category?.name} · {data?.total} {data?.total === 1 ? 'post' : 'posts'}
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post: any, idx: number) => {
          const isOp = post.authorId === thread?.authorId;
          const isMe = post.authorId === user?.id;
          return (
            <Card
              key={post.id}
              className={cn(
                'border-gray-700/50',
                isOp ? 'bg-gray-800/80 border-green-600/20' : 'bg-gray-800/50',
                isMe && 'border-blue-600/20',
              )}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex gap-3 sm:gap-4">
                  {/* Avatar */}
                  <div className="shrink-0">
                    <Avatar
                      src={post.author?.profile?.profileImageUrl}
                      fallback={post.author?.profile?.displayName?.[0] || '?'}
                      className="w-10 h-10"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-white text-sm">
                        {post.author?.profile?.displayName || 'Unknown'}
                      </span>
                      {isOp && (
                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">OP</Badge>
                      )}
                      {isMe && (
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">You</Badge>
                      )}
                      {post.author?.veteranDetails?.branch && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Shield className="w-3 h-3" />
                          <span>{formatBranch(post.author.veteranDetails.branch)}</span>
                          {post.author.veteranDetails.rank && <span>· {post.author.veteranDetails.rank}</span>}
                        </div>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {formatRelativeTime(post.createdAt)}
                        {post.isEdited && <span className="ml-1 italic">(edited)</span>}
                      </span>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {thread?.isLocked ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
          <Lock className="w-4 h-4" />
          <span>This thread is locked. No further replies are allowed.</span>
        </div>
      ) : (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write your reply..."
            rows={4}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
          />
          <div className="flex justify-end">
            <button
              onClick={() => postMutation.mutate()}
              disabled={!reply.trim() || postMutation.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {postMutation.isPending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              Post Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
