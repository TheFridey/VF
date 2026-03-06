// Verification request entity - using Prisma
import { VerificationRequest as PrismaVerificationRequest, VerificationStatus } from '@prisma/client';

export type VerificationRequest = PrismaVerificationRequest;
export { VerificationStatus };
