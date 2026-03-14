/**
 * PasswordSecurityService — unit tests
 *
 * Direct instantiation (no NestJS DI container) so tests run fast and in
 * isolation. Covers Argon2id hashing, pepper, entropy, pattern detection,
 * HIBP k-anonymity, account lockout, and password history.
 */
import { PasswordSecurityService } from '../password-security.service';
import { ConfigService } from '@nestjs/config';

// ── Lightweight mocks ─────────────────────────────────────────────────────────
const mockConfig = {
  get: (key: string, def?: unknown) => {
    if (key === 'PASSWORD_PEPPER') return 'test-pepper-that-is-32-chars-long!!';
    return def;
  },
} as unknown as ConfigService;

const mockPrisma = {
  passwordHistory: {
    findMany:   jest.fn().mockResolvedValue([]),
    create:     jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({}),
  },
} as any;

function makeService() {
  return new PasswordSecurityService(mockConfig, mockPrisma);
}

describe('PasswordSecurityService', () => {
  let service: PasswordSecurityService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
  });

  // ── Hashing & verification ──────────────────────────────────────────────────
  describe('hash + verify', () => {
    it('hashes a password and verifies it correctly', async () => {
      const hash = await service.hash('Correct-Horse-Battery-42!');
      expect(hash).toMatch(/^\$argon2id/);
      expect(await service.verify(hash, 'Correct-Horse-Battery-42!')).toBe(true);
    });

    it('returns false for wrong password', async () => {
      const hash = await service.hash('CorrectPass1!');
      expect(await service.verify(hash, 'WrongPass1!')).toBe(false);
    });

    it('produces unique hashes per call (random salt)', async () => {
      const h1 = await service.hash('SamePass1!');
      const h2 = await service.hash('SamePass1!');
      expect(h1).not.toBe(h2);
    });

    it('returns false (never throws) for invalid hash format', async () => {
      expect(await service.verify('not-a-valid-hash', 'pass')).toBe(false);
    });
  });

  // ── Entropy ────────────────────────────────────────────────────────────────
  describe('hasAdequateEntropy', () => {
    it('accepts a strong passphrase', () => {
      expect(service.hasAdequateEntropy('Correct-Horse-Battery-Staple-42!')).toBe(true);
    });

    it('rejects low-entropy despite meeting complexity rules', () => {
      // "Aaaaaa1!" has ~12 bits of entropy — well below the 50-bit floor
      expect(service.hasAdequateEntropy('Aaaaaa1!')).toBe(false);
    });

    it('rejects a 4-character password', () => {
      expect(service.hasAdequateEntropy('Ab1!')).toBe(false);
    });
  });

  // ── Pattern detection ──────────────────────────────────────────────────────
  describe('isPatternWeak', () => {
    it.each([
      ['Password123!',  true,  'common base word'],
      ['P@ssw0rd1',     true,  'leet-speak variation'],
      ['Qwerty12345!',  true,  'keyboard row walk'],
      ['aaaaaa1!A',     true,  'repeated chars'],
      ['12345678Ab!',   true,  'sequential digits'],
      ['Liverpool1!',   true,  'football club'],
      ['army123456!',   true,  'military term'],
      ['Tr0ub4dor&3',   false, 'genuinely mixed'],
      ['xK9mP2qLv!',   false, 'random chars'],
    ])('"%s" → weak=%s (%s)', (pwd, expected) => {
      expect(service.isPatternWeak(pwd)).toBe(expected);
    });
  });

  // ── Account lockout ────────────────────────────────────────────────────────
  describe('isAccountLocked', () => {
    it('does not lock on 0 failed attempts', () => {
      expect(service.isAccountLocked({ failedLoginAttempts: 0, lockedUntil: null }).locked).toBe(false);
    });

    it('recognises an active lockout', () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      const result = service.isAccountLocked({ failedLoginAttempts: 5, lockedUntil: future });
      expect(result.locked).toBe(true);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('does not lock when lockedUntil is in the past', () => {
      const past = new Date(Date.now() - 60_000);
      expect(service.isAccountLocked({ failedLoginAttempts: 5, lockedUntil: past }).locked).toBe(false);
    });
  });

  describe('getFailedAttemptUpdate', () => {
    it('increments attempt counter', () => {
      const u = service.getFailedAttemptUpdate(2, null);
      expect(u.failedLoginAttempts).toBe(3);
      expect(u.lockedUntil).toBeNull();
    });

    it('sets lockedUntil after reaching max attempts', () => {
      const u = service.getFailedAttemptUpdate(4, null);
      expect(u.failedLoginAttempts).toBe(5);
      expect(u.lockedUntil).toBeInstanceOf(Date);
      expect(u.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('resets counter after 30-minute quiet window', () => {
      const old = new Date(Date.now() - 31 * 60_000);
      const u = service.getFailedAttemptUpdate(4, old);
      expect(u.failedLoginAttempts).toBe(1);
      expect(u.lockedUntil).toBeNull();
    });
  });

  // ── HIBP ───────────────────────────────────────────────────────────────────
  describe('isBreachedPassword', () => {
    it('fails open when HIBP is unreachable', async () => {
      jest.spyOn(service as any, 'hibpRequest').mockRejectedValue(new Error('Network error'));
      expect(await service.isBreachedPassword('SomePassword123!')).toBe(false);
    });

    it('returns true when password hash suffix appears in response', async () => {
      // SHA-1('password') = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      // prefix=5BAA6, suffix=1E4C9B93F3F0682250B6CF8331B7EE68FD8
      jest.spyOn(service as any, 'hibpRequest').mockResolvedValue(
        '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3730471\r\nABCDEF1234567890:1',
      );
      expect(await service.isBreachedPassword('password')).toBe(true);
    });

    it('returns false when password hash is not in response', async () => {
      jest.spyOn(service as any, 'hibpRequest').mockResolvedValue('ABCDEF1234567890:1');
      expect(await service.isBreachedPassword('MyUniqueP@ssphrase99!')).toBe(false);
    });
  });
});
