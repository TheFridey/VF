import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, UserStatus, VerificationStatus, ReportStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Dashboard stats
  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      verifiedVeterans,
      pendingVerifications,
      pendingReports,
      totalMatches,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({
        where: { role: { in: [UserRole.VETERAN_VERIFIED, UserRole.VETERAN_PAID] } },
      }),
      this.prisma.verificationRequest.count({
        where: { status: VerificationStatus.PENDING },
      }),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.match.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      verifiedVeterans,
      pendingVerifications,
      pendingReports,
      totalMatches,
    };
  }

  async getSystemHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: 'healthy', status: 'ok' };
    } catch {
      return { database: 'unhealthy', status: 'error' };
    }
  }

  // User management
  async getUsers(dto: any) {
    const { page = 1, limit = 20, status, role, search } = dto;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          profile: true,
          veteranDetails: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u: any) => this.sanitizeUser(u)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        veteranDetails: {
          include: { servicePeriods: true },
        },
        verificationRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        reportsMade: { take: 5 },
        reportsReceived: { take: 5 },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  async getUserDetails(userId: string) {
    return this.getUser(userId);
  }

  async updateUserStatus(adminId: string, userId: string, dto: any) {
    const { status, reason } = dto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status,
        banReason: status === UserStatus.BANNED ? reason : null,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'user_status_updated',
      resource: 'user',
      resourceId: userId,
      metadata: { oldStatus: user.status, newStatus: status, reason },
    });

    return { success: true };
  }

  async updateUserRole(adminId: string, userId: string, dto: any) {
    const { role } = dto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'user_role_updated',
      resource: 'user',
      resourceId: userId,
      metadata: { oldRole: user.role, newRole: role },
    });

    return { success: true };
  }

  async getAuditLogs(dto: any) {
    return this.auditService.getLogs(dto);
  }

  async banUser(userId: string, reason: string, durationDays: number | null, adminId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const banExpiresAt = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.BANNED,
        banReason: reason,
        banExpiresAt,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'user_banned',
      resource: 'user',
      resourceId: userId,
      metadata: { reason, durationDays },
      ipAddress,
    });

    return { success: true };
  }

  async unbanUser(userId: string, adminId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.BANNED) {
      throw new BadRequestException('User is not banned');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        banReason: null,
        banExpiresAt: null,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'user_unbanned',
      resource: 'user',
      resourceId: userId,
      ipAddress,
    });

    return { success: true };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, refreshTokenHash, emailVerificationToken, passwordResetToken, ...sanitized } = user;
    return sanitized;
  }
}
