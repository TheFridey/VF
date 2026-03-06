// User entity types - using Prisma, no TypeORM decorators needed
import { User as PrismaUser, UserRole, UserStatus } from '@prisma/client';

export type User = PrismaUser;

export { UserRole, UserStatus };

// Partial user for updates
export type UserUpdateInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

// User with relations
export interface UserWithProfile extends User {
  profile?: {
    id: string;
    displayName: string | null;
    bio: string | null;
    profileImageUrl: string | null;
    location: string | null;
    lastActiveAt: Date | null;
  } | null;
  veteranDetails?: {
    id: string;
    branch: string | null;
    rank: string | null;
    mos: string | null;
  } | null;
}
