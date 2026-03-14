import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { RedisService } from '../common/redis/redis.service';
import { VerificationStatus, UserRole } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// Accepted MIME types for verification evidence
const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',   // .mov (iPhone default)
  'video/x-msvideo',  // .avi
  'video/webm',
  'video/x-matroska', // .mkv
];

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',   // iPhone HEIC
  'image/heif',
  'image/webp',
];

const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
];

const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_VIDEO_TYPES,
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES,
];

const EVIDENCE_FOLDER = 'veteranfinder/verification-evidence';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  // SLA constants — review target 48h, urgent at 36h, breached at 48h
  private static readonly SLA_TARGET_HOURS = 48;
  private static readonly SLA_URGENT_HOURS = 36;

  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private auditService: AuditService,
    private emailService: EmailService,
    private redis: RedisService,
  ) {}

  // ── Evidence upload ────────────────────────────────────────────────────────

  private async uploadEvidenceFile(
    userId: string,
    file: UploadedFile,
  ): Promise<{ url: string; publicId: string }> {
    if (!ALL_ACCEPTED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type (${file.mimetype}). Upload a video, photo, or PDF of your HM Armed Forces Veteran Card.`,
      );
    }

    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.mimetype);
    const maxSize = isVideo ? 200 * 1024 * 1024 : 10 * 1024 * 1024; // 200MB video, 10MB image/PDF

    if (file.size > maxSize) {
      const maxMb = maxSize / (1024 * 1024);
      throw new BadRequestException(`File too large. Maximum size is ${maxMb}MB.`);
    }

    const resourceType = isVideo ? 'video' : ACCEPTED_DOCUMENT_TYPES.includes(file.mimetype) ? 'raw' : 'image';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: EVIDENCE_FOLDER,
          resource_type: resourceType as any,
          public_id: `${userId}_${Date.now()}`,
          type: 'authenticated', // Restricted delivery — not publicly accessible via CDN
          eager_async: false,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Evidence upload failed for ${userId}: ${error?.message}`);
            reject(new BadRequestException('Failed to upload verification file. Please try again.'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  private async wipeEvidenceFiles(publicIds: string[]): Promise<void> {
    if (!publicIds || publicIds.length === 0) return;
    try {
      await cloudinary.api.delete_resources(publicIds, { resource_type: 'video', type: 'authenticated' });
      this.logger.log(`Wiped ${publicIds.length} evidence file(s)`);
    } catch (err) {
      this.logger.error(`Failed to wipe evidence files: ${err.message}`);
    }
  }

  // ── Submit verification ────────────────────────────────────────────────────

  async submitVerification(userId: string, files: UploadedFile[], notes?: string, ipAddress?: string) {
    const existingPending = await this.prisma.verificationRequest.findFirst({
      where: { userId, status: VerificationStatus.PENDING },
    });
    if (existingPending) {
      throw new BadRequestException('You already have a pending verification request. Please wait for it to be reviewed.');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('Please upload your HM Armed Forces Veteran Card or supporting documentation.');
    }

    if (files.length > 5) {
      throw new BadRequestException('Maximum 5 files per submission.');
    }

    const evidenceUrls: string[] = [];
    const evidencePublicIds: string[] = [];

    for (const file of files) {
      const { url, publicId } = await this.uploadEvidenceFile(userId, file);
      evidenceUrls.push(url);
      evidencePublicIds.push(publicId);
    }

    const request = await this.prisma.verificationRequest.create({
      data: {
        userId,
        evidenceUrls,
        notes: JSON.stringify({ reviewNotes: notes || '', evidencePublicIds }),
      },
    });

    await this.auditService.log({
      userId,
      action: 'VERIFICATION_SUBMITTED',
      resource: 'verification',
      resourceId: request.id,
      ipAddress,
    });

    return request;
  }

  // ── Retrieve requests ──────────────────────────────────────────────────────

  async getRequest(requestId: string) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: { id: true, email: true, profile: true, veteranDetails: true },
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
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
  }

  // ── SLA calculation ────────────────────────────────────────────────────────

  private computeSla(createdAt: Date): {
    hoursElapsed: number;
    targetHours: number;
    breached: boolean;
    urgency: 'normal' | 'urgent' | 'breached';
    deadlineAt: Date;
  } {
    const now = Date.now();
    const hoursElapsed = (now - createdAt.getTime()) / 3_600_000;
    const deadlineAt = new Date(createdAt.getTime() + VerificationService.SLA_TARGET_HOURS * 3_600_000);

    let urgency: 'normal' | 'urgent' | 'breached';
    if (hoursElapsed >= VerificationService.SLA_TARGET_HOURS) urgency = 'breached';
    else if (hoursElapsed >= VerificationService.SLA_URGENT_HOURS) urgency = 'urgent';
    else urgency = 'normal';

    return {
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
      targetHours: VerificationService.SLA_TARGET_HOURS,
      breached: urgency === 'breached',
      urgency,
      deadlineAt,
    };
  }

  async getPendingRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where: { status: VerificationStatus.PENDING },
        include: {
          user: {
            select: { id: true, email: true, profile: true, veteranDetails: true },
          },
        },
        orderBy: { createdAt: 'asc' }, // FIFO — oldest first
        skip,
        take: limit,
      }),
      this.prisma.verificationRequest.count({ where: { status: VerificationStatus.PENDING } }),
    ]);

    const requestsWithSla = requests.map((r) => ({
      ...r,
      sla: this.computeSla(r.createdAt),
    }));

    const slaSummary = {
      normal:   requestsWithSla.filter((r) => r.sla.urgency === 'normal').length,
      urgent:   requestsWithSla.filter((r) => r.sla.urgency === 'urgent').length,
      breached: requestsWithSla.filter((r) => r.sla.urgency === 'breached').length,
    };

    return { requests: requestsWithSla, total, page, totalPages: Math.ceil(total / limit), slaSummary };
  }

  // ── Approve / Reject ────────────────────────────────────────────────────────

  async approveVerification(requestId: string, reviewerId: string, notes?: string, ipAddress?: string) {
    const request = await this.getRequest(requestId);
    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    const publicIds = this.extractPublicIds(request.notes);

    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: VerificationStatus.APPROVED,
        reviewerId,
        reviewedAt: new Date(),
        notes: notes || 'Approved',
        evidenceUrls: [],
      },
    });

    const verifiedUser = await this.prisma.user.update({
      where: { id: request.userId },
      data: { role: UserRole.VETERAN_VERIFIED },
      include: { profile: true },
    });

    await this.wipeEvidenceFiles(publicIds);

    await this.emailService.sendVerificationApproved(
      verifiedUser.email,
      verifiedUser.profile?.displayName ?? undefined,
    );

    await this.auditService.log({
      userId: reviewerId,
      action: 'VERIFICATION_APPROVED',
      resource: 'verification',
      resourceId: requestId,
      metadata: { targetUserId: request.userId, evidenceWiped: publicIds.length },
      ipAddress,
    });

    return updatedRequest;
  }

  async rejectVerification(requestId: string, reviewerId: string, reason: string, ipAddress?: string) {
    const request = await this.getRequest(requestId);
    if (request.status !== VerificationStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    const publicIds = this.extractPublicIds(request.notes);

    const updatedRequest = await this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: VerificationStatus.REJECTED,
        reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        evidenceUrls: [],
      },
    });

    await this.wipeEvidenceFiles(publicIds);

    const rejectedUser = await this.prisma.user.findUnique({
      where: { id: request.userId },
      include: { profile: true },
    });

    if (rejectedUser) {
      await this.emailService.sendVerificationRejected(
        rejectedUser.email,
        reason,
        rejectedUser.profile?.displayName ?? undefined,
      );
    }

    await this.auditService.log({
      userId: reviewerId,
      action: 'VERIFICATION_REJECTED',
      resource: 'verification',
      resourceId: requestId,
      metadata: { targetUserId: request.userId, reason, evidenceWiped: publicIds.length },
      ipAddress,
    });

    return updatedRequest;
  }

  // ── SLA breach cron ─────────────────────────────────────────────────────────
  // Runs every 30 minutes, detects breached SLAs, sends a single alert email
  // per request using Redis deduplication to prevent repeat alerts.

  @Cron('0 */30 * * * *') // Every 30 minutes at :00 and :30
  async checkSlaBreach(): Promise<void> {
    this.logger.log('SLA breach check running…');

    try {
      const breachThreshold = new Date(
        Date.now() - VerificationService.SLA_TARGET_HOURS * 3_600_000,
      );

      const breachedRequests = await this.prisma.verificationRequest.findMany({
        where: {
          status: VerificationStatus.PENDING,
          createdAt: { lt: breachThreshold },
        },
        include: {
          user: { select: { email: true, profile: { select: { displayName: true } } } },
        },
      });

      if (breachedRequests.length === 0) {
        this.logger.log('SLA breach check: no breaches found.');
        return;
      }

      // Find admin/moderator email addresses to alert
      const admins = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MODERATOR'] }, status: 'ACTIVE' },
        select: { email: true },
      });

      if (admins.length === 0) {
        this.logger.warn('SLA breach: no admin users found to notify.');
        return;
      }

      let alertsSent = 0;

      for (const request of breachedRequests) {
        const alreadyAlerted = await this.redis.isSlaAlertSent(request.id);
        if (alreadyAlerted) continue;

        const hoursOverdue = Math.round(
          (Date.now() - request.createdAt.getTime()) / 3_600_000 - VerificationService.SLA_TARGET_HOURS,
        );

        const veteranName = request.user?.profile?.displayName ?? request.user?.email ?? 'Unknown veteran';

        // Send alert to all admins — in production you'd direct this to an alerts inbox
        for (const admin of admins) {
          await this.emailService.sendSlaBreachAlert(admin.email, {
            requestId: request.id,
            veteranName,
            veteranEmail: request.user?.email ?? '',
            submittedAt: request.createdAt,
            hoursOverdue,
          });
        }

        await this.redis.setSlaAlertSent(request.id);
        alertsSent++;

        await this.auditService.log({
          userId: undefined,
          action: 'VERIFICATION_SLA_BREACHED',
          resource: 'verification',
          resourceId: request.id,
          metadata: { hoursOverdue, adminCount: admins.length },
        });
      }

      this.logger.log(
        `SLA breach check complete: ${breachedRequests.length} breached, ${alertsSent} alerts sent.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SLA breach check failed: ${message}`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private extractPublicIds(notes: string | null): string[] {
    if (!notes) return [];
    try {
      const parsed = JSON.parse(notes);
      return Array.isArray(parsed.evidencePublicIds) ? parsed.evidencePublicIds : [];
    } catch {
      return [];
    }
  }
}
