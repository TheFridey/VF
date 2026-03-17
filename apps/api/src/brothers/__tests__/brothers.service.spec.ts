/**
 * BrothersService — covers:
 *   sendConnectionRequest: guards (self-connect, verification, duplicate, overlap score calc)
 *   getConnectionRequests: returns pending requests for the user
 *   respondToConnection: accept/decline flow
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BrothersService } from '../brothers.service';

// ── Constants ──────────────────────────────────────────────────────────────────

const U1 = 'user-1';
const U2 = 'user-2';
const U3_UNVERIFIED = 'user-3-unverified';
const CONN_ID = 'conn-abc';

// ── Mock factories ────────────────────────────────────────────────────────────

function makeVerifiedUser(id: string, hasServicePeriods = true) {
  return {
    id,
    role: 'VETERAN_VERIFIED',
    veteranDetails: {
      id: `det-${id}`,
      branch: 'ARMY',
      rank: 'Corporal',
      regiment: '1st Battalion',
      servicePeriods: hasServicePeriods
        ? [{ startDate: new Date('2010-01-01'), endDate: new Date('2014-01-01'), unit: 'A Coy' }]
        : [],
      deployments: ['Afghanistan'],
    },
    profile: { displayName: `User ${id}` },
  };
}

function makeUnverifiedUser(id: string) {
  return {
    id,
    role: 'VETERAN_UNVERIFIED',
    veteranDetails: null,
    profile: { displayName: 'Unverified' },
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    connection: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }) => ({ id: CONN_ID, ...data })),
      update: jest.fn().mockImplementation(async ({ data }) => ({ id: CONN_ID, ...data })),
      delete: jest.fn().mockResolvedValue({ id: CONN_ID }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        if (where.id === U1) return makeVerifiedUser(U1);
        if (where.id === U2) return makeVerifiedUser(U2);
        if (where.id === U3_UNVERIFIED) return makeUnverifiedUser(U3_UNVERIFIED);
        return null;
      }),
    },
    block: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

function makeRedis() {
  return {
    cacheGet: jest.fn().mockResolvedValue(null),
    cacheSet: jest.fn().mockResolvedValue(undefined),
    cacheInvalidate: jest.fn().mockResolvedValue(undefined),
  };
}

function makeSvc(prismaOverride: Record<string, unknown> = {}) {
  return new BrothersService(makePrisma(prismaOverride) as never, makeRedis() as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BrothersService', () => {
  describe('sendConnectionRequest', () => {
    it('throws BadRequestException when user tries to connect with themselves', async () => {
      const svc = makeSvc();
      await expect(svc.sendConnectionRequest(U1, U1)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when target user does not exist', async () => {
      const svc = makeSvc({
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
      await expect(svc.sendConnectionRequest(U1, 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when requesting user is not verified', async () => {
      const svc = makeSvc({
        user: {
          findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
            if (where.id === U3_UNVERIFIED) return makeUnverifiedUser(U3_UNVERIFIED);
            if (where.id === U2) return makeVerifiedUser(U2);
            return null;
          }),
        },
      });
      await expect(svc.sendConnectionRequest(U3_UNVERIFIED, U2)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when target user is not verified', async () => {
      const svc = makeSvc({
        user: {
          findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
            if (where.id === U1) return makeVerifiedUser(U1);
            if (where.id === U3_UNVERIFIED) return makeUnverifiedUser(U3_UNVERIFIED);
            return null;
          }),
        },
      });
      await expect(svc.sendConnectionRequest(U1, U3_UNVERIFIED)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when connection already exists', async () => {
      const svc = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue({ id: CONN_ID, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
      await expect(svc.sendConnectionRequest(U1, U2)).rejects.toThrow(BadRequestException);
    });

    it('creates connection with PENDING status when all guards pass', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.sendConnectionRequest(U1, U2);
      expect(p.connection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user1Id: U1,
            user2Id: U2,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('calculates an overlapScore on the connection', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.sendConnectionRequest(U1, U2);
      const createArg = p.connection.create.mock.calls[0][0].data;
      expect(typeof createArg.overlapScore).toBe('number');
    });
  });

  describe('getConnectionRequests', () => {
    it('returns pending requests where user is the recipient', async () => {
      const request = {
        id: CONN_ID,
        overlapScore: 0.7,
        createdAt: new Date(),
        status: 'PENDING',
        user1: {
          id: U1,
          profile: { displayName: 'User 1', profileImageUrl: null },
          veteranDetails: { branch: 'ARMY', rank: 'Corporal' },
        },
      };
      const svc = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([request]),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
      const result = await svc.getConnectionRequests(U2);
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].from.id).toBe(U1);
    });

    it('returns empty array when no pending requests', async () => {
      const svc = makeSvc();
      const result = await svc.getConnectionRequests(U2);
      expect(result.requests).toHaveLength(0);
    });
  });

  describe('respondToConnection', () => {
    it('updates status to ACTIVE on accept', async () => {
      const svc = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({ id: CONN_ID, user1Id: U1, user2Id: U2, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: CONN_ID, status: 'ACTIVE' }),
        },
      });
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.respondToRequest(U2, CONN_ID, true);
      expect(p.connection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('updates status to DECLINED on decline', async () => {
      const svc = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({ id: CONN_ID, user1Id: U1, user2Id: U2, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: CONN_ID, status: 'DECLINED' }),
          delete: jest.fn().mockResolvedValue({ id: CONN_ID }),
        },
      });
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.respondToRequest(U2, CONN_ID, false);
      expect(p.connection.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CONN_ID } }),
      );
    });

    it('throws NotFoundException when connection does not exist', async () => {
      const svc = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
        },
      });
      await expect(
        svc.respondToRequest(U2, 'no-such', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-recipient tries to respond', async () => {
      const svc = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({ id: CONN_ID, user1Id: U1, user2Id: U2, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      // U1 is the sender, not the recipient — should be rejected
      await expect(
        svc.respondToRequest(U1, CONN_ID, true),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
