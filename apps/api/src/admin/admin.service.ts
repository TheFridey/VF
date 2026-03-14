import { UserRole } from '../common/enums/user-role.enum';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserStatus, VerificationStatus, ReportStatus, Prisma } from '@prisma/client';
import {
  GetUsersDto,
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  GetAuditLogsDto,
} from './dto/admin.dto';

// ─── Internal service-layer types (not exposed via HTTP) ──────────────────────
interface GetForumThreadsOptions { page?: number; limit?: number; categoryId?: string; }
interface GetListingsOptions { page?: number; limit?: number; }

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
      totalConnections,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({
        where: { role: { in: [UserRole.VETERAN_VERIFIED, UserRole.VETERAN_MEMBER] } },
      }),
      this.prisma.verificationRequest.count({
        where: { status: VerificationStatus.PENDING },
      }),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.connection.count(),
    ]);

    return {
      totalUsers,
      activeUsers,
      verifiedVeterans,
      pendingVerifications,
      pendingReports,
      totalConnections,
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
  async getUsers(dto: GetUsersDto) {
    const { page = 1, limit = 20, status, role, search } = dto;
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (status) where.status = status as UserStatus;
    if (role) where.role = role as UserRole;
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
      users: users.map((u) => this.sanitizeUser(u)),
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

    // ── Activity log — last 30 audit events for this user ──────────────────
    // Covers admin actions taken ON this user (resourceId = userId) AND
    // actions taken BY this user (auditLog.userId = userId).
    const [actionsOnUser, actionsByUser, connectionCount, messageCount] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { resourceId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          resource: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
          userId: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          resource: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      this.prisma.connection.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      }),
      this.prisma.message.count({ where: { senderId: userId } }),
    ]);

    // Merge and deduplicate by id, sort newest first
    const allEvents = [...actionsOnUser, ...actionsByUser];
    const seen = new Set<string>();
    const activityLog = allEvents
      .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);

    return {
      ...this.sanitizeUser(user),
      activityLog,
      stats: {
        connectionCount,
        messageCount,
        reportsMadeCount: user.reportsMade.length,
        reportsReceivedCount: user.reportsReceived.length,
      },
    };
  }
  async updateUserStatus(adminId: string, userId: string, dto: UpdateUserStatusDto) {
    const { status, reason } = dto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: status as UserStatus,
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

  async updateUserRole(adminId: string, userId: string, dto: UpdateUserRoleDto) {
    const { role } = dto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
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

  async getAuditLogs(dto: GetAuditLogsDto) {
    return this.auditService.getLogs({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
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

  private sanitizeUser(user: Record<string, unknown>) {
    const { passwordHash, refreshTokenHash, emailVerificationToken, passwordResetToken, ...sanitized } = user;
    return sanitized;
  }

  // ─── BIA Community ────────────────────────────────────────────────────────

  async getForumThreads({ page = 1, limit = 20, categoryId }: GetForumThreadsOptions) {
    const skip = (page - 1) * limit;
    const where: Prisma.ForumThreadWhereInput = { deletedAt: null };
    if (categoryId) where.categoryId = categoryId;

    const [threads, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastPostAt: 'desc' },
        include: {
          author: { select: { id: true, profile: { select: { displayName: true } } } },
          category: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.forumThread.count({ where }),
    ]);

    return { threads, total, pages: Math.ceil(total / limit), page };
  }

  async updateForumThread(threadId: string, data: { isLocked?: boolean; isPinned?: boolean }) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');

    return this.prisma.forumThread.update({
      where: { id: threadId },
      data,
    });
  }

  async deleteForumThread(threadId: string, adminId: string) {
    await this.prisma.forumThread.update({
      where: { id: threadId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'forum_thread_deleted',
      resource: 'forum_thread',
      resourceId: threadId,
    });

    return { success: true };
  }

  async getBusinessListings({ page = 1, limit = 20 }: GetListingsOptions) {
    const skip = (page - 1) * limit;
    const [listings, total] = await Promise.all([
      this.prisma.businessListing.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, profile: { select: { displayName: true } } } },
        },
      }),
      this.prisma.businessListing.count(),
    ]);
    return { listings, total, pages: Math.ceil(total / limit), page };
  }

  async updateBusinessListing(listingId: string, isApproved: boolean) {
    const listing = await this.prisma.businessListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.businessListing.update({
      where: { id: listingId },
      data: { isApproved },
    });
  }
}
