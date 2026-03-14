// Bridge enums - these mirror the Prisma schema enums.
// After running `npx prisma generate`, you can import directly from '@prisma/client' instead.

export enum MembershipTier {
  FREE      = 'FREE',
  BIA_BASIC = 'BIA_BASIC',
  BIA_PLUS  = 'BIA_PLUS',
}

export enum MembershipStatus {
  ACTIVE             = 'ACTIVE',
  CANCELLED          = 'CANCELLED',
  PAST_DUE           = 'PAST_DUE',
  INCOMPLETE         = 'INCOMPLETE',
  TRIALING           = 'TRIALING',
  EXPIRED            = 'EXPIRED',
}
