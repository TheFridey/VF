'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ExternalLink, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatRelativeTime } from '@/lib/utils';
import { dedupeMessagesForDisplay } from './message-display';
import { getLatestUnreadIncomingMessageId, shouldIssueReadSync } from './read-sync';
import type { Conversation, Message } from './types';

export function FloatingChatDock() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const autoSelectedOnOpenRef = useRef(false);
  const readSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightReadConnectionsRef = useRef(new Set<string>());
  const syncedReadKeysRef = useRef(new Map<string, string>());

  const { data: unreadCounts } = useQuery({
    queryKey: ['unreadCounts'],
    queryFn: () => api.getUnreadCounts(),
    enabled: !!user?.id,
    refetchInterval: isOpen ? 15000 : 30000,
  });

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    enabled: !!user?.id,
    staleTime: 10000,
    refetchInterval: isOpen ? 15000 : 30000,
  });

  const {
    data: messagesData,
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => api.getMessages(selectedConversationId!),
    enabled: !!user?.id && isOpen && !!selectedConversationId,
    refetchInterval: isOpen && !!selectedConversationId ? 7000 : false,
    refetchOnWindowFocus: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ connectionId, content }: { connectionId: string; content: string }) =>
      api.sendMessage(connectionId, content),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (connectionId: string) => api.markMessagesAsRead(connectionId),
    onSuccess: (_result, connectionId) => {
      inFlightReadConnectionsRef.current.delete(connectionId);
      queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
      queryClient.setQueryData(['conversations'], (current: any) => {
        if (!current?.conversations) {
          return current;
        }

        return {
          ...current,
          conversations: current.conversations.map((conversation: Conversation) =>
            conversation.connectionId === connectionId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        };
      });
      queryClient.setQueryData(['messages', connectionId], (current: any) => {
        if (!current?.messages) {
          return current;
        }

        return {
          ...current,
          messages: current.messages.map((message: Message) =>
            message.connectionId === connectionId && !message.isFromMe && !message.readAt
              ? { ...message, readAt: new Date().toISOString() }
              : message,
          ),
        };
      });
    },
    onError: (_error, connectionId) => {
      inFlightReadConnectionsRef.current.delete(connectionId);
    },
  });

  const conversationList = useMemo<Conversation[]>(
    () => conversationsData?.conversations || [],
    [conversationsData],
  );
  const selectedConversation = useMemo(
    () => conversationList.find((conversation) => conversation.connectionId === selectedConversationId) || null,
    [conversationList, selectedConversationId],
  );
  const messageList = useMemo<Message[]>(
    () => dedupeMessagesForDisplay(messagesData?.messages || []),
    [messagesData],
  );
  const totalUnread = unreadCounts?.total || 0;
  const latestUnreadIncomingMessageId = useMemo(
    () => getLatestUnreadIncomingMessageId(messageList),
    [messageList],
  );

  useEffect(() => {
    if (!isOpen) {
      autoSelectedOnOpenRef.current = false;
      return;
    }

    if (autoSelectedOnOpenRef.current || selectedConversationId || conversationList.length === 0) {
      return;
    }

    const priorityConversation = conversationList.find((conversation) => conversation.unreadCount > 0) || conversationList[0];
    setSelectedConversationId(priorityConversation.connectionId);
    autoSelectedOnOpenRef.current = true;
  }, [conversationList, isOpen, selectedConversationId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) {
        return;
      }

      const target = event.target as Node;
      if (
        panelRef.current?.contains(target)
        || buttonRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const connectionId = selectedConversation?.connectionId ?? null;

    if (!user?.id || !isOpen || !connectionId) {
      return;
    }

    const { shouldSync, syncKey } = shouldIssueReadSync({
      connectionId,
      unreadCount: selectedConversation?.unreadCount ?? 0,
      latestUnreadMessageId: latestUnreadIncomingMessageId,
      inFlight: inFlightReadConnectionsRef.current.has(connectionId),
      lastSyncedKey: syncedReadKeysRef.current.get(connectionId) ?? null,
    });

    if (!shouldSync || !syncKey) {
      return;
    }

    if (readSyncTimeoutRef.current) {
      clearTimeout(readSyncTimeoutRef.current);
    }

    readSyncTimeoutRef.current = setTimeout(() => {
      if (inFlightReadConnectionsRef.current.has(connectionId)) {
        return;
      }

      readSyncTimeoutRef.current = null;
      inFlightReadConnectionsRef.current.add(connectionId);
      syncedReadKeysRef.current.set(connectionId, syncKey);
      markAsReadMutation.mutate(connectionId);
    }, 250);

    return () => {
      if (readSyncTimeoutRef.current) {
        clearTimeout(readSyncTimeoutRef.current);
      }
    };
  }, [
    isOpen,
    latestUnreadIncomingMessageId,
    markAsReadMutation,
    selectedConversation?.connectionId,
    selectedConversation?.unreadCount,
    user?.id,
  ]);

  const handleSend = () => {
    if (!selectedConversation || !messageInput.trim()) {
      return;
    }

    sendMessageMutation.mutate({
      connectionId: selectedConversation.connectionId,
      content: messageInput.trim(),
    });
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  if (!user?.id) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="flex h-[min(70vh,38rem)] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[26px] border border-white/12 bg-background/95 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            >
              <div className="border-b border-border/70 bg-gradient-to-br from-primary/12 via-background to-background px-4 py-4">
                {selectedConversation ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversationId(null)}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <Avatar
                      src={selectedConversation.user.photoUrl}
                      name={selectedConversation.user.displayName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{selectedConversation.user.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.connectionType === 'BROTHERS_IN_ARMS' ? 'BIA conversation' : 'Community conversation'}
                      </p>
                    </div>
                    <Link
                      href={`/app/messages?match=${selectedConversation.connectionId}`}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Full inbox
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
                        <Sparkles className="h-3 w-3" />
                        Quick Chat
                      </div>
                      <h2 className="mt-3 text-lg font-semibold">Messages</h2>
                      <p className="text-sm text-muted-foreground">Jump into a conversation from anywhere in the app.</p>
                    </div>
                    <Link
                      href="/app/messages"
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Open inbox
                    </Link>
                  </div>
                )}
              </div>

              {!selectedConversation ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
                    <span>{conversationList.length} conversations</span>
                    {totalUnread > 0 ? <span>{totalUnread} unread</span> : <span>All caught up</span>}
                  </div>

                  {conversationsLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : conversationList.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center p-6 text-center">
                      <div>
                        <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No conversations yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Start reconnecting in Find Veterans to open your first chat.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                      {conversationList.map((conversation) => (
                        <button
                          key={conversation.connectionId}
                          onClick={() => setSelectedConversationId(conversation.connectionId)}
                          className="w-full rounded-2xl p-2 text-left transition-colors hover:bg-muted/60"
                        >
                          <div className="flex items-center gap-3 rounded-2xl border border-transparent px-2 py-2">
                            <Avatar
                              src={conversation.user.photoUrl}
                              name={conversation.user.displayName}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-medium">{conversation.user.displayName}</p>
                                <span className="text-[11px] text-muted-foreground">
                                  {conversation.lastMessageAt ? formatRelativeTime(conversation.lastMessageAt) : ''}
                                </span>
                              </div>
                              <p className={cn(
                                'truncate text-xs',
                                conversation.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
                              )}
                              >
                                {conversation.lastMessage?.isFromMe ? 'You: ' : ''}
                                {conversation.lastMessage?.content || 'No messages yet'}
                              </p>
                            </div>
                            {conversation.unreadCount > 0 ? (
                              <Badge className="bg-primary px-1.5 text-[10px] text-white">{conversation.unreadCount}</Badge>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.07),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)] px-4 py-4">
                    {messagesLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : messageList.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center">
                        <div>
                          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                          <p className="text-sm font-medium">Start the conversation</p>
                          <p className="mt-1 text-xs text-muted-foreground">Send a quick message without leaving the page you&apos;re on.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messageList.map((message) => (
                          <div
                            key={message.id}
                            className={cn('flex', message.isFromMe ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                                message.isFromMe
                                  ? 'rounded-br-md bg-primary text-primary-foreground'
                                  : 'rounded-bl-md border bg-background',
                              )}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              <p className={cn(
                                'mt-1 text-[11px]',
                                message.isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                              )}
                              >
                                {formatRelativeTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border/70 bg-background/90 p-3">
                    <div className="rounded-2xl border bg-background p-2 shadow-sm">
                      <Textarea
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        placeholder={`Message ${selectedConversation.user.displayName}...`}
                        rows={2}
                        className="min-h-[52px] resize-none border-0 px-2 py-2 shadow-none focus-visible:ring-0"
                      />
                      <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-1">
                        <p className="text-[11px] text-muted-foreground">Press Enter to send, Shift+Enter for a new line.</p>
                        <Button
                          size="sm"
                          onClick={handleSend}
                          isLoading={sendMessageMutation.isPending}
                          disabled={!messageInput.trim() || sendMessageMutation.isPending}
                        >
                          <Send className="mr-1.5 h-4 w-4" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          ref={buttonRef}
          type="button"
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -2 }}
          onClick={() => setIsOpen((current) => !current)}
          className="group flex items-center gap-3 rounded-full border border-primary/15 bg-background/95 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-colors hover:bg-background"
        >
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MessageCircle className="h-5 w-5" />
            {totalUnread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            ) : null}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold">Quick chat</p>
            <p className="text-xs text-muted-foreground">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'}` : 'Jump back into a conversation'}
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
