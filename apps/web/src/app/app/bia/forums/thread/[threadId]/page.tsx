'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Eye,
  Lock,
  Pin,
  Send,
  Shield,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/auth-store';
import { ForumBreadcrumbs, ForumPanel, ForumShell, ForumStage } from '@/components/bia/forum-shell';
import { cn, formatBranch, formatRelativeTime } from '@/lib/utils';

function getAccent(tier?: string) {
  if (tier === 'BIA_PLUS') {
    return {
      button: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
      badge: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
      outline: 'border-amber-300/15',
      highlight: 'text-amber-200',
    };
  }

  return {
    button: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
    badge: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    outline: 'border-emerald-300/15',
    highlight: 'text-emerald-200',
  };
}

export default function ThreadViewPage() {
  const router = useRouter();
  const { threadId } = useParams() as { threadId: string };
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
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 120);
    },
    onError: () => toast.error('Failed to post reply'),
  });

  if (isLoading) {
    return (
      <ForumStage>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-emerald-400" />
        </div>
      </ForumStage>
    );
  }

  const thread = data?.thread;
  const posts = data?.posts || [];
  const category = thread?.category;
  const accent = getAccent(category?.tier);

  return (
    <ForumStage>
      <ForumShell>
        <ForumBreadcrumbs
          items={[
            { label: 'BIA', href: '/app/bia' },
            { label: 'Forums', href: '/app/bia/forums' },
            category?.slug ? { label: category?.name || 'Room', href: `/app/bia/forums/${category.slug}` } : { label: category?.name || 'Room' },
            { label: thread?.title || 'Thread' },
          ]}
          className="px-1"
        />

        <ForumPanel className={cn('overflow-hidden', accent.outline)}>
          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {thread?.isPinned && (
                    <Badge className={cn('gap-1 border', accent.badge)}>
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                  {thread?.isLocked && (
                    <Badge className="gap-1 border border-white/10 bg-white/5 text-slate-200">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {category?.name}
                  </Badge>
                </div>
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  {thread?.title}
                </h1>
                <p className="text-sm leading-8 text-slate-300">
                  {data?.total} {data?.total === 1 ? 'post' : 'posts'} in this thread. Read through the discussion and reply when you can add something useful.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/app/bia/forums/${category?.slug}`)}
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to {category?.name}</span>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: 'Posts', value: data?.total || 0, helper: 'Messages in thread', icon: Sparkles },
                { label: 'Views', value: thread?.viewCount || 0, helper: 'Across all visits', icon: Eye },
                { label: 'Status', value: thread?.isLocked ? 'Locked' : 'Open', helper: thread?.isPinned ? 'Pinned to top' : 'Accepting replies', icon: Clock },
              ].map(({ label, value, helper, icon: Icon }) => (
                <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
                    <Icon className={cn('h-4 w-4', accent.highlight)} />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{helper}</p>
                </div>
              ))}
            </div>
          </div>
        </ForumPanel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {posts.map((post: any, index: number) => {
              const isOriginalPoster = post.authorId === thread?.authorId;
              const isCurrentUser = post.authorId === user?.id;
              const isStaff = ['ADMIN', 'MODERATOR'].includes(post.author?.role || '');

              return (
                <ForumPanel
                  key={post.id}
                  className={cn(
                    'overflow-hidden p-0',
                    isOriginalPoster ? accent.outline : 'border-white/10',
                    isCurrentUser && !isOriginalPoster && 'border-sky-400/20',
                  )}
                >
                  <div className={cn(
                    'border-b px-4 py-3 sm:px-5',
                    isOriginalPoster ? 'bg-white/[0.04] border-white/10' : 'bg-black/20 border-white/5',
                  )}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar
                        src={post.author?.profile?.profileImageUrl}
                        fallback={post.author?.profile?.displayName?.[0] || '?'}
                        className="h-10 w-10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{post.author?.profile?.displayName || 'Unknown'}</span>
                          {isOriginalPoster && (
                            <Badge className={cn('border', accent.badge)}>OP</Badge>
                          )}
                          {isCurrentUser && (
                            <Badge className="border border-sky-300/25 bg-sky-400/10 text-sky-100">You</Badge>
                          )}
                          {isStaff && (
                            <Badge className="border border-amber-300/25 bg-amber-400/10 text-amber-100">Staff</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          {post.author?.veteranDetails?.branch && (
                            <>
                              <span className="inline-flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {formatBranch(post.author.veteranDetails.branch)}
                              </span>
                              {post.author?.veteranDetails?.rank && <span>/ {post.author.veteranDetails.rank}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatRelativeTime(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-5 sm:px-5">
                    <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-200">{post.content}</p>
                    {index === 0 && (
                      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                        Opening post
                      </div>
                    )}
                  </div>
                </ForumPanel>
              );
            })}

            <div ref={bottomRef} />

            {thread?.isLocked ? (
              <ForumPanel className="border-white/10 p-5">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>This thread is locked. No further replies can be posted.</span>
                </div>
              </ForumPanel>
            ) : (
              <ForumPanel className="p-5 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Add Reply</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Write something worth the read.</h2>
                  </div>
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Add context, make your point clearly, and help move the discussion forward."
                    rows={6}
                    className="w-full resize-none rounded-[20px] border border-white/10 bg-black/20 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => postMutation.mutate()}
                      disabled={!reply.trim() || postMutation.isPending}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        accent.button,
                      )}
                    >
                      {postMutation.isPending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      Post Reply
                    </button>
                  </div>
                </div>
              </ForumPanel>
            )}
          </div>

          <div className="space-y-4">
            <ForumPanel className="p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Thread Context</p>
              <div className="mt-4 space-y-3 text-sm leading-8 text-slate-300">
                <p>
                  This thread lives inside <span className="font-medium text-white">{category?.name}</span>.
                  Keep replies relevant to the room and add detail rather than just agreeing in one line.
                </p>
                <p>
                  Strong replies usually add experience, a useful question, or a next step someone else can act on.
                </p>
              </div>
            </ForumPanel>

            <ForumPanel className="p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Quick Meta</p>
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <span>Started by</span>
                  <span className="font-medium text-white">{thread?.author?.profile?.displayName || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Replies</span>
                  <span className="font-medium text-white">{Math.max((data?.total || 0) - 1, 0)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Views</span>
                  <span className="font-medium text-white">{thread?.viewCount || 0}</span>
                </div>
              </div>
            </ForumPanel>
          </div>
        </div>
      </ForumShell>
    </ForumStage>
  );
}
