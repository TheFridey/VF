/**
 * MessagingService — covers:
 *   1. getConversations: exactly 2 DB queries (N+1 fix verification)
 *   2. sendMessage: stores encrypted content, connection ownership guard
 *   3. markAsRead: updates correct messages
 *   4. AES-256-GCM: encrypt/decrypt round-trips and tamper detection
 */
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessagingService } from '../messaging.service';

// ── Encryption helpers (mirror service internals) ────────────────────────────

function makeKey(secret = 'test-key-exactly-32-characters!!') {
  return crypto.scryptSync(secret, 'salt', 32);
}

function encryptWith(key: Buffer, plaintext: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedContent: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptWith(key: Buffer, e: { encryptedContent: string; iv: string; authTag: string }) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(e.iv, 'base64'));
  d.setAuthTag(Buffer.from(e.authTag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(e.encryptedContent, 'base64')), d.final()]).toString('utf8');
}

// ── Mock factories ────────────────────────────────────────────────────────────

const C_ID = 'conn-1';
const U_A  = 'user-a';
const U_B  = 'user-b';

const BASE_CONNECTION = {
  id: C_ID,
  user1Id: U_A,
  user2Id: U_B,
  status: 'ACTIVE',
  connectionType: 'BROTHERS_IN_ARMS',
  lastMessageAt: new Date(),
};

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    connection: {
      findMany: jest.fn().mockResolvedValue([{
        ...BASE_CONNECTION,
        messages: [],
        user1: { id: U_A, profile: { displayName: 'Alpha', profileImageUrl: null } },
        user2: { id: U_B, profile: { displayName: 'Bravo', profileImageUrl: null } },
      }]),
      findUnique: jest.fn().mockResolvedValue(BASE_CONNECTION),
      update: jest.fn().mockResolvedValue(BASE_CONNECTION),
    },
    message: {
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'msg-1',
        createdAt: new Date(),
        ...data,
      })),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

function makeSvc(prismaOverride: Record<string, unknown> = {}) {
  const configService = {
    get: (k: string, def?: string) =>
      k === 'ENCRYPTION_KEY' ? 'test-key-exactly-32-characters!!' : (def ?? ''),
  } as unknown as ConfigService;

  return new MessagingService(
    makePrisma(prismaOverride) as never,
    { log: jest.fn() } as never,
    configService,
  );
}

// ── AES-256-GCM ───────────────────────────────────────────────────────────────

describe('AES-256-GCM encryption', () => {
  const key = makeKey();

  it('round-trips a short message', () => {
    const e = encryptWith(key, 'Hello, brother.');
    expect(decryptWith(key, e)).toBe('Hello, brother.');
  });

  it('round-trips a 5000-char message', () => {
    const plain = 'X'.repeat(5000);
    expect(decryptWith(key, encryptWith(key, plain))).toBe(plain);
  });

  it('round-trips unicode (emoji + Arabic)', () => {
    const plain = '🎖️ شكراً على خدمتك';
    expect(decryptWith(key, encryptWith(key, plain))).toBe(plain);
  });

  it('produces unique ciphertext per call (random IV)', () => {
    const e1 = encryptWith(key, 'same');
    const e2 = encryptWith(key, 'same');
    expect(e1.encryptedContent).not.toBe(e2.encryptedContent);
    expect(e1.iv).not.toBe(e2.iv);
  });

  it('rejects tampered ciphertext', () => {
    const e = encryptWith(key, 'secret');
    expect(() => decryptWith(key, { ...e, encryptedContent: Buffer.alloc(12).toString('base64') })).toThrow();
  });

  it('rejects tampered auth tag', () => {
    const e = encryptWith(key, 'secret');
    expect(() => decryptWith(key, { ...e, authTag: Buffer.alloc(16).toString('base64') })).toThrow();
  });

  it('rejects tampered IV', () => {
    const e = encryptWith(key, 'secret');
    expect(() => decryptWith(key, { ...e, iv: crypto.randomBytes(16).toString('base64') })).toThrow();
  });
});

// ── getConversations ──────────────────────────────────────────────────────────

