import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { VerificationStatus, UserRole } from '@prisma/client';

// Type for multer file
interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class VerificationService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private auditService: AuditService,
  ) {}

  async submitVerification(userId: string, files: UploadedFile[], notes?: string, ipAddress?: string) {
    // Check for existing pending request
    const existingRequest = await this.prisma.verificationRequest.findFirst({
      where: {
        userId,
        status: VerificationStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending verification request');
    }

    // Upload evidence files
    const evidenceUrls: string[] = [];
    for (const file of files) {
      const url = await this.storageService.uploadVerificationEvidence(userId, file);
      evidenceUrls.push(url);
    }

    // Create verification request
    const request = await this.prisma.verificationRequest.create({
      data: {
        userId,
        evidenceUrls,
        notes,
      },
    });

    await this.auditService.log({
      userId,
      action: 'verification_submitted',
      resource: 'verification',
      resourceId: request.id,
      ipAddress,
    });

    return request;
  }

  async getRequest(requestId: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: true,
            veteranDetails: true,
          },
        },
      },
    });

    if (!request) throw new NotFoundException('Verification request not found');
    return request;
  }

  async getMyRequests(userId: string) {
    return this.prisma.verificationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where: { status: VerificationStatus.PENDING },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: true,
              veteranDetails: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.verificationRequest.count({
        where: { status: VerificationStatus.PENDING },
      }),
    ]);

    return {
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveVerification(requestId: string, reviewerId: string, notes?: string, ipAddress?: string) {
    const request = await this.getRequest(requestId);

    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    // Update request
    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: VerificationStatus.APPROVED,
        reviewerId,
        reviewedAt: new Date(),
        notes,
      },
    });

    // Update user role to verified
    await this.prisma.user.update({
      where: { id: request.userId },
      data: { role: UserRole.VETERAN_VERIFIED },
    });

    await this.auditService.log({
      userId: reviewerId,
      action: 'verification_approved',
      resource: 'verification',
      resourceId: requestId,
      metadata: { targetUserId: request.userId },
      ipAddress,
    });

    return updatedRequest;
  }

  async rejectVerification(requestId: string, reviewerId: string, reason: string, ipAddress?: string) {
    const request = await this.getRequest(requestId);

    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: VerificationStatus.REJECTED,
        reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.auditService.log({
      userId: reviewerId,
      action: 'verification_rejected',
      resource: 'verification',
      resourceId: requestId,
      metadata: { targetUserId: request.userId, reason },
      ipAddress,
    });

    return updatedRequest;
  }
}
