import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AuditLogInput {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      // Sanitize metadata to remove any PII
      const sanitizedMetadata = this.sanitizeMetadata(input.metadata);

      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          metadata: sanitizedMetadata,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      // Log but don't throw - audit logging should not break main flow
      this.logger.error(`Failed to create audit log: ${error.message}`, {
        action: input.action,
        userId: input.userId,
      });
    }
  }

  // Query audit logs (admin only)
  async getLogs(options: {
    userId?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = options;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (resourceId) where.resourceId = resourceId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          action: true,
          resource: true,
          resourceId: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get logs for a specific user (for GDPR data export)
  async getUserLogs(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        createdAt: true,
      },
    });
  }

  // Remove PII from metadata before storing
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sensitiveFields = [
      'email',
      'password',
      'passwordHash',
      'phone',
      'address',
      'ssn',
      'socialSecurityNumber',
      'dateOfBirth',
      'dob',
      'creditCard',
      'bankAccount',
      'token',
      'accessToken',
      'refreshToken',
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