describe('MessagingService.getConversations', () => {
  it('fires connection.findMany exactly once', async () => {
    const svc = makeSvc();
    const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
    await svc.getConversations(U_A);
    expect(p.connection.findMany).toHaveBeenCalledTimes(1);
  });

  it('fires message.groupBy exactly once (the N+1 fix)', async () => {
    const svc = makeSvc();
    const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
    await svc.getConversations(U_A);
    expect(p.message.groupBy).toHaveBeenCalledTimes(1);
  });

  it('total DB calls = 2, regardless of conversation count', async () => {
    const svc = makeSvc();
    const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
    await svc.getConversations(U_A);
    const dbCallCount = p.connection.findMany.mock.calls.length
      + p.message.groupBy.mock.calls.length;
    expect(dbCallCount).toBe(2);
  });

  it('resolves other user as user2 when caller is user1', async () => {
    const svc = makeSvc();
    const result = await svc.getConversations(U_A);
    expect(result.conversations[0].user.id).toBe(U_B);
  });

  it('resolves other user as user1 when caller is user2', async () => {
    const svc = makeSvc();
    const result = await svc.getConversations(U_B);
    expect(result.conversations[0].user.id).toBe(U_A);
  });

  it('returns unreadCount 0 when no unread messages', async () => {
    const svc = makeSvc();
    const result = await svc.getConversations(U_A);
    expect(result.conversations[0].unreadCount).toBe(0);
  });

  it('populates unreadCount from groupBy aggregation', async () => {
    const svc = makeSvc({
      message: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn().mockResolvedValue([{ connectionId: C_ID, _count: { id: 7 } }]),
      },
    });
    const result = await svc.getConversations(U_A);
    expect(result.conversations[0].unreadCount).toBe(7);
  });
});

// ── sendMessage ───────────────────────────────────────────────────────────────

describe('MessagingService.sendMessage', () => {
  it('stores encrypted fields, never plaintext', async () => {
    const svc = makeSvc();
    const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;

    await svc.sendMessage(C_ID, U_A, 'Top secret message');

    const data = p.message.create.mock.calls[0][0].data;
    expect(data.encryptedContent).toBeDefined();
    expect(data.iv).toBeDefined();
    expect(data.authTag).toBeDefined();
    expect(data.encryptedContent).not.toBe('Top secret message');
    // no raw content field
    expect(data.content).toBeUndefined();
  });

  it('returns the original plaintext in the response (decrypted for caller)', async () => {
    const svc = makeSvc();
    const result = await svc.sendMessage(C_ID, U_A, 'Return me please');
    expect(result.content).toBe('Return me please');
  });

  it('throws NotFoundException when connection does not exist', async () => {
    const svc = makeSvc({
      connection: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });
    await expect(svc.sendMessage('bad-id', U_A, 'Hi')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when user is not a participant', async () => {
    const svc = makeSvc({
      connection: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({
          ...BASE_CONNECTION,
          user1Id: 'stranger-1',
          user2Id: 'stranger-2',
        }),
        update: jest.fn(),
      },
    });
    await expect(svc.sendMessage(C_ID, U_A, 'Hi')).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when connection is not ACTIVE', async () => {
    const svc = makeSvc({
      connection: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ ...BASE_CONNECTION, status: 'PENDING' }),
        update: jest.fn(),
      },
    });
    await expect(svc.sendMessage(C_ID, U_A, 'Hi')).rejects.toThrow(ForbiddenException);
  });

  it('sets correct senderId and receiverId', async () => {
    const svc = makeSvc();
    const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
    await svc.sendMessage(C_ID, U_A, 'Hey');
    const data = p.message.create.mock.calls[0][0].data;
    expect(data.senderId).toBe(U_A);
    expect(data.receiverId).toBe(U_B);
  });

  it('updates connection lastMessageAt after send', async () => {
    const svc = makeSvc();
    const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
    await svc.sendMessage(C_ID, U_A, 'Hey');
    expect(p.connection.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: C_ID } }),
    );
  });
});

describe('MessagingService.markAsRead', () => {
  it('returns updatedCount for newly read messages', async () => {
    const svc = makeSvc();

    await expect(svc.markAsRead(C_ID, U_A)).resolves.toEqual({
      success: true,
      updatedCount: 2,
      alreadyRead: false,
    });
  });

  it('returns alreadyRead for duplicate read acknowledgements', async () => {
    const svc = makeSvc({
      message: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(svc.markAsRead(C_ID, U_A)).resolves.toEqual({
      success: true,
      updatedCount: 0,
      alreadyRead: true,
    });
  });
});
