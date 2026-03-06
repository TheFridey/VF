// Veteran entities - using Prisma
import { VeteranDetails as PrismaVeteranDetails, ServicePeriod as PrismaServicePeriod, MilitaryBranch } from '@prisma/client';

export type VeteranDetails = PrismaVeteranDetails;
export type ServicePeriod = PrismaServicePeriod;
export { MilitaryBranch };
