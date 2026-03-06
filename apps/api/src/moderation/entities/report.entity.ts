// Report entity - using Prisma
import { Report as PrismaReport, ReportReason, ReportStatus } from '@prisma/client';

export type Report = PrismaReport;
export { ReportReason, ReportStatus };
