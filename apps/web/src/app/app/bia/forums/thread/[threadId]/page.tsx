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
          className="text-slate-400 hover:text-white transition-colors mt-1 shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {thread?.isPinned && <Pin className="w-4 h-4 text-green-400" />}
            {thread?.isLocked && <Lock className="w-4 h-4 text-slate-500" />}
            <h1 className="text-xl font-bold text-white">{thread?.title}</h1>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {category?.name} · {data?.total} {data?.total === 1 ? 'post' : 'posts'}
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map((post: any, idx: number) => {
          const isOp = post.authorId === thread?.authorId;
          const isMe = post.authorId === user?.id;
          return (
            <div
              key={post.id}
              className={cn(
                'rounded-xl border overflow-hidden',
                isOp ? 'bg-slate-800 border-green-700/40' : 'bg-slate-800 border-slate-700',
                isMe && !isOp && 'border-blue-700/40',
              )}
            >
              {/* Post header */}
              <div className={cn(
                'flex items-center gap-3 px-4 py-2.5 border-b',
                isOp ? 'bg-green-950/40 border-green-700/30' : 'bg-slate-900/50 border-slate-700',
                isMe && !isOp && 'bg-blue-950/30 border-blue-700/30',
              )}>
                <Avatar
                  src={post.author?.profile?.profileImageUrl}
                  fallback={post.author?.profile?.displayName?.[0] || '?'}
                  className="w-8 h-8"
                />
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <span className="font-semibold text-slate-100 text-sm">
                    {post.author?.profile?.displayName || 'Unknown'}
                  </span>
                  {isOp && (
                    <Badge className="bg-green-700/30 text-green-400 border-green-600/40 text-xs py-0">OP</Badge>
                  )}
                  {isMe && (
                    <Badge className="bg-blue-700/30 text-blue-400 border-blue-600/40 text-xs py-0">You</Badge>
                  )}
                  {post.author?.veteranDetails?.branch && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Shield className="w-3 h-3" />
                      <span>{formatBranch(post.author.veteranDetails.branch)}</span>
                      {post.author.veteranDetails.rank && <span>· {post.author.veteranDetails.rank}</span>}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {formatRelativeTime(post.createdAt)}
                  {post.isEdited && <span className="ml-1 italic">(edited)</span>}
                </span>
              </div>

              {/* Post body */}
              <div className="px-4 py-3.5">
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      {thread?.isLocked ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-800 rounded-xl p-4 border border-slate-700">
          <Lock className="w-4 h-4 shrink-0" />
          <span>This thread is locked. No further replies are allowed.</span>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write your reply..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-colors"
          />
          <div className="flex justify-end">
            <button
              onClick={() => postMutation.mutate()}
              disabled={!reply.trim() || postMutation.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
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
