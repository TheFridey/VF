'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pin, Lock, MessageSquare, Eye, Clock, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ThreadListPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
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
      toast.success('Thread created!');
      setShowNewThread(false);
      setTitle('');
      setContent('');
      router.push(`/app/bia/forums/thread/${thread.id}`);
    },
    onError: () => toast.error('Failed to create thread'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner className="w-8 h-8 text-green-500" />
    </div>
  );

  const category = data?.category;
  const threads = data?.threads || [];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/app/bia/forums')} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{category?.name}</h1>
            <p className="text-sm text-gray-400">{category?.description}</p>
          </div>
        </div>
        <Button onClick={() => setShowNewThread(true)} size="sm" className="bg-green-600 hover:bg-green-500 gap-2">
          <Plus className="w-4 h-4" /> New Thread
        </Button>
      </div>

      {/* Threads */}
      {threads.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No threads yet. Be the first to start a discussion.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread: any) => (
            <Card
              key={thread.id}
              className={cn(
                'bg-gray-800/60 border-gray-700/50 hover:border-green-500/40 hover:bg-gray-800 transition-all cursor-pointer group',
                thread.isPinned && 'border-green-600/30 bg-green-900/10',
              )}
              onClick={() => router.push(`/app/bia/forums/thread/${thread.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {thread.isPinned && <Pin className="w-4 h-4 text-green-400 shrink-0" />}
                    {thread.isLocked && <Lock className="w-4 h-4 text-gray-500 shrink-0" />}
                    <h3 className="font-semibold text-white group-hover:text-green-300 transition-colors truncate">
                      {thread.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span>{thread.author?.profile?.displayName || 'Unknown'}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeTime(thread.lastPostAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400 shrink-0">
                  <div className="flex items-center gap-1 hidden sm:flex">
                    <MessageSquare className="w-4 h-4" />
                    <span>{thread._count?.posts || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 hidden sm:flex">
                    <Eye className="w-4 h-4" />
                    <span>{thread.viewCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Thread Modal */}
      <Modal isOpen={showNewThread} onClose={() => setShowNewThread(false)} title="New Thread">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Thread title..."
              maxLength={200}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={6}
              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 resize-none w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowNewThread(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              {createMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Post Thread'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
