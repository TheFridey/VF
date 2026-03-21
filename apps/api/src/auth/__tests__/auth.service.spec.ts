/**
 * AuthService — unit tests
 *
 * Direct instantiation — no NestJS DI. All dependencies are mocks so every
 * test is fast and deterministic.
 */
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';

const baseUser = {
  id: 'user-123',
  email: 'test@veteranfinder.co.uk',
  passwordHash: '$argon2id$mock',
  role: 'VETERAN_UNVERIFIED',
  status: 'PENDING',
  emailVerified: false,
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastFailedLoginAt: null,
  profile: null,
  veteranDetails: null,
  emailVerificationToken: 'tok-123',
  emailVerificationExpires: new Date(Date.now() + 3_600_000),
  passwordResetToken: null,
  passwordResetExpires: null,
  refreshTokenHash: null,
  refreshTokenExpiresAt: null,
};

const mockPrisma = {
  $transaction: jest.fn(),
  user: {
    findUnique:  jest.fn(),
    findFirst:   jest.fn(),
    create:      jest.fn(),
    update:      jest.fn(),
  },
  passwordHistory: {
    create:    jest.fn().mockResolvedValue({}),
    findMany:  jest.fn().mockResolvedValue([]),
    deleteMany:jest.fn().mockResolvedValue({}),
  },
} as any;

const mockJwt   = { sign: jest.fn().mockReturnValue('mock-access-token') } as any;
const mockConfig = { get: jest.fn().mockReturnValue('test-value') } as any;
const mockEmail  = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset:     jest.fn().mockResolvedValue(undefined),
} as any;
const mockPassSec = {
  hash:                     jest.fn().mockResolvedValue('$argon2id$new-hash'),
  verify:                   jest.fn().mockResolvedValue(true),
  needsRehash:              jest.fn().mockReturnValue(false),
  hasAdequateEntropy:       jest.fn().mockReturnValue(true),
  isPatternWeak:            jest.fn().mockReturnValue(false),
  isBreachedPassword:       jest.fn().mockResolvedValue(false),
  isPasswordReused:         jest.fn().mockResolvedValue(false),
  isAccountLocked:          jest.fn().mockReturnValue({ locked: false }),
  getFailedAttemptUpdate:   jest.fn().mockReturnValue({ failedLoginAttempts: 1, lockedUntil: null, lastFailedLoginAt: new Date() }),
  getSuccessfulLoginUpdate: jest.fn().mockReturnValue({ failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null }),
  recordPasswordHistory:    jest.fn().mockResolvedValue(undefined),
} as any;
const mockSubscriptions = {
  registerReferralSignup: jest.fn().mockResolvedValue(null),
  ensureUserReferralCode: jest.fn().mockResolvedValue('VFTEST123'),
} as any;

function makeService() {
  return new AuthService(
    mockPrisma,
    mockJwt,
    mockConfig,
    mockEmail,
    mockPassSec,
    mockSubscriptions,
  );
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = makeService();
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => callback(mockPrisma));
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...baseUser, ...data }));
    mockPrisma.user.update.mockResolvedValue({ ...baseUser });
    mockPassSec.hash.mockResolvedValue('$argon2id$new-hash');
    mockPassSec.hasAdequateEntropy.mockReturnValue(true);
    mockPassSec.isPatternWeak.mockReturnValue(false);
    mockPassSec.isBreachedPassword.mockResolvedValue(false);
    mockPassSec.isAccountLocked.mockReturnValue({ locked: false });
    mockPassSec.verify.mockResolvedValue(true);
    mockSubscriptions.registerReferralSignup.mockResolvedValue(null);
    mockSubscriptions.ensureUserReferralCode.mockResolvedValue('VFTEST123');
  });

  // ── Registration ────────────────────────────────────────────────────────────
  describe('register', () => {
    const dto = { email: 'new@veteranfinder.co.uk', password: 'Tr0ub4dor&3', userType: 'veteran' as const };

    it('registers a valid user, runs all quality checks, and sends verification email', async () => {
      const result = await service.register(dto);
      expect(mockPassSec.hasAdequateEntropy).toHaveBeenCalledWith(dto.password);
      expect(mockPassSec.isPatternWeak).toHaveBeenCalledWith(dto.password);
      expect(mockPassSec.isBreachedPassword).toHaveBeenCalledWith(dto.password);
      expect(mockPassSec.hash).toHaveBeenCalledWith(dto.password);
      expect(mockEmail.sendEmailVerification).toHaveBeenCalledWith(dto.email, expect.any(String));
      expect(result.message).toContain('Verification email sent');
    });

    it('throws ConflictException when email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for low-entropy password', async () => {
      mockPassSec.hasAdequateEntropy.mockReturnValueOnce(false);
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for pattern-weak password', async () => {
      mockPassSec.isPatternWeak.mockReturnValueOnce(true);
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for breached password and does not create user', async () => {
      mockPassSec.isBreachedPassword.mockResolvedValueOnce(true);
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('normalises email to lowercase', async () => {
      await service.register({ ...dto, email: 'USER@VeteranFinder.CO.UK' });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'user@veteranfinder.co.uk' }) }),
      );
    });
  });

  // ── Login ───────────────────────────────────────────────────────────────────
  describe('login', () => {
    const dto = { email: 'test@veteranfinder.co.uk', password: 'CorrectPass1!' };
    const activeUser = { ...baseUser, emailVerified: true, status: 'ACTIVE' };

    it('returns access token on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.user.update.mockResolvedValue(activeUser);
      const result = await service.login(dto);
      expect(result.accessToken).toBe('mock-access-token');
      expect(mockPassSec.verify).toHaveBeenCalledWith(activeUser.passwordHash, dto.password);
    });

    it('throws UnauthorizedException for locked account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, lockedUntil: new Date(Date.now() + 900_000) });
      mockPassSec.isAccountLocked.mockReturnValueOnce({ locked: true, retryAfterMs: 900_000 });
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unverified email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, status: 'PENDING' });
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for banned account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, status: 'BANNED' });
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws generic UnauthorizedException (no user-enumeration) when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      // timing protection: verify still runs against dummy hash
      mockPassSec.hash.mockResolvedValueOnce('dummy');
      const err = await service.login(dto).catch(e => e);
      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.message).not.toMatch(/not found/i);
    });
  });

  // ── Email verification ──────────────────────────────────────────────────────
  describe('verifyEmail', () => {
    it('verifies email and activates the user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(baseUser);
      await service.verifyEmail('tok-123');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ emailVerified: true, status: 'ACTIVE', emailVerificationToken: null }),
        }),
      );
    });

    it('throws BadRequestException for expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        emailVerificationExpires: new Date(Date.now() - 1000),
      });
      await expect(service.verifyEmail('expired-tok')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for unknown token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.verifyEmail('unknown')).rejects.toThrow(BadRequestException);
    });
  });

  // ── sanitizeUser ───────────────────────────────────────────────────────────
  describe('sanitizeUser', () => {
    it('strips all sensitive credential fields', () => {
      const raw = { ...baseUser, passwordHash: 'secret', refreshTokenHash: 'rt', emailVerificationToken: 'evt', passwordResetToken: 'prt' };
      const clean = service.sanitizeUser(raw);
      expect(clean).not.toHaveProperty('passwordHash');
      expect(clean).not.toHaveProperty('refreshTokenHash');
      expect(clean).not.toHaveProperty('emailVerificationToken');
      expect(clean).not.toHaveProperty('passwordResetToken');
      expect(clean).toHaveProperty('email');
      expect(clean).toHaveProperty('id');
    });
  });
});
