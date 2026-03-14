/**
 * Account lockout — verifies the full lockout lifecycle:
 * failed attempts → lockout → retry after window → unlock.
 * Also covers the 30-minute reset window for stale attempts.
 */
import { PasswordSecurityService } from '../password-security.service';
import { ConfigService } from '@nestjs/config';

// ── Minimal stub ──────────────────────────────────────────────────────────────

class MockConfigService {
  get(key: string, def?: string): string {
    if (key === 'PASSWORD_PEPPER') return 'test-pepper-value-that-is-32-chars!!';
    return def ?? '';
  }
}

const mockPrisma = {
  passwordHistory: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
  },
};

function makeService() {
  return new PasswordSecurityService(
    new MockConfigService() as unknown as ConfigService,
    mockPrisma as never,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Account Lockout', () => {
  let svc: PasswordSecurityService;

  beforeEach(() => {
    svc = makeService();
    jest.clearAllMocks();
  });

  // ── isAccountLocked ─────────────────────────────────────────────────────────

  describe('isAccountLocked', () => {
    it('returns not locked when lockedUntil is null', () => {
      const result = svc.isAccountLocked({
        lockedUntil: null,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
      });
      expect(result.locked).toBe(false);
    });

    it('returns locked when lockedUntil is in the future', () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      const result = svc.isAccountLocked({
        lockedUntil: future,
        failedLoginAttempts: 5,
        lastFailedLoginAt: new Date(),
      });
      expect(result.locked).toBe(true);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('returns not locked when lockedUntil has passed', () => {
      const past = new Date(Date.now() - 1000);
      const result = svc.isAccountLocked({
        lockedUntil: past,
        failedLoginAttempts: 5,
        lastFailedLoginAt: new Date(),
      });
      expect(result.locked).toBe(false);
    });

    it('retryAfterMs is approximately 15 minutes for fresh lock', () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const result = svc.isAccountLocked({
        lockedUntil,
        failedLoginAttempts: 5,
        lastFailedLoginAt: new Date(),
      });
      expect(result.retryAfterMs).toBeGreaterThan(14 * 60 * 1000);
      expect(result.retryAfterMs).toBeLessThanOrEqual(15 * 60 * 1000 + 100);
    });
  });

  // ── getFailedAttemptUpdate ──────────────────────────────────────────────────

  describe('getFailedAttemptUpdate', () => {
    it('increments attempt count from 0 to 1', () => {
      const update = svc.getFailedAttemptUpdate(0, null);
      expect(update.failedLoginAttempts).toBe(1);
      expect(update.lockedUntil).toBeNull();
    });

    it('increments attempt count from 3 to 4', () => {
      const recent = new Date(Date.now() - 60_000); // 1 min ago
      const update = svc.getFailedAttemptUpdate(3, recent);
      expect(update.failedLoginAttempts).toBe(4);
      expect(update.lockedUntil).toBeNull();
    });

    it('sets lockedUntil on 5th failure', () => {
      const recent = new Date(Date.now() - 60_000);
      const update = svc.getFailedAttemptUpdate(4, recent);
      expect(update.failedLoginAttempts).toBe(5);
      expect(update.lockedUntil).toBeInstanceOf(Date);
      expect(update.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('locks immediately if 4 attempts already and lastFailed is recent', () => {
      const recent = new Date(Date.now() - 5_000); // 5 seconds ago
      const update = svc.getFailedAttemptUpdate(4, recent);
      expect(update.lockedUntil).not.toBeNull();
    });

    it('resets count after 30-minute quiet window', () => {
      const stale = new Date(Date.now() - 31 * 60 * 1000); // 31 min ago
      const update = svc.getFailedAttemptUpdate(4, stale);
      expect(update.failedLoginAttempts).toBe(1); // reset to 1
      expect(update.lockedUntil).toBeNull();      // no lock
    });

    it('records lastFailedLoginAt as current time', () => {
      const before = Date.now();
      const update = svc.getFailedAttemptUpdate(0, null);
      expect(update.lastFailedLoginAt.getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  // ── getSuccessfulLoginUpdate ────────────────────────────────────────────────

  describe('getSuccessfulLoginUpdate', () => {
    it('clears all lockout fields on success', () => {
      const update = svc.getSuccessfulLoginUpdate();
      expect(update.failedLoginAttempts).toBe(0);
      expect(update.lockedUntil).toBeNull();
      expect(update.lastFailedLoginAt).toBeNull();
    });
  });

  // ── End-to-end lockout simulation ──────────────────────────────────────────

  describe('lockout lifecycle (simulated)', () => {
    it('locks after 5 consecutive failures then clears on success', () => {
      let state = {
        failedLoginAttempts: 0,
        lockedUntil: null as Date | null,
        lastFailedLoginAt: null as Date | null,
      };

      // 4 failures — no lock yet
      for (let i = 0; i < 4; i++) {
        const u = svc.getFailedAttemptUpdate(
          state.failedLoginAttempts,
          state.lastFailedLoginAt,
        );
        state = { ...state, ...u };
        expect(svc.isAccountLocked(state).locked).toBe(false);
      }

      // 5th failure — locks
      const u5 = svc.getFailedAttemptUpdate(state.failedLoginAttempts, state.lastFailedLoginAt);
      state = { ...state, ...u5 };
      expect(svc.isAccountLocked(state).locked).toBe(true);

      // Successful login — clears everything
      const success = svc.getSuccessfulLoginUpdate();
      state = { ...state, ...success };
      expect(svc.isAccountLocked(state).locked).toBe(false);
      expect(state.failedLoginAttempts).toBe(0);
    });
  });
});
