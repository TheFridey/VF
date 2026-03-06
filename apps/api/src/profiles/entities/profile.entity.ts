// Profile entity types - using Prisma
import { Profile as PrismaProfile, Gender } from '@prisma/client';

export type Profile = PrismaProfile;
export { Gender };
