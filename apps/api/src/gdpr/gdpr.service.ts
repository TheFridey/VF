import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class GdprService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async exportUserData(userId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        veteranDetails: {
          include: { servicePeriods: true },
        },
        verificationRequests: true,
        blocks: true,
        reportsMade: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Get audit logs
    const auditLogs = await this.auditService.getUserLogs(userId);

    await this.auditService.log({
      userId,
      action: 'data_export_requested',
      resource: 'user',
      resourceId: userId,
      ipAddress,
    });

    // Remove sensitive fields
    const { passwordHash, refreshTokenHash, emailVerificationToken, passwordResetToken, ...sanitizedUser } = user;

    return {
      user: sanitizedUser,
      auditLogs,
      exportedAt: new Date().toISOString(),
    };
  }

  async requestDataDeletion(userId: string, password: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    // Verify password
    const isValidPassword = await argon2.verify(user.passwordHash, password);
    if (!isValidPassword) {
      throw new BadRequestException('Invalid password');
    }

    // Schedule deletion for 30 days from now
    const scheduledDeletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.PENDING_DELETION,
        deletionRequestedAt: new Date(),
        scheduledDeletionAt,
      },
    });

    await this.auditService.log({
      userId,
      action: 'deletion_requested',
      resource: 'user',
      resourceId: userId,
      ipAddress,
    });

    return {
      message: 'Account deletion scheduled',
      scheduledDeletionAt,
    };
  }

  async requestAccountDeletion(userId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    // Schedule deletion for 30 days from now
    const scheduledDeletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.PENDING_DELETION,
        deletionRequestedAt: new Date(),
        scheduledDeletionAt,
      },
    });

    await this.auditService.log({
      userId,
      action: 'deletion_requested',
      resource: 'user',
      resourceId: userId,
      ipAddress,
    });

    return {
      message: 'Account deletion scheduled',
      scheduledDeletionAt,
    };
  }

  async cancelDeletionRequest(userId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.PENDING_DELETION) {
      throw new BadRequestException('No pending deletion request');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        deletionRequestedAt: null,
        scheduledDeletionAt: null,
      },
    });

    await this.auditService.log({
      userId,
      action: 'deletion_cancelled',
      resource: 'user',
      resourceId: userId,
      ipAddress,
    });

    return { message: 'Account deletion cancelled' };
  }

  async cancelAccountDeletion(userId: string, ipAddress?: string) {
    return this.cancelDeletionRequest(userId, ipAddress);
  }

  async getDeletionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        deletionRequestedAt: true,
        scheduledDeletionAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      isPending: user.status === UserStatus.PENDING_DELETION,
      requestedAt: user.deletionRequestedAt,
      scheduledAt: user.scheduledDeletionAt,
    };
  }

  async processScheduledDeletions() {
    const usersToDelete = await this.prisma.user.findMany({
      where: {
        status: UserStatus.PENDING_DELETION,
        scheduledDeletionAt: { lte: new Date() },
      },
    });

    let deleted = 0;
    for (const user of usersToDelete) {
      await this.deleteUserData(user.id);
      deleted++;
    }

    return { message: `Processed ${deleted} scheduled deletions` };
  }

  async deleteUserData(userId: string, adminId?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    // Delete all user data in transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete messages
      await tx.message.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });

      // Delete connections
      await tx.connection.deleteMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      });

      // Delete blocks
      await tx.block.deleteMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      });

      // Delete reports
      await tx.report.deleteMany({
        where: { OR: [{ reporterId: userId }, { reportedUserId: userId }] },
      });

      // Delete verification requests
      await tx.verificationRequest.deleteMany({
        where: { userId },
      });

      // Delete service periods
      const veteranDetails = await tx.veteranDetails.findUnique({
        where: { userId },
      });
      if (veteranDetails) {
        await tx.servicePeriod.deleteMany({
          where: { veteranDetailsId: veteranDetails.id },
        });
      }

      // Delete veteran details
      await tx.veteranDetails.deleteMany({
        where: { userId },
      });

      // Delete profile
      await tx.profile.deleteMany({
        where: { userId },
      });

      // Anonymize audit logs (keep for compliance but remove PII)
      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Finally delete user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    await this.auditService.log({
      userId: adminId,
      action: 'user_data_deleted',
      resource: 'user',
      resourceId: userId,
      metadata: { deletedUserId: userId },
      ipAddress,
    });

    return { message: 'User data deleted successfully' };
  }
}
