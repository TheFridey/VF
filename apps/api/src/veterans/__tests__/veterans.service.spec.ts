/**
 * VeteransService — covers all CRUD operations:
 *   getVeteranDetails, updateVeteranDetails,
 *   addServicePeriod, updateServicePeriod, deleteServicePeriod
 * Ownership checks are critical: a user must not be able to
 * modify another user's service period.
 */
import { NotFoundException } from '@nestjs/common';
import { VeteransService } from '../veterans.service';
import { MilitaryBranch } from '@prisma/client';

// ── Mock factory ──────────────────────────────────────────────────────────────

const OWNER_ID    = 'owner-user';
const STRANGER_ID = 'stranger-user';
const PERIOD_ID   = 'period-1';
const DETAILS_ID  = 'details-1';

const BASE_DETAILS = {
  id: DETAILS_ID,
  userId: OWNER_ID,
  branch: MilitaryBranch.ARMY,
  rank: 'Sergeant',
  regiment: '1st Battalion',
  servicePeriods: [],
};

const BASE_PERIOD = {
  id: PERIOD_ID,
  veteranDetailsId: DETAILS_ID,
  branch: MilitaryBranch.ARMY,
  startDate: new Date('2010-01-01'),
  endDate: new Date('2014-01-01'),
  unit: 'A Company',
  dutyStation: 'Camp Bastion',
  veteranDetails: { userId: OWNER_ID },
};

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    veteranDetails: {
      findUnique: jest.fn().mockResolvedValue(BASE_DETAILS),
      create: jest.fn().mockResolvedValue(BASE_DETAILS),
      update: jest.fn().mockImplementation(async ({ data }) => ({ ...BASE_DETAILS, ...data })),
    },
    servicePeriod: {
      create: jest.fn().mockImplementation(async ({ data }) => ({ id: PERIOD_ID, ...data })),
      findUnique: jest.fn().mockResolvedValue(BASE_PERIOD),
      update: jest.fn().mockImplementation(async ({ data }) => ({ ...BASE_PERIOD, ...data })),
      delete: jest.fn().mockResolvedValue(BASE_PERIOD),
    },
    ...overrides,
  };
}

function makeSvc(prismaOverride: Record<string, unknown> = {}) {
  return new VeteransService(makePrisma(prismaOverride) as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VeteransService', () => {
  describe('getVeteranDetails', () => {
    it('returns existing details', async () => {
      const svc = makeSvc();
      const result = await svc.getVeteranDetails(OWNER_ID);
      expect(result.userId).toBe(OWNER_ID);
    });

    it('creates details if they do not exist yet', async () => {
      const svc = makeSvc({
        veteranDetails: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ ...BASE_DETAILS }),
          update: jest.fn(),
        },
      });
      const result = await svc.getVeteranDetails(OWNER_ID);
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      expect(p.veteranDetails.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: OWNER_ID } }),
      );
      expect(result.userId).toBe(OWNER_ID);
    });
  });

  describe('updateVeteranDetails', () => {
    it('updates rank', async () => {
      const svc = makeSvc();
      const result = await svc.updateVeteranDetails(OWNER_ID, {
        rank: 'Staff Sergeant',
      });
      expect(result.rank).toBe('Staff Sergeant');
    });

    it('updates branch', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.updateVeteranDetails(OWNER_ID, { branch: MilitaryBranch.NAVY });
      const updateCall = p.veteranDetails.update.mock.calls[0][0];
      expect(updateCall.data.branch).toBe(MilitaryBranch.NAVY);
    });

    it('creates veteranDetails record if missing', async () => {
      const svc = makeSvc({
        veteranDetails: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(BASE_DETAILS),
          update: jest.fn().mockResolvedValue(BASE_DETAILS),
        },
      });
      await svc.updateVeteranDetails(OWNER_ID, { rank: 'Corporal' });
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      expect(p.veteranDetails.create).toHaveBeenCalled();
    });
  });

  describe('addServicePeriod', () => {
    it('creates a service period with correct dates', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.addServicePeriod(OWNER_ID, {
        branch: MilitaryBranch.ARMY,
        startMonth: 3,
        startYear: 2010,
        endMonth: 6,
        endYear: 2014,
        unit: 'Alpha Company',
        location: 'Helmand Province',
      });
      const data = p.servicePeriod.create.mock.calls[0][0].data;
      expect(data.startDate.getFullYear()).toBe(2010);
      expect(data.startDate.getMonth()).toBe(2); // 0-indexed
      expect(data.endDate?.getFullYear()).toBe(2014);
      expect(data.unit).toBe('Alpha Company');
      expect(data.dutyStation).toBe('Helmand Province');
    });

    it('creates period with null endDate when endYear not provided', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.addServicePeriod(OWNER_ID, {
        branch: MilitaryBranch.ARMY,
        startMonth: 1,
        startYear: 2020,
        endMonth: 1,
        endYear: undefined as unknown as number,
      });
      const data = p.servicePeriod.create.mock.calls[0][0].data;
      expect(data.endDate).toBeNull();
    });
  });

  describe('updateServicePeriod', () => {
    it('updates unit and location', async () => {
      const svc = makeSvc();
      const result = await svc.updateServicePeriod(OWNER_ID, PERIOD_ID, {
        unit: 'Bravo Company',
        location: 'Cyprus',
      });
      expect(result.unit).toBe('Bravo Company');
    });

    it('throws NotFoundException when period does not exist', async () => {
      const svc = makeSvc({
        servicePeriod: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      await expect(
        svc.updateServicePeriod(OWNER_ID, 'missing', { unit: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when period belongs to a different user (ownership check)', async () => {
      const svc = makeSvc({
        servicePeriod: {
          findUnique: jest.fn().mockResolvedValue({
            ...BASE_PERIOD,
            veteranDetails: { userId: STRANGER_ID }, // different owner
          }),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      await expect(
        svc.updateServicePeriod(OWNER_ID, PERIOD_ID, { unit: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteServicePeriod', () => {
    it('deletes when user is the owner', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.deleteServicePeriod(OWNER_ID, PERIOD_ID);
      expect(p.servicePeriod.delete).toHaveBeenCalledWith({ where: { id: PERIOD_ID } });
    });

    it('throws NotFoundException when period does not exist', async () => {
      const svc = makeSvc({
        servicePeriod: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      await expect(svc.deleteServicePeriod(OWNER_ID, 'no-such')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when stranger tries to delete', async () => {
      const svc = makeSvc({
        servicePeriod: {
          findUnique: jest.fn().mockResolvedValue({
            ...BASE_PERIOD,
            veteranDetails: { userId: STRANGER_ID },
          }),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
      await expect(
        svc.deleteServicePeriod(OWNER_ID, PERIOD_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
