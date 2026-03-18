'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Ban, Flag, Loader2, MessageCircle, MoreVertical,
  Search, Send, Sparkles, User, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatRelativeTime } from '@/lib/utils';
import { buildVideoRoute } from '@/lib/video-client';
import { dedupeMessagesForDisplay } from '@/components/messaging/message-display';
import { getLatestUnreadIncomingMessageId, shouldIssueReadSync } from '@/components/messaging/read-sync';
import type { Conversation, Message } from '@/components/messaging/types';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportReason, setReportReason] = useState('HARASSMENT');
  const [reportDescription, setReportDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const readSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightReadConnectionsRef = useRef(new Set<string>());
  const syncedReadKeysRef = useRef(new Map<string, string>());

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => api.getMessages(selectedConversationId!),
    enabled: !!selectedConversationId,
    refetchInterval: selectedConversationId ? 5000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const reportMutation = useMutation({
    mutationFn: () => api.reportUser({
      reportedUserId: selectedConversation!.user.id,
      reason: reportReason,
      description: reportDescription,
    }),
    onSuccess: () => {
      toast.success('Report submitted. Our moderation team will review it.');
      setShowReportModal(false);
      setReportReason('HARASSMENT');
      setReportDescription('');
    },
    onError: () => toast.error('Failed to submit report'),
  });

  const blockMutation = useMutation({
    mutationFn: () => api.blockUser(selectedConversation!.user.id, 'Blocked from messages'),
    onSuccess: () => {
      toast.success(`${selectedConversation?.user.displayName} has been blocked`);
      setShowBlockModal(false);
      setSelectedConversationId(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => toast.error('Failed to block user'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ connectionId, content }: { connectionId: string; content: string }) => api.sendMessage(connectionId, content),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
    },
    onError: () => toast.error('Failed to send message'),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (connectionId: string) => api.markMessagesAsRead(connectionId),
    onSuccess: (_result, connectionId) => {
      inFlightReadConnectionsRef.current.delete(connectionId);
      queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
      queryClient.setQueryData(['conversations'], (current: any) => {
        if (!current?.conversations) return current;
        return {
          ...current,
          conversations: current.conversations.map((conversation: Conversation) =>
            conversation.connectionId === connectionId ? { ...conversation, unreadCount: 0 } : conversation),
        };
      });
      queryClient.setQueryData(['messages', connectionId], (current: any) => {
        if (!current?.messages) return current;
        return {
          ...current,
          messages: current.messages.map((message: Message) =>
            message.connectionId === connectionId && !message.isFromMe && !message.readAt
              ? { ...message, readAt: new Date().toISOString() }
              : message),
        };
      });
    },
    onError: (_error, connectionId) => {
      inFlightReadConnectionsRef.current.delete(connectionId);
    },
  });

  const conversationList = useMemo<Conversation[]>(() => conversationsData?.conversations || [], [conversationsData]);
  const filteredConversations = useMemo(
    () => conversationList.filter((conversation) => `${conversation.user.displayName} ${conversation.lastMessage?.content || ''}`.toLowerCase().includes(searchTerm.toLowerCase())),
    [conversationList, searchTerm],
  );
  const messageList = useMemo<Message[]>(
    () => dedupeMessagesForDisplay(messagesData?.messages || []),
    [messagesData],
  );
  const selectedConversation = useMemo(
    () => conversationList.find((conversation) => conversation.connectionId === selectedConversationId) || null,
    [conversationList, selectedConversationId],
  );
  const totalUnread = useMemo(() => conversationList.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0), [conversationList]);
  const latestUnreadIncomingMessageId = useMemo(() => getLatestUnreadIncomingMessageId(messageList), [messageList]);
  const requestedConversationId = searchParams.get('match');

  useEffect(() => {
    if (!requestedConversationId) return;
    const requestedConversation = conversationList.find((conversation) => conversation.connectionId === requestedConversationId);
    if (requestedConversation && selectedConversationId !== requestedConversation.connectionId) {
      setSelectedConversationId(requestedConversation.connectionId);
    }
  }, [conversationList, requestedConversationId, selectedConversationId]);

  useEffect(() => {
    if (selectedConversationId && !conversationList.some((conversation) => conversation.connectionId === selectedConversationId)) {
      setSelectedConversationId(null);
    }
  }, [conversationList, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList]);

  useEffect(() => {
    setShowActions(false);
  }, [selectedConversationId]);

  useEffect(() => {
    const connectionId = selectedConversation?.connectionId ?? null;
    if (!connectionId) return;

    const { shouldSync, syncKey } = shouldIssueReadSync({
      connectionId,
      unreadCount: selectedConversation?.unreadCount ?? 0,
      latestUnreadMessageId: latestUnreadIncomingMessageId,
      inFlight: inFlightReadConnectionsRef.current.has(connectionId),
      lastSyncedKey: syncedReadKeysRef.current.get(connectionId) ?? null,
    });

    if (!shouldSync || !syncKey) return;
    if (readSyncTimeoutRef.current) clearTimeout(readSyncTimeoutRef.current);

    readSyncTimeoutRef.current = setTimeout(() => {
      if (inFlightReadConnectionsRef.current.has(connectionId)) return;
      readSyncTimeoutRef.current = null;
      inFlightReadConnectionsRef.current.add(connectionId);
      syncedReadKeysRef.current.set(connectionId, syncKey);
      markAsReadMutation.mutate(connectionId);
    }, 250);

    return () => {
      if (readSyncTimeoutRef.current) clearTimeout(readSyncTimeoutRef.current);
    };
  }, [latestUnreadIncomingMessageId, markAsReadMutation, selectedConversation?.connectionId, selectedConversation?.unreadCount]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({ connectionId: selectedConversation.connectionId, content: messageInput.trim() });
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.connectionId);
    queryClient.setQueryData(['conversations'], (current: any) => {
      if (!current?.conversations) return current;
      return {
        ...current,
        conversations: current.conversations.map((item: Conversation) =>
          item.connectionId === conversation.connectionId ? { ...item, unreadCount: 0 } : item),
      };
    });
  };

  const handleVideoCall = () => {
    if (!selectedConversation || selectedConversation.connectionType !== 'BROTHERS_IN_ARMS') {
      toast.error('Video calling is available on active BIA conversations only');
      return;
    }

    router.push(
      buildVideoRoute({
        connectionId: selectedConversation.connectionId,
        peerId: selectedConversation.user.id,
        peerName: selectedConversation.user.displayName,
        peerPhotoUrl: selectedConversation.user.photoUrl,
      }),
    );
    setShowActions(false);
  };

  return (
    <div className="relative flex h-[calc(100dvh-theme(spacing.16))] min-h-[calc(100dvh-theme(spacing.16))] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.1),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_35%),hsl(var(--background))]">
      <aside className={cn('flex w-full flex-col border-r border-border/70 bg-background/80 backdrop-blur-sm md:w-[380px] xl:w-[430px] 2xl:w-[480px]', selectedConversation && 'hidden md:flex')}>
        <div className="border-b border-border/70 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
                <Sparkles className="h-3 w-3" />
                Messaging
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">Inbox</h1>
              <p className="mt-1 text-sm text-muted-foreground">Keep reconnections active without losing context.</p>
            </div>
            <Badge className="border-primary/15 bg-primary/10 text-primary">{totalUnread} unread</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-background/90 p-3 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Conversations</p>
              <p className="mt-2 text-2xl font-semibold">{conversationList.length}</p>
            </div>
            <div className="rounded-2xl border bg-background/90 p-3 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Unread</p>
              <p className="mt-2 text-2xl font-semibold">{totalUnread}</p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search conversations"
              className="h-11 w-full rounded-2xl border bg-background pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40"
            />
          </div>
        </div>

        {conversationsLoading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <div>
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">{searchTerm ? 'No matches found' : 'No conversations yet'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{searchTerm ? 'Try a different name or clear your search.' : 'Reconnect with veterans to start chatting.'}</p>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-2">
              {filteredConversations.map((conversation, index) => (
                <motion.button
                  key={conversation.connectionId}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => handleSelectConversation(conversation)}
                  className={cn(
                    'w-full rounded-3xl border p-3 text-left transition-all',
                    selectedConversation?.connectionId === conversation.connectionId
                      ? 'border-primary/35 bg-primary/8 shadow-lg shadow-primary/5'
                      : 'border-transparent bg-background/80 hover:border-border hover:bg-muted/35',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar src={conversation.user.photoUrl} name={conversation.user.displayName} size="md" className="shadow-sm" />
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{conversation.user.displayName}</p>
                        <span className="text-[11px] text-muted-foreground">{conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : ''}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', conversation.connectionType === 'BROTHERS_IN_ARMS' && 'border-primary/20 bg-primary/10 text-primary')}>
                          {conversation.connectionType === 'BROTHERS_IN_ARMS' ? 'BIA' : 'Community'}
                        </Badge>
                        <p className={cn('min-w-0 truncate text-xs', conversation.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                          {conversation.lastMessage?.isFromMe ? 'You: ' : ''}
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <section className={cn('flex min-w-0 flex-1 flex-col', !selectedConversation && 'hidden md:flex')}>
        {selectedConversation ? (
          <>
            <div className="border-b border-border/70 bg-background/70 px-5 py-4 backdrop-blur-sm lg:px-7 xl:px-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedConversationId(null)} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Link href={`/app/profile/${selectedConversation.user.id}`}>
                  <Avatar src={selectedConversation.user.photoUrl} name={selectedConversation.user.displayName} size="sm" className="cursor-pointer shadow-sm transition-all hover:ring-2 hover:ring-primary" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/app/profile/${selectedConversation.user.id}`} className="truncate font-semibold transition-colors hover:text-primary">
                      {selectedConversation.user.displayName}
                    </Link>
                    {selectedConversation.connectionType === 'BROTHERS_IN_ARMS' && <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">BIA</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">Continue the conversation from wherever you are in the app.</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {selectedConversation.connectionType === 'BROTHERS_IN_ARMS' && (
                    <button onClick={handleVideoCall} className="rounded-full p-2 text-primary transition-colors hover:bg-primary/10" title="Video Call">
                      <Video className="h-5 w-5" />
                    </button>
                  )}
                  <Link href={`/app/profile/${selectedConversation.user.id}`} className="rounded-full p-2 transition-colors hover:bg-muted" title="View Profile">
                    <User className="h-5 w-5" />
                  </Link>
                </div>
                <div className="relative">
                  <button onClick={() => setShowActions((current) => !current)} className="rounded-full p-2 transition-colors hover:bg-muted">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  <AnimatePresence>
                    {showActions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full z-10 mt-2 w-52 rounded-2xl border bg-background p-2 shadow-xl"
                      >
                        <Link href={`/app/profile/${selectedConversation.user.id}`} onClick={() => setShowActions(false)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted">
                          <User className="h-4 w-4" />
                          View Profile
                        </Link>
                        {selectedConversation.connectionType === 'BROTHERS_IN_ARMS' && (
                          <button onClick={handleVideoCall} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted">
                            <Video className="h-4 w-4" />
                            Video Call
                          </button>
                        )}
                        <button
                          onClick={() => { setShowActions(false); setShowReportModal(true); }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted"
                        >
                          <Flag className="h-4 w-4" />
                          Report User
                        </button>
                        <button
                          onClick={() => { setShowActions(false); setShowBlockModal(true); }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                        >
                          <Ban className="h-4 w-4" />
                          Block User
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.07),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)] px-5 py-6 lg:px-7 xl:px-8">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : messageList.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <MessageCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                    <h2 className="text-xl font-semibold">Start the conversation</h2>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">Send the first message and keep the reconnection moving.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messageList.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={cn('flex', message.isFromMe ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn(
                          'max-w-[85%] rounded-3xl px-4 py-3 shadow-sm lg:max-w-[76%] 2xl:max-w-[64%]',
                          message.isFromMe ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border bg-background',
                        )}>
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                          <p className={cn('mt-2 text-[11px]', message.isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            {formatRelativeTime(message.createdAt)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border/70 bg-background/90 p-4 lg:px-7 xl:px-8">
              <div className="rounded-[24px] border bg-background p-2 shadow-sm">
                <Textarea
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={`Message ${selectedConversation.user.displayName}...`}
                  rows={2}
                  className="min-h-[64px] resize-none border-0 px-3 py-3 shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between gap-3 px-3 pb-2">
                  <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for a new line.</p>
                  <Button onClick={handleSendMessage} disabled={!messageInput.trim() || sendMessageMutation.isPending} isLoading={sendMessageMutation.isPending}>
                    <Send className="mr-1.5 h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-xl text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-semibold">Select a conversation</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Pick someone from the left to jump back into the conversation, review unread messages, or start reconnecting in real time.</p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background/90 p-4 text-left shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Unread</p>
                  <p className="mt-2 text-2xl font-semibold">{totalUnread}</p>
                </div>
                <div className="rounded-2xl border bg-background/90 p-4 text-left shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Conversations</p>
                  <p className="mt-2 text-2xl font-semibold">{conversationList.length}</p>
                </div>
                <div className="rounded-2xl border bg-background/90 p-4 text-left shadow-sm">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">BIA chats</p>
                  <p className="mt-2 text-2xl font-semibold">{conversationList.filter((conversation) => conversation.connectionType === 'BROTHERS_IN_ARMS').length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {showReportModal && selectedConversation && (
        <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title={`Report ${selectedConversation.user.displayName}`} description="Reports are reviewed by our moderation team, typically within 24 hours." size="md">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason</label>
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="w-full rounded-xl border bg-background p-3 text-sm">
                <option value="HARASSMENT">Harassment</option>
                <option value="FAKE_PROFILE">Fake profile / not a veteran</option>
                <option value="SPAM">Spam</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate content</option>
                <option value="SCAM">Scam or fraud</option>
                <option value="IMPERSONATION">Impersonation</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <Textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} placeholder="Describe what happened..." rows={4} label="Additional details (optional)" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReportModal(false)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={() => reportMutation.mutate()} isLoading={reportMutation.isPending} className="flex-1">Submit Report</Button>
            </div>
          </div>
        </Modal>
      )}

      {showBlockModal && selectedConversation && (
        <Modal isOpen={showBlockModal} onClose={() => setShowBlockModal(false)} title={`Block ${selectedConversation.user.displayName}?`} description="They will no longer be able to contact you." size="sm">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-destructive/5 p-4 text-sm text-muted-foreground">
              Blocking removes the chat relationship and prevents future messaging until moderation or settings changes are made.
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowBlockModal(false)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={() => blockMutation.mutate()} isLoading={blockMutation.isPending} className="flex-1">Block User</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
