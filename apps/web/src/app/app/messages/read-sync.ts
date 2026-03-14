export interface ReadSyncMessage {
  id: string;
  isFromMe: boolean;
  readAt: string | null;
}

export function getLatestUnreadIncomingMessageId(messages: ReadSyncMessage[]) {
  const unreadIncoming = messages.filter((message) => !message.isFromMe && !message.readAt);
  return unreadIncoming.length > 0 ? unreadIncoming[unreadIncoming.length - 1].id : null;
}

export function buildReadSyncKey(
  connectionId: string | null,
  unreadCount: number,
  latestUnreadMessageId: string | null,
) {
  if (!connectionId) {
    return null;
  }

  if (latestUnreadMessageId) {
    return `${connectionId}:${latestUnreadMessageId}`;
  }

  if (unreadCount > 0) {
    return `${connectionId}:conversation-unread`;
  }

  return null;
}

export function shouldIssueReadSync({
  connectionId,
  unreadCount,
  latestUnreadMessageId,
  inFlight,
  lastSyncedKey,
}: {
  connectionId: string | null;
  unreadCount: number;
  latestUnreadMessageId: string | null;
  inFlight: boolean;
  lastSyncedKey: string | null;
}) {
  const syncKey = buildReadSyncKey(connectionId, unreadCount, latestUnreadMessageId);

  if (!syncKey || inFlight) {
    return { shouldSync: false, syncKey };
  }

  return {
    shouldSync: syncKey !== lastSyncedKey,
    syncKey,
  };
}

