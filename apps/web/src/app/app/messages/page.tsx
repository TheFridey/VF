'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Flag, 
  Ban, 
  Loader2, 
  Video, 
  User,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatRelativeTime } from '@/lib/utils';

interface ConversationUser {
  id: string;
  displayName: string;
  photoUrl?: string;
}

interface LastMessage {
  content: string;
  createdAt: string;
  isFromMe: boolean;
}

interface Conversation {
  matchId: string;
  matchType: string;
  user: ConversationUser;
  lastMessage: LastMessage | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  isFromMe: boolean;
}

// Video Call Modal Component
function VideoCallModal({ 
  isOpen, 
  onClose, 
  callee 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  callee: ConversationUser;
}) {
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCallState('connecting');
      const timer1 = setTimeout(() => setCallState('ringing'), 1000);
      return () => clearTimeout(timer1);
    }
  }, [isOpen]);

  const handleEndCall = () => {
    setCallState('ended');
    setTimeout(onClose, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-lg overflow-hidden -m-6">
        <div className="relative aspect-video bg-gray-800 flex items-center justify-center min-h-[400px]">
          {callState === 'connected' ? (
            <>
              <video 
                ref={remoteVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 border-white/20">
                <video 
                  ref={localVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </>
          ) : (
            <div className="text-center text-white">
              <Avatar
                src={callee.photoUrl}
                name={callee.displayName}
                size="xl"
                className="mx-auto mb-4 ring-4 ring-white/20"
              />
              <h3 className="text-xl font-semibold mb-2">{callee.displayName}</h3>
              <p className="text-white/60 flex items-center justify-center gap-2">
                {callState === 'connecting' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                )}
                {callState === 'ringing' && (
                  <>
                    <Phone className="h-4 w-4 animate-pulse" />
                    Ringing...
                  </>
                )}
                {callState === 'ended' && 'Call ended'}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-4 rounded-full transition-colors",
              isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
          
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={cn(
              "p-4 rounded-full transition-colors",
              isVideoOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </button>
        </div>

        <div className="px-6 pb-4 text-center">
          <p className="text-white/40 text-xs">
            Video calls are a Premium feature
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    refetchInterval: 10000,
  });

  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['messages', selectedConversation?.matchId],
    queryFn: () => api.getMessages(selectedConversation!.matchId),
    enabled: !!selectedConversation,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ matchId, content }: { matchId: string; content: string }) =>
      api.sendMessage(matchId, content),
    onSuccess: () => {
      setMessageInput('');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (matchId: string) => api.markMessagesAsRead(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
    },
  });

  const conversationList: Conversation[] = conversationsData?.conversations || [];
  const messageList: Message[] = messagesData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList]);

  useEffect(() => {
    if (selectedConversation) {
      markAsReadMutation.mutate(selectedConversation.matchId);
    }
  }, [selectedConversation?.matchId]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      matchId: selectedConversation.matchId,
      content: messageInput.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVideoCall = () => {
    setShowVideoCall(true);
    setShowActions(false);
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.32))] flex">
      {/* Conversations List */}
      <div
        className={cn(
          'w-full md:w-80 lg:w-96 border-r flex flex-col',
          selectedConversation && 'hidden md:flex'
        )}
      >
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Messages</h1>
        </div>

        {conversationsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : conversationList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-muted-foreground mb-2">No conversations yet</p>
              <p className="text-sm text-muted-foreground">
                Connect with another veteran to start chatting.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {conversationList.map((conversation) => (
              <button
                key={conversation.matchId}
                onClick={() => setSelectedConversation(conversation)}
                className={cn(
                  'w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left',
                  selectedConversation?.matchId === conversation.matchId && 'bg-muted'
                )}
              >
                <Avatar
                  src={conversation.user.photoUrl}
                  name={conversation.user.displayName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {conversation.user.displayName}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p
                      className={cn(
                        'text-sm truncate',
                        conversation.unreadCount > 0
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      {conversation.lastMessage.isFromMe && 'You: '}
                      {conversation.lastMessage.content}
                    </p>
                  )}
                </div>
                {conversation.unreadCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {conversation.unreadCount}
                  </Badge>
                )}
                {conversation.matchType === 'BROTHERS' && (
                  <Badge variant="outline" className="text-xs">
                    BIA
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div
        className={cn(
          'flex-1 flex flex-col',
          !selectedConversation && 'hidden md:flex'
        )}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 -ml-2 hover:bg-muted rounded-md"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <Link href={`/app/profile/${selectedConversation.user.id}`}>
                <Avatar
                  src={selectedConversation.user.photoUrl}
                  name={selectedConversation.user.displayName}
                  size="sm"
                  className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                />
              </Link>
              
              <div className="flex-1">
                <Link 
                  href={`/app/profile/${selectedConversation.user.id}`}
                  className="font-medium hover:text-primary transition-colors"
                >
                  {selectedConversation.user.displayName}
                </Link>
              </div>

              {/* Video Call Button */}
              <button
                onClick={handleVideoCall}
                className="p-2 hover:bg-primary/10 rounded-full text-primary transition-colors"
                title="Video Call"
              >
                <Video className="h-5 w-5" />
              </button>

              {/* View Profile Button */}
              <Link
                href={`/app/profile/${selectedConversation.user.id}`}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                title="View Profile"
              >
                <User className="h-5 w-5" />
              </Link>

              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 hover:bg-muted rounded-md"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-md shadow-lg z-10"
                    >
                      <Link
                        href={`/app/profile/${selectedConversation.user.id}`}
                        onClick={() => setShowActions(false)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        View Profile
                      </Link>
                      <button
                        onClick={handleVideoCall}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Video className="h-4 w-4" />
                        Video Call
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setShowActions(false);
                          toast.success('Report feature coming soon');
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Flag className="h-4 w-4" />
                        Report User
                      </button>
                      <button
                        onClick={() => {
                          setShowActions(false);
                          toast.success('Block feature coming soon');
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                      >
                        <Ban className="h-4 w-4" />
                        Block User
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {messageList.map((message) => (
                    <div
                      key={message.id}
                      className={cn('flex', message.isFromMe ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2',
                          message.isFromMe
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={cn(
                            'text-xs mt-1',
                            message.isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}
                        >
                          {formatRelativeTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  isLoading={sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Send className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
              <p className="text-muted-foreground">
                Choose a connection from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Video Call Modal */}
      {selectedConversation && (
        <VideoCallModal
          isOpen={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          callee={selectedConversation.user}
        />
      )}
    </div>
  );
}
