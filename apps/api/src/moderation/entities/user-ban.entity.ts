// User bans are stored in User model with banReason and banExpiresAt fields
// This file is kept for compatibility
export interface UserBan {
  userId: string;
  reason: string;
  expiresAt: Date | null;
  createdAt: Date;
}
