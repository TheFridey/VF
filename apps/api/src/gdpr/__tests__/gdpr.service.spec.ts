/**
 * GdprService — covers:
 *   exportUserData: returns sanitized user data, logs the request
 *   requestDataDeletion: requires password verification, runs full transaction
 */
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GdprService } from '../gdpr.service';
import * as argon2 from 'argon2';

// ── Mock factory ──────────────────────────────────────────────────────────────

const USER_ID = 'user-gdpr';

async function makeBaseUser(password = 'correct-password') {
  const passwordHash = await argon2.hash(password);
  return {
    id: USER_ID,
    email: 'test@veteranfinder.co.uk',
    passwordHash,
    refreshTokenHash: 'some-hash',
    emailVerificationToken: 'some-token',
    passwordResetToken: null,
    status: 'ACTIVE',
    role: 'VETERAN_VERIFIED',
    profile: { displayName: 'Test User' },
    veteranDetails: { branch: 'ARMY', servicePeriods: [] },
    verificationRequests: [],
    blocks: [],
    reportsMade: [],
  };
}

function makePrisma(user: Record<string, unknown> | null, txOverride?: Record<string, unknown>) {
  const txClient = {
    message: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    connection: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    block: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    report: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    passwordHistory: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    membership: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    auditLog: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    profile: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    verificationRequest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    user: { update: jest.fn().mockResolvedValue({}), delete: jest.fn().mockResolvedValue({}) },
    ...txOverride,
  };

  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: typeof txClient) => Promise<void>) => {
      await fn(txClient);
    }),
    _tx: txClient,
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    getUserLogs: jest.fn().mockResolvedValue([]),
  };
}

function makeSvc(user: Record<string, unknown> | null) {
  const prisma = makePrisma(user);
  const audit = makeAudit();
  return {
    svc: new GdprService(prisma as never, audit as never),
    prisma,
    audit,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GdprService', () => {
  describe('exportUserData', () => {
    it('throws NotFoundException for unknown user', async () => {
      const { svc } = makeSvc(null);
      await expect(svc.exportUserData('no-such-user')).rejects.toThrow(NotFoundException);
    });

    it('returns sanitized user — no passwordHash or tokens in export', async () => {
      const user = await makeBaseUser();
      const { svc } = makeSvc(user as Record<string, unknown>);
      const result = await svc.exportUserData(USER_ID);
      const u = result.user as Record<string, unknown>;
      expect(u.passwordHash).toBeUndefined();
      expect(u.refreshTokenHash).toBeUndefined();
      expect(u.emailVerificationToken).toBeUndefined();
    });

    it('includes non-sensitive user fields', async () => {
      const user = await makeBaseUser();
      const { svc } = makeSvc(user as Record<string, unknown>);
      const result = await svc.exportUserData(USER_ID);
      expect(result.user.id).toBe(USER_ID);
      expect(result.user.email).toBe('test@veteranfinder.co.uk');
    });

    it('logs the export request to audit trail', async () => {
      const user = await makeBaseUser();
      const { svc, audit } = makeSvc(user as Record<string, unknown>);
      await svc.exportUserData(USER_ID);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'data_export_requested' }),
      );
    });

    it('includes exportedAt timestamp', async () => {
      const user = await makeBaseUser();
      const { svc } = makeSvc(user as Record<string, unknown>);
      const result = await svc.exportUserData(USER_ID);
      expect(result.exportedAt).toBeDefined();
      expect(new Date(result.exportedAt).getFullYear()).toBeGreaterThanOrEqual(2025);
    });
  });

  describe('requestDataDeletion', () => {
    it('throws NotFoundException for unknown user', async () => {
      const { svc } = makeSvc(null);
      await expect(svc.requestDataDeletion('no-such', 'password')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when password is wrong', async () => {
      const user = await makeBaseUser('correct-password');
      const { svc } = makeSvc(user as Record<string, unknown>);
      await expect(
        svc.requestDataDeletion(USER_ID, 'wrong-password'),
      ).rejects.toThrow(BadRequestException);
    });

    it('schedules deletion and updates user status when password is correct', async () => {
      const user = await makeBaseUser('correct-password');
      const { svc, prisma } = makeSvc(user as Record<string, unknown>);
      const result = await svc.requestDataDeletion(USER_ID, 'correct-password');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: USER_ID },
          data: expect.objectContaining({ status: 'PENDING_DELETION' }),
        }),
      );
      expect(result.scheduledDeletionAt).toBeInstanceOf(Date);
    });

    it('logs the deletion request to audit trail', async () => {
      const user = await makeBaseUser('correct-password');
      const { svc, audit } = makeSvc(user as Record<string, unknown>);
      await svc.requestDataDeletion(USER_ID, 'correct-password');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: expect.stringContaining('delet') }),
      );
    });
  });
});
