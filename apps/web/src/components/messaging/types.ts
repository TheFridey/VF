export interface ConversationUser {
  id: string;
  displayName: string;
  photoUrl?: string;
}

export interface LastMessage {
  content: string;
  createdAt: string;
  isFromMe: boolean;
}

export interface Conversation {
  connectionId: string;
  connectionType: string;
  user: ConversationUser;
  lastMessage: LastMessage | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  isFromMe: boolean;
}
