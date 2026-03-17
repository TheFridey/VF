import { describe, expect, it } from 'vitest';
import { buildReadSyncKey, getLatestUnreadIncomingMessageId, shouldIssueReadSync } from '@/components/messaging/read-sync';

describe('message read sync helpers', () => {
  it('returns the latest unread incoming message id', () => {
    expect(
      getLatestUnreadIncomingMessageId([
        { id: 'msg-1', isFromMe: true, readAt: null },
        { id: 'msg-2', isFromMe: false, readAt: null },
        { id: 'msg-3', isFromMe: false, readAt: '2026-03-14T16:00:00.000Z' },
        { id: 'msg-4', isFromMe: false, readAt: null },
      ]),
    ).toBe('msg-4');
  });

  it('falls back to a conversation-level sync key when unread counts exist before message data updates', () => {
    expect(buildReadSyncKey('conn-1', 2, null)).toBe('conn-1:conversation-unread');
  });

  it('does not sync when nothing is unread', () => {
    expect(
      shouldIssueReadSync({
        connectionId: 'conn-1',
        unreadCount: 0,
        latestUnreadMessageId: null,
        inFlight: false,
        lastSyncedKey: null,
      }),
    ).toEqual({ shouldSync: false, syncKey: null });
  });

  it('does not resync while a request is in flight or when the key already matched', () => {
    expect(
      shouldIssueReadSync({
        connectionId: 'conn-1',
        unreadCount: 1,
        latestUnreadMessageId: 'msg-9',
        inFlight: true,
        lastSyncedKey: null,
      }),
    ).toEqual({ shouldSync: false, syncKey: 'conn-1:msg-9' });

    expect(
      shouldIssueReadSync({
        connectionId: 'conn-1',
        unreadCount: 1,
        latestUnreadMessageId: 'msg-9',
        inFlight: false,
        lastSyncedKey: 'conn-1:msg-9',
      }),
    ).toEqual({ shouldSync: false, syncKey: 'conn-1:msg-9' });
  });

  it('syncs once when a new unread message appears', () => {
    expect(
      shouldIssueReadSync({
        connectionId: 'conn-1',
        unreadCount: 1,
        latestUnreadMessageId: 'msg-10',
        inFlight: false,
        lastSyncedKey: 'conn-1:msg-9',
      }),
    ).toEqual({ shouldSync: true, syncKey: 'conn-1:msg-10' });
  });
});
