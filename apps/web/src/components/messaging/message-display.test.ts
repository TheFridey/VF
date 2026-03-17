import { describe, expect, it } from 'vitest';
import { dedupeMessagesForDisplay } from './message-display';

describe('dedupeMessagesForDisplay', () => {
  it('collapses adjacent historical duplicates with the same sender and content', () => {
    const base = new Date('2026-03-14T10:00:00.000Z').toISOString();
    const plusFiveMinutes = new Date('2026-03-14T10:05:00.000Z').toISOString();

    const deduped = dedupeMessagesForDisplay([
      {
        id: 'm1',
        connectionId: 'c1',
        senderId: 'u1',
        content: 'Will do! Looking forward to it.',
        createdAt: base,
        readAt: base,
        isFromMe: true,
      },
      {
        id: 'm2',
        connectionId: 'c1',
        senderId: 'u1',
        content: 'Will do! Looking forward to it.',
        createdAt: plusFiveMinutes,
        readAt: plusFiveMinutes,
        isFromMe: true,
      },
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('m1');
  });

  it('collapses repeated older seeded history even when the duplicate is days apart', () => {
    const deduped = dedupeMessagesForDisplay([
      {
        id: 'm1',
        connectionId: 'c1',
        senderId: 'u1',
        content: "I'm in San Diego so not too far. Would definitely be down to visit.",
        createdAt: '2026-03-10T10:00:00.000Z',
        readAt: '2026-03-10T10:00:00.000Z',
        isFromMe: true,
      },
      {
        id: 'm2',
        connectionId: 'c1',
        senderId: 'u2',
        content: 'Awesome! We do a monthly veteran meetup too - good for networking.',
        createdAt: '2026-03-11T10:00:00.000Z',
        readAt: '2026-03-11T10:00:00.000Z',
        isFromMe: false,
      },
      {
        id: 'm3',
        connectionId: 'c1',
        senderId: 'u1',
        content: "I'm in San Diego so not too far. Would definitely be down to visit.",
        createdAt: '2026-03-15T10:00:00.000Z',
        readAt: '2026-03-15T10:00:00.000Z',
        isFromMe: true,
      },
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped.map((message) => message.id)).toEqual(['m1', 'm2']);
  });

  it('keeps recent repeated messages so live chat is not collapsed', () => {
    const now = new Date();
    const first = new Date(now.getTime() - 10_000).toISOString();
    const second = new Date(now.getTime() - 5_000).toISOString();

    const deduped = dedupeMessagesForDisplay([
      {
        id: 'm1',
        connectionId: 'c1',
        senderId: 'u1',
        content: 'ok',
        createdAt: first,
        readAt: null,
        isFromMe: true,
      },
      {
        id: 'm2',
        connectionId: 'c1',
        senderId: 'u1',
        content: 'ok',
        createdAt: second,
        readAt: null,
        isFromMe: true,
      },
    ]);

    expect(deduped).toHaveLength(2);
  });

  it('keeps older repeated messages from different senders', () => {
    const deduped = dedupeMessagesForDisplay([
      {
        id: 'm1',
        connectionId: 'c1',
        senderId: 'u1',
        content: 'See you there.',
        createdAt: '2026-03-10T10:00:00.000Z',
        readAt: '2026-03-10T10:00:00.000Z',
        isFromMe: true,
      },
      {
        id: 'm2',
        connectionId: 'c1',
        senderId: 'u2',
        content: 'See you there.',
        createdAt: '2026-03-12T10:00:00.000Z',
        readAt: '2026-03-12T10:00:00.000Z',
        isFromMe: false,
      },
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped.map((message) => message.id)).toEqual(['m1', 'm2']);
  });
});
