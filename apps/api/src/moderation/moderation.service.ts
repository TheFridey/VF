import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BulkResolveReportsDto, ResolveReportDto, UserAction } from './dto/moderation.dto';
import { AuditService } from '../audit/audit.service';
import { ReportStatus, ReportReason, UserStatus } from '@prisma/client';

interface CreateReportDto { reportedUserId: string; reason: string; description?: string; }
interface BlockUserDto { blockedUserId: string; reason?: string; }
interface GetReportsDto { page?: number; limit?: number; status?: string; }

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Reports
  async createReport(userId: string, dto: CreateReportDto, ipAddress?: string) {
    const { reportedUserId, reason, description } = dto;
    
    if (userId === reportedUserId) {
      throw new BadRequestException('Cannot report yourself');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId,
        reason: reason as ReportReason,
        description,
      },
    });

    await this.auditService.log({
      userId,
      action: 'report_created',
      resource: 'report',
      resourceId: report.id,
      metadata: { reportedUserId, reason },
      ipAddress,
    });

    return report;
  }

  async getMyReports(userId: string) {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReports(status?: ReportStatus, page = 1, limit = 20) {
    const where = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, email: true, profile: true } },
          reportedUser: { select: { id: true, email: true, profile: true } },
          resolver: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPendingReports(dto: GetReportsDto) {
    const { page = 1, limit = 20, status } = dto;
    return this.getReports(status as ReportStatus, page, limit);
  }

  async resolveReport(moderatorId: string, reportId: string, dto: ResolveReportDto, ipAddress?: string) {
    const resolution = dto.resolution;
    const takeAction = dto.userAction != null;
    
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Report already resolved');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: (takeAction ? ReportStatus.ACTION_TAKEN : ReportStatus.DISMISSED) as any,
        resolution,
        resolverId: moderatorId,
        resolvedAt: new Date(),
      },
    });

    // Apply the selected action to the reported user.
    if (takeAction) {
      const userStatus =
        dto.userAction === UserAction.PERMANENT_BAN
          ? UserStatus.BANNED
          : dto.userAction === UserAction.WARNING
            ? UserStatus.ACTIVE
            : UserStatus.SUSPENDED;

      await this.prisma.user.update({
        where: { id: report.reportedUserId },
        data: {
          status: userStatus,
          banReason: dto.userAction === UserAction.WARNING ? null : resolution,
          banExpiresAt:
            dto.userAction === UserAction.SUSPEND_7_DAYS
              ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              : dto.userAction === UserAction.SUSPEND_30_DAYS
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                : dto.userAction === UserAction.PERMANENT_BAN
                  ? null
                  : undefined,
        },
      });

      await this.auditService.log({
        userId: moderatorId,
        action: dto.userAction === UserAction.PERMANENT_BAN ? 'user_banned' : 'user_suspended',
        resource: 'user',
        resourceId: report.reportedUserId,
        metadata: { reason: 'Report action', reportId, userAction: dto.userAction },
        ipAddress,
      });
    }

    await this.auditService.log({
      userId: moderatorId,
      action: 'report_resolved',
      resource: 'report',
      resourceId: reportId,
      metadata: { resolution, takeAction },
      ipAddress,
    });

    return updatedReport;
  }

  async bulkResolveReports(moderatorId: string, dto: BulkResolveReportsDto, ipAddress?: string) {
    const uniqueReportIds = [...new Set(dto.reportIds.filter(Boolean))];
    if (uniqueReportIds.length === 0) {
      throw new BadRequestException('Select at least one report.');
    }

    const results: Array<{ reportId: string; status: 'updated' | 'skipped'; reason?: string }> = [];

    for (const reportId of uniqueReportIds) {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        select: { id: true, status: true },
      });

      if (!report) {
        results.push({ reportId, status: 'skipped', reason: 'Report not found' });
        continue;
      }

      if (report.status !== ReportStatus.PENDING) {
        results.push({
          reportId,
          status: 'skipped',
          reason: `Report already ${report.status.toLowerCase()}`,
        });
        continue;
      }

      await this.resolveReport(moderatorId, reportId, dto, ipAddress);
      results.push({ reportId, status: 'updated' });
    }

    return {
      success: true,
      updatedCount: results.filter((result) => result.status === 'updated').length,
      skippedCount: results.filter((result) => result.status === 'skipped').length,
      results,
    };
  }

  // Blocks
  async blockUser(userId: string, dto: BlockUserDto, ipAddress?: string) {
    const { blockedUserId, reason } = dto;
    
    if (userId === blockedUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: blockedUserId },
      },
    });

    if (existingBlock && !existingBlock.deletedAt) {
      throw new BadRequestException('User already blocked');
    }

    const block = existingBlock
      ? await this.prisma.block.update({
          where: { id: existingBlock.id },
          data: { deletedAt: null, reason },
        })
      : await this.prisma.block.create({
          data: { blockerId: userId, blockedId: blockedUserId, reason },
        });

    await this.auditService.log({
      userId,
      action: 'user_blocked',
      resource: 'block',
      resourceId: block.id,
      metadata: { blockedUserId },
      ipAddress,
    });

    return block;
  }

  async unblockUser(blockerId: string, blockedId: string, ipAddress?: string) {
    const block = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (!block || block.deletedAt) {
      throw new NotFoundException('Block not found');
    }

    await this.prisma.block.update({
      where: { id: block.id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.log({
      userId: blockerId,
      action: 'user_unblocked',
      resource: 'block',
      resourceId: block.id,
      metadata: { blockedId },
      ipAddress,
    });

    return { success: true };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId, deletedAt: null },
      include: {
        blocked: {
          select: { id: true, profile: true },
        },
      },
    });

    return blocks.map(b => ({
      id: b.blocked.id,
      displayName: b.blocked.profile?.displayName,
      profileImageUrl: b.blocked.profile?.profileImageUrl,
      blockedAt: b.createdAt,
    }));
  }

  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
        deletedAt: null,
      },
    });

    return !!block;
  }

  async getModerationStats() {
    const [pendingReports, resolvedToday, totalBlocks] = await Promise.all([
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.report.count({
        where: {
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.block.count({ where: { deletedAt: null } }),
    ]);

    return { pendingReports, resolvedToday, totalBlocks };
  }
}
