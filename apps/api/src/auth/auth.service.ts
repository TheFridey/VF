import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const verificationToken = uuidv4();
    
    const role = UserRole.VETERAN_UNVERIFIED;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role,
        status: UserStatus.PENDING,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // TODO: Send verification email

    return { 
      user: this.sanitizeUser(user), 
      message: 'Verification email sent' 
    };
  }

  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    if (user.status === UserStatus.BANNED || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is locked');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user, ipAddress, userAgent);
    
    return { 
      user: this.sanitizeUser(user), 
      ...tokens 
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, veteranDetails: true },
    });
    
    if (!user) {
      return null;
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      return null;
    }

    return user;
  }

  async generateTokens(user: any, ipAddress: string, userAgent: string) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store refresh token hash in user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string, ipAddress: string, userAgent: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const user = await this.prisma.user.findFirst({
      where: { 
        refreshTokenHash: tokenHash,
        refreshTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    return this.generateTokens(user, ipAddress, userAgent);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
    
    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
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

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset link will be sent' };
    }

    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // TODO: Send reset email

    return { message: 'If the email exists, a reset link will be sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { success: true };
  }

  sanitizeUser(user: any) {
    const { passwordHash, refreshTokenHash, emailVerificationToken, passwordResetToken, ...sanitized } = user;
    return sanitized;
  }
}
