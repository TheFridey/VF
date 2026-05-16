import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BrothersService } from '../brothers.service';

const U1 = 'user-1';
const U2 = 'user-2';
const U3_UNVERIFIED = 'user-3-unverified';
const CONN_ID = 'conn-abc';

function makeVerifiedUser(
  id: string,
  overrides: Partial<{
    branch: string;
    regiment: string | null;
    deployments: string[];
    dutyStations: string[];
    servicePeriods: Array<{
      startDate: Date;
      endDate: Date | null;
      unit: string | null;
      dutyStation: string | null;
    }>;
  }> = {},
) {
  return {
    id,
    role: 'VETERAN_VERIFIED',
    veteranDetails: {
      id: `det-${id}`,
      branch: overrides.branch ?? 'BRITISH_ARMY',
      rank: 'Corporal',
      regiment: overrides.regiment ?? '1 para',
      servicePeriods: overrides.servicePeriods ?? [
        {
          startDate: new Date('2010-01-01'),
          endDate: new Date('2014-01-01'),
          unit: 'A Company 1 Para',
          dutyStation: 'Colchester',
        },
      ],
      deployments: overrides.deployments ?? ['Afghanistan'],
      dutyStations: overrides.dutyStations ?? ['Colchester'],
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
      findMany: jest.fn().mockResolvedValue([]),
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
  return new BrothersService(
    makePrisma(prismaOverride) as never,
    makeRedis() as never,
    {
      notifyConnectionRequest: jest.fn().mockResolvedValue(undefined),
      notifyNewConnection: jest.fn().mockResolvedValue(undefined),
    } as never,
  );
}

type BrothersServiceInternals = {
  calculateOverlapScore: (
    user1: ReturnType<typeof makeVerifiedUser>,
    user2: ReturnType<typeof makeVerifiedUser>,
  ) => number;
  getOverlapReasons: (
    user1: ReturnType<typeof makeVerifiedUser>,
    user2: ReturnType<typeof makeVerifiedUser>,
  ) => string[];
};

describe('BrothersService', () => {
  describe('sendConnectionRequest', () => {
    it('throws BadRequestException when user tries to connect with themselves', async () => {
      const service = makeSvc();
      await expect(service.sendConnectionRequest(U1, U1)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      const service = makeSvc({
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });

      await expect(service.sendConnectionRequest(U1, 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the requesting user is not verified', async () => {
      const service = makeSvc({
        user: {
          findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
            if (where.id === U3_UNVERIFIED) return makeUnverifiedUser(U3_UNVERIFIED);
            if (where.id === U2) return makeVerifiedUser(U2);
            return null;
          }),
        },
      });

      await expect(service.sendConnectionRequest(U3_UNVERIFIED, U2)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the target user is not verified', async () => {
      const service = makeSvc({
        user: {
          findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
            if (where.id === U1) return makeVerifiedUser(U1);
            if (where.id === U3_UNVERIFIED) return makeUnverifiedUser(U3_UNVERIFIED);
            return null;
          }),
        },
      });

      await expect(service.sendConnectionRequest(U1, U3_UNVERIFIED)).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when a connection already exists', async () => {
      const service = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue({ id: CONN_ID, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn(),
        },
      });

      await expect(service.sendConnectionRequest(U1, U2)).rejects.toThrow(BadRequestException);
    });

    it('creates a pending connection when all guards pass', async () => {
      const service = makeSvc();
      const prisma = (service as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;

      await service.sendConnectionRequest(U1, U2);

      expect(prisma.connection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user1Id: U1,
            user2Id: U2,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('stores an overlapScore on the connection', async () => {
      const service = makeSvc();
      const prisma = (service as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;

      await service.sendConnectionRequest(U1, U2);

      const createArg = prisma.connection.create.mock.calls[0][0].data;
      expect(typeof createArg.overlapScore).toBe('number');
    });
  });

  describe('getConnectionRequests', () => {
    it('returns pending requests where the user is the recipient', async () => {
      const request = {
        id: CONN_ID,
        overlapScore: 0.7,
        createdAt: new Date(),
        status: 'PENDING',
        user1: {
          id: U1,
          profile: { displayName: 'User 1', profileImageUrl: null },
          veteranDetails: { branch: 'BRITISH_ARMY', rank: 'Corporal', servicePeriods: [] },
        },
      };

      const service = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([request]),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
        },
      });

      const result = await service.getConnectionRequests(U2);
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].from.id).toBe(U1);
    });

    it('returns an empty array when no pending requests exist', async () => {
      const service = makeSvc();
      const result = await service.getConnectionRequests(U2);
      expect(result.requests).toHaveLength(0);
    });
  });

  describe('respondToRequest', () => {
    it('updates status to ACTIVE on accept', async () => {
      const service = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({ id: CONN_ID, user1Id: U1, user2Id: U2, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: CONN_ID, status: 'ACTIVE' }),
        },
      });

      const prisma = (service as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await service.respondToRequest(U2, CONN_ID, true);

      expect(prisma.connection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('deletes the request on decline', async () => {
      const service = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({ id: CONN_ID, user1Id: U1, user2Id: U2, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: CONN_ID, status: 'DECLINED' }),
          delete: jest.fn().mockResolvedValue({ id: CONN_ID }),
        },
      });

      const prisma = (service as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await service.respondToRequest(U2, CONN_ID, false);

      expect(prisma.connection.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CONN_ID } }),
      );
    });

    it('throws NotFoundException when the request does not exist', async () => {
      const service = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
        },
      });

      await expect(service.respondToRequest(U2, 'no-such', true)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when a non-recipient tries to respond', async () => {
      const service = makeSvc({
        connection: {
          findMany: jest.fn().mockResolvedValue([]),
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({ id: CONN_ID, user1Id: U1, user2Id: U2, status: 'PENDING' }),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });

      await expect(service.respondToRequest(U1, CONN_ID, true)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('overlap scoring hardening', () => {
    it('does not inflate overlap scores from duplicate deployment aliases', () => {
      const service = makeSvc();
      const internals = service as unknown as BrothersServiceInternals;

      const baseLeft = makeVerifiedUser(U1, {
        deployments: ['Helmand'],
        dutyStations: [],
        servicePeriods: [],
      });
      const baseRight = makeVerifiedUser(U2, {
        deployments: ['Afghanistan'],
        dutyStations: [],
        servicePeriods: [],
      });
      const duplicatedLeft = makeVerifiedUser(U1, {
        deployments: ['Helmand', 'Camp Bastion', 'Operation Herrick'],
        dutyStations: [],
        servicePeriods: [],
      });
      const duplicatedRight = makeVerifiedUser(U2, {
        deployments: ['Afghanistan', 'Op Herrick'],
        dutyStations: [],
        servicePeriods: [],
      });

      const baseScore = internals.calculateOverlapScore(baseLeft, baseRight);
      const duplicateScore = internals.calculateOverlapScore(duplicatedLeft, duplicatedRight);

      expect(duplicateScore).toBe(baseScore);
    });

    it('prefers strong overlapping unit matches over branch-only matches', () => {
      const service = makeSvc();
      const internals = service as unknown as BrothersServiceInternals;

      const weakMatchLeft = makeVerifiedUser(U1, {
        deployments: [],
        dutyStations: [],
        servicePeriods: [],
      });
      const weakMatchRight = makeVerifiedUser(U2, {
        deployments: [],
        dutyStations: [],
        servicePeriods: [],
      });
      const strongMatchLeft = makeVerifiedUser(U1);
      const strongMatchRight = makeVerifiedUser(U2, {
        regiment: '1st Battalion Parachute Regiment',
        deployments: ['Helmand'],
        dutyStations: ['Colchester'],
        servicePeriods: [
          {
            startDate: new Date('2011-01-01'),
            endDate: new Date('2013-01-01'),
            unit: '1 PARA A Coy',
            dutyStation: 'Colchester Garrison',
          },
        ],
      });

      const weakScore = internals.calculateOverlapScore(weakMatchLeft, weakMatchRight);
      const strongScore = internals.calculateOverlapScore(strongMatchLeft, strongMatchRight);

      expect(strongScore).toBeGreaterThan(weakScore);
      expect(strongScore).toBeGreaterThanOrEqual(60);
    });

    it('dedupes repeated overlap reasons for the same theatre', () => {
      const service = makeSvc();
      const internals = service as unknown as BrothersServiceInternals;

      const left = makeVerifiedUser(U1, {
        regiment: null,
        deployments: ['Helmand', 'Camp Bastion'],
        dutyStations: [],
        servicePeriods: [],
      });
      const right = makeVerifiedUser(U2, {
        regiment: null,
        deployments: ['Afghanistan', 'Op Herrick'],
        dutyStations: [],
        servicePeriods: [],
      });

      const reasons = internals.getOverlapReasons(left, right);
      const deploymentReasons = reasons.filter((reason) => reason.includes('Both deployed to Afghanistan'));

      expect(deploymentReasons).toHaveLength(1);
    });
  });
});
