// Refresh tokens are stored in User model in Prisma
// This file is kept for compatibility
export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}
