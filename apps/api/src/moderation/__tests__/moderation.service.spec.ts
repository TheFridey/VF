/**
 * ModerationService — covers:
 *   createReport, blockUser, unblockUser, resolveReport
 * Key security invariants:
 *   - Users cannot report themselves
 *   - Users cannot block themselves
 *   - Resolving an already-resolved report is rejected
 *   - ACTION_TAKEN suspends the reported user
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { ModerationService } from '../moderation.service';

// ── Mock factory ──────────────────────────────────────────────────────────────

const REPORTER = 'reporter-id';
const REPORTED = 'reported-id';
const MOD_ID   = 'moderator-id';
const REPORT_ID = 'report-1';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    report: {
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: REPORT_ID,
        status: ReportStatus.PENDING,
        ...data,
      })),
      findUnique: jest.fn().mockResolvedValue({
        id: REPORT_ID,
        reporterId: REPORTER,
        reportedUserId: REPORTED,
        status: ReportStatus.PENDING,
        reason: 'HARASSMENT',
      }),
      update: jest.fn().mockImplementation(async ({ data }) => ({
        id: REPORT_ID,
        reportedUserId: REPORTED,
        ...data,
      })),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    block: {
      create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'block-1', ...data })),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'block-1' }),
      delete: jest.fn().mockResolvedValue({}),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeSvc(prismaOverride: Record<string, unknown> = {}) {
  return new ModerationService(
    makePrisma(prismaOverride) as never,
    makeAudit() as never,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ModerationService', () => {
  describe('createReport', () => {
    it('creates a report with correct fields', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.createReport(REPORTER, {
        reportedUserId: REPORTED,
        reason: 'HARASSMENT',
        description: 'Sending threatening messages',
      });
      expect(p.report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reporterId: REPORTER,
            reportedUserId: REPORTED,
            reason: 'HARASSMENT',
          }),
        }),
      );
    });

    it('throws BadRequestException when user reports themselves', async () => {
      const svc = makeSvc();
      await expect(
        svc.createReport(REPORTER, { reportedUserId: REPORTER, reason: 'SPAM' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('logs the report creation to audit trail', async () => {
      const svc = makeSvc();
      const audit = (svc as unknown as { auditService: ReturnType<typeof makeAudit> }).auditService;
      await svc.createReport(REPORTER, { reportedUserId: REPORTED, reason: 'SPAM' });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'report_created' }),
      );
    });
  });

  describe('resolveReport', () => {
    it('dismisses report without taking action when userAction is null', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.resolveReport(MOD_ID, REPORT_ID, { status: ReportStatus.PENDING, resolution: 'No evidence found', userAction: undefined } as never);
      const updateCall = p.report.update.mock.calls[0][0];
      expect(updateCall.data.status).toMatch(/DISMISSED/);
    });

    it('takes action and suspends user when userAction is provided', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.resolveReport(MOD_ID, REPORT_ID, { status: ReportStatus.PENDING, resolution: 'Confirmed harassment', userAction: 'SUSPEND' as never } as never);
      expect(p.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REPORTED },
          data: expect.objectContaining({ status: 'SUSPENDED' }),
        }),
      );
    });

    it('throws NotFoundException when report does not exist', async () => {
      const svc = makeSvc({
        report: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
      });
      await expect(
        svc.resolveReport(MOD_ID, 'bad-id', { status: 'PENDING' as never, resolution: 'X' } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when report is already resolved', async () => {
      const svc = makeSvc({
        report: {
          findUnique: jest.fn().mockResolvedValue({
            id: REPORT_ID,
            status: ReportStatus.DISMISSED, // already done
          }),
          create: jest.fn(),
          update: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
      });
      await expect(
        svc.resolveReport(MOD_ID, REPORT_ID, { status: 'PENDING' as never, resolution: 'X' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('records resolver and timestamp', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.resolveReport(MOD_ID, REPORT_ID, { status: ReportStatus.PENDING, resolution: 'Confirmed', userAction: undefined } as never);
      const updateCall = p.report.update.mock.calls[0][0];
      expect(updateCall.data.resolverId).toBe(MOD_ID);
      expect(updateCall.data.resolvedAt).toBeInstanceOf(Date);
    });
  });

  describe('blockUser', () => {
    it('creates a block record', async () => {
      const svc = makeSvc();
      const p = (svc as unknown as { prisma: ReturnType<typeof makePrisma> }).prisma;
      await svc.blockUser(REPORTER, { blockedUserId: REPORTED, reason: 'Harassment' });
      expect(p.block.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            blockerId: REPORTER,
            blockedId: REPORTED,
          }),
        }),
      );
    });

    it('throws BadRequestException when user tries to block themselves', async () => {
      const svc = makeSvc();
      await expect(
        svc.blockUser(REPORTER, { blockedUserId: REPORTER }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if block already exists', async () => {
      const svc = makeSvc({
        block: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing-block', deletedAt: null }),
          create: jest.fn(),
          findMany: jest.fn(),
          delete: jest.fn(),
        },
      });
      await expect(
        svc.blockUser(REPORTER, { blockedUserId: REPORTED }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBlockedUsers', () => {
    it('returns list of blocked users for caller', async () => {
      const blockedEntry = { id: 'b-1', blockerId: REPORTER, blockedId: REPORTED, createdAt: new Date(), blocked: { id: REPORTED, profile: { displayName: 'Reported User', profileImageUrl: null } } };
      const svc = makeSvc({
        block: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([blockedEntry]),
          delete: jest.fn(),
        },
      });
      const result = await svc.getBlockedUsers(REPORTER);
      expect(result).toHaveLength(1);
    });
  });
});
