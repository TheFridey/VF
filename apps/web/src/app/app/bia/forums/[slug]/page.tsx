'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Eye,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ForumPanel, ForumShell, ForumStage } from '@/components/bia/forum-shell';
import { cn, formatRelativeTime } from '@/lib/utils';

function getAccent(tier?: string) {
  if (tier === 'BIA_PLUS') {
    return {
      button: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
      badge: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
      panel: 'border-amber-300/15',
      ring: 'ring-amber-300/30',
      icon: 'text-amber-200',
      subtle: 'text-amber-200/80',
      dot: 'bg-amber-300',
    };
  }

  return {
    button: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
    badge: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    panel: 'border-emerald-300/15',
    ring: 'ring-emerald-300/30',
    icon: 'text-emerald-200',
    subtle: 'text-emerald-200/80',
    dot: 'bg-emerald-300',
  };
}

export default function ThreadListPage() {
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  const queryClient = useQueryClient();
  const [showNewThread, setShowNewThread] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['forum-threads', slug],
    queryFn: () => api.getForumThreads(slug),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createForumThread(slug, { title, content }),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads', slug] });
      toast.success('Thread created');
      setShowNewThread(false);
      setTitle('');
      setContent('');
      router.push(`/app/bia/forums/thread/${thread.id}`);
    },
    onError: () => toast.error('Failed to create thread'),
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

  const category = data?.category;
  const threads = data?.threads || [];
  const accent = getAccent(category?.tier);
  const totalReplies = threads.reduce((sum: number, thread: any) => sum + Math.max((thread._count?.posts || 0) - 1, 0), 0);
  const totalViews = threads.reduce((sum: number, thread: any) => sum + (thread.viewCount || 0), 0);
  const latestThread = threads[0];

  return (
    <ForumStage>
      <ForumShell>
        <ForumPanel className={cn('overflow-hidden', accent.panel)}>
          <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => router.push('/app/bia/forums')}
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to forums</span>
              </button>

              <div className="space-y-3">
                <div className={cn('inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em]', accent.badge)}>
                  {category?.tier === 'BIA_PLUS' ? 'Premium Room' : category?.tier === 'REGIMENT' ? 'Regiment Room' : 'BIA Room'}
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{category?.name}</h1>
                <p className="max-w-3xl text-base leading-7 text-slate-300">{category?.description}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setShowNewThread(true)} className={cn('gap-2', accent.button)}>
                  <Plus className="h-4 w-4" />
                  Start a new thread
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: 'Threads', value: threads.length, helper: 'Curated conversations', icon: MessageSquare },
                { label: 'Replies', value: totalReplies, helper: 'Across this room', icon: Send },
                { label: 'Views', value: totalViews, helper: latestThread ? `Latest ${formatRelativeTime(latestThread.lastPostAt)}` : 'No activity yet', icon: Eye },
              ].map(({ label, value, helper, icon: Icon }) => (
                <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
                    <Icon className={cn('h-4 w-4', accent.subtle)} />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{helper}</p>
                </div>
              ))}
            </div>
          </div>
        </ForumPanel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {threads.length === 0 ? (
              <ForumPanel className="p-10 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-slate-600" />
                <h2 className="mt-4 text-xl font-semibold text-white">No threads yet</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-400">
                  This forum is ready for its first discussion. Start a thoughtful thread and set the tone for the room.
                </p>
                <Button onClick={() => setShowNewThread(true)} className={cn('mt-6', accent.button)}>
                  Start the first thread
                </Button>
              </ForumPanel>
            ) : (
              threads.map((thread: any, index: number) => (
                <ForumPanel
                  key={thread.id}
                  className={cn(
                    'group cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1',
                    thread.isPinned ? accent.panel : 'border-white/10',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/app/bia/forums/thread/${thread.id}`)}
                    className="block w-full text-left"
                  >
                    <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {thread.isPinned && (
                            <span className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]', accent.badge)}>
                              <Pin className="h-3 w-3" />
                              Pinned
                            </span>
                          )}
                          {thread.isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                              <Lock className="h-3 w-3" />
                              Locked
                            </span>
                          )}
                          {index === 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                              Latest
                            </span>
                          )}
                        </div>

                        <h2 className="thread-title text-xl font-semibold text-white transition-colors group-hover:text-white/90">
                          {thread.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          <span className="font-medium text-slate-200">{thread.author?.profile?.displayName || 'Unknown'}</span>
                          <span className="text-slate-600">/</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatRelativeTime(thread.lastPostAt)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Replies</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{Math.max((thread._count?.posts || 0) - 1, 0)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Views</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{thread.viewCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                </ForumPanel>
              ))
            )}
          </div>

          <div className="space-y-4">
            <ForumPanel className="p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Room Notes</p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
                <p>
                  Threads in this room should stay relevant to <span className="font-medium text-white">{category?.name}</span>.
                  Strong openings tend to include context, a clear question, and enough detail for others to respond thoughtfully.
                </p>
                <p>
                  If you are starting a new discussion, aim for a title that tells members exactly what the thread is about.
                </p>
              </div>
            </ForumPanel>

            <ForumPanel className="p-6">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Quick Start</p>
              <div className="mt-4 space-y-3">
                {[
                  'Open with enough context so people can answer properly.',
                  'Use the room theme rather than posting a catch-all question.',
                  'Keep threads readable and make the ask clear in the title.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <div className={cn('mt-2 h-2 w-2 rounded-full', accent.dot)} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </ForumPanel>
          </div>
        </div>
      </ForumShell>

      <Modal isOpen={showNewThread} onClose={() => setShowNewThread(false)} title="New Thread">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Title</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Write a clear title for the discussion"
              maxLength={200}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Opening Post</label>
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Give members enough detail to respond well"
              rows={7}
              className="resize-none w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowNewThread(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
              className={accent.button}
            >
              {createMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Post Thread'}
            </Button>
          </div>
        </div>
      </Modal>
    </ForumStage>
  );
}
