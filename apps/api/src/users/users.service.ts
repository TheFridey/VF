import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchType } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, veteranDetails: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByIdOrThrow(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { profile: true, veteranDetails: true },
    });
  }

  async softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * GDPR-compliant permanent account deletion
   * Removes all user data from the database
   */
  async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        veteranDetails: {
          include: { servicePeriods: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log the deletion request before deleting
    await this.auditService.log({
      userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      resource: 'user',
      resourceId: userId,
      metadata: { email: user.email, requestedAt: new Date().toISOString() },
    });

    // Use a transaction to ensure all data is deleted atomically
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete all messages sent or received by user
      await tx.message.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      });

      // 2. Delete all matches involving user
      await tx.match.deleteMany({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
      });

      // 3. Delete all likes (given and received)
      await tx.like.deleteMany({
        where: {
          OR: [
            { likerId: userId },
            { likedId: userId },
          ],
        },
      });

      // 4. Delete all blocks (given and received)
      await tx.block.deleteMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedId: userId },
          ],
        },
      });

      // 5. Delete all reports filed by or against user
      await tx.report.deleteMany({
        where: {
          OR: [
            { reporterId: userId },
            { reportedUserId: userId },
          ],
        },
      });

      // 6. Delete verification requests
      await tx.verificationRequest.deleteMany({
        where: { userId },
      });

      // 7. Delete service periods (if veteran)
      if (user.veteranDetails) {
        await tx.servicePeriod.deleteMany({
          where: { veteranDetailsId: user.veteranDetails.id },
        });
      }

      // 8. Delete veteran details
      await tx.veteranDetails.deleteMany({
        where: { userId },
      });

      // 9. Delete profile
      await tx.profile.deleteMany({
        where: { userId },
      });

      // 10. Anonymise audit logs (keep for compliance but remove PII)
      await tx.auditLog.updateMany({
        where: { userId },
        data: { 
          userId: null,
          metadata: { anonymised: true, deletedAt: new Date().toISOString() },
        },
      });

      // 11. Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return {
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    };
  }

  /**
   * Export user data for GDPR data portability
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        veteranDetails: {
          include: { servicePeriods: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's matches
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        matchType: MatchType.BROTHERS,
      },
      select: {
        id: true,
        matchType: true,
        status: true,
        createdAt: true,
      },
    });

    // Remove sensitive internal fields
    const { passwordHash, refreshTokenHash, emailVerificationToken, passwordResetToken, ...userData } = user;

    return {
      exportedAt: new Date().toISOString(),
      user: {
        ...userData,
        matches: matches.map(m => ({
          matchId: m.id,
          type: m.matchType,
          status: m.status,
          createdAt: m.createdAt,
        })),
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        veteranDetails: {
          include: { servicePeriods: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Remove sensitive fields
    const { passwordHash, refreshTokenHash, emailVerificationToken, passwordResetToken, ...sanitized } = user;
    return sanitized;
  }
}
