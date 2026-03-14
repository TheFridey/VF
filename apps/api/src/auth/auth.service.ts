import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PasswordSecurityService } from './password-security.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, UserStatus } from '@prisma/client';

// ─── Typed user shape returned after JWT validation ──────────────────────────
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  profile?: { displayName?: string | null } | null;
  veteranDetails?: object | null;
  [key: string]: unknown;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private passwordSecurity: PasswordSecurityService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // ── Password quality checks (all run before hashing) ──────────────────
    // 1. Minimum entropy — rejects passwords that pass complexity rules but are
    //    actually weak (e.g. "Aaaaaa1!" has only ~10 bits of entropy)
    if (!this.passwordSecurity.hasAdequateEntropy(dto.password)) {
      throw new BadRequestException(
        'Password is too predictable. Use a longer passphrase or a mix of unrelated words.',
      );
    }

    // 2. Pattern/dictionary check — rejects "Password123!" and its variations
    if (this.passwordSecurity.isPatternWeak(dto.password)) {
      throw new BadRequestException(
        'Password is based on a common pattern. Please choose something more unique.',
      );
    }

    // 3. HIBP k-anonymity breach check — the password never leaves this server.
    //    Only the first 5 chars of its SHA-1 hash are sent to Have I Been Pwned.
    //    Fails open (HIBP outage does not block registration).
    const breached = await this.passwordSecurity.isBreachedPassword(dto.password);
    if (breached) {
      throw new BadRequestException(
        'This password has appeared in a known data breach. Please choose a different password.',
      );
    }

    // ── Hash with Argon2id + pepper ───────────────────────────────────────
    // pepper = HMAC-SHA256 applied before Argon2id. A DB breach alone yields
    // nothing without the pepper which lives in the environment, not the DB.
    const passwordHash = await this.passwordSecurity.hash(dto.password);

    const verificationToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: UserRole.VETERAN_UNVERIFIED,
        status: UserStatus.PENDING,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Store initial password in history so it can't immediately be reused on reset
    await this.passwordSecurity.recordPasswordHistory(user.id, passwordHash);

    await this.emailService.sendEmailVerification(user.email, verificationToken);

    return {
      user: this.sanitizeUser(user),
      message: 'Verification email sent',
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const bypassRoles: UserRole[] = [UserRole.ADMIN, UserRole.MODERATOR];
    if (!user.emailVerified && !bypassRoles.includes(user.role as UserRole)) {
      throw new UnauthorizedException('Please verify your email first');
    }

    if (user.status === UserStatus.BANNED || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is locked');
    }

    // Reset lockout counters on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...this.passwordSecurity.getSuccessfulLoginUpdate(),
      },
    });

    // Re-hash if Argon2id parameters have been upgraded
    if (user.passwordHash && this.passwordSecurity.needsRehash(user.passwordHash as string)) {
      const newHash = await this.passwordSecurity.hash(dto.password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    }

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  // ─── Validate (used by LocalStrategy & login) ─────────────────────────────

  async validateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, veteranDetails: true },
    });

    if (!user) {
      // Run a dummy hash to prevent user-enumeration via timing difference
      await this.passwordSecurity.hash('dummy-timing-protection-value');
      return null;
    }

    // Check account lockout before attempting verify (saves CPU on locked accounts)
    const lockout = this.passwordSecurity.isAccountLocked(user);
    if (lockout.locked) {
      const retryMins = Math.ceil((lockout.retryAfterMs ?? 0) / 60000);
      throw new UnauthorizedException(
        `Account temporarily locked. Try again in ${retryMins} minute${retryMins !== 1 ? 's' : ''}.`,
      );
    }

    const isValid = await this.passwordSecurity.verify(user.passwordHash, password);

    if (!isValid) {
      // Record failed attempt — may trigger lockout for subsequent requests
      const update = this.passwordSecurity.getFailedAttemptUpdate(
        user.failedLoginAttempts,
        user.lastFailedLoginAt,
      );
      await this.prisma.user.update({ where: { id: user.id }, data: update });
      return null;
    }

    return user as AuthenticatedUser;
  }

  // ─── Token generation ─────────────────────────────────────────────────────

  async generateTokens(user: AuthenticatedUser) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, refreshTokenExpiresAt: expiresAt },
    });

    return { accessToken, refreshToken };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  async refreshAccessToken(refreshToken: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        refreshTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(user as AuthenticatedUser);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string, accessToken?: string) {
    // Invalidate refresh token in DB
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });

    // Blacklist the access token in Redis for its remaining TTL
    // Handled by the caller (auth controller) via RedisService
    return { accessToken };
  }

  // ─── Email verification ───────────────────────────────────────────────────

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.emailVerified) {
      return { message: 'If that address is registered, a verification email has been sent.' };
    }

    const token = uuidv4();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await this.emailService.sendEmailVerification(user.email, token);
    return { message: 'If that address is registered, a verification email has been sent.' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (
      !user ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { success: true };
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return { message: 'If the email exists, a reset link will be sent' };
    }

    const resetToken = uuidv4();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.emailService.sendPasswordReset(user.email, resetToken);
    return { message: 'If the email exists, a reset link will be sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Run the same quality checks on the new password
    if (!this.passwordSecurity.hasAdequateEntropy(newPassword)) {
      throw new BadRequestException('Password is too predictable.');
    }
    if (this.passwordSecurity.isPatternWeak(newPassword)) {
      throw new BadRequestException('Password is based on a common pattern.');
    }
    const breached = await this.passwordSecurity.isBreachedPassword(newPassword);
    if (breached) {
      throw new BadRequestException(
        'This password has appeared in a known data breach. Please choose a different password.',
      );
    }

    // Check password history — cannot reuse last 10 passwords
    const reused = await this.passwordSecurity.isPasswordReused(user.id, newPassword);
    if (reused) {
      throw new BadRequestException(
        'You cannot reuse a recent password. Please choose a new one.',
      );
    }

    const passwordHash = await this.passwordSecurity.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        // Also invalidate all existing sessions on password reset
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });

    await this.passwordSecurity.recordPasswordHistory(user.id, passwordHash);

    return { success: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  sanitizeUser(user: AuthenticatedUser | Record<string, unknown>) {
    const {
      passwordHash: _ph,
      refreshTokenHash: _rt,
      emailVerificationToken: _evt,
      passwordResetToken: _prt,
      ...sanitized
    } = user as Record<string, unknown>;
    return sanitized;
  }
}
