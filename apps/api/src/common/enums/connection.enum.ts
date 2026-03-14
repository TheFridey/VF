// Bridge enums - mirror the Prisma schema enums exactly.
// After running `npx prisma generate`, you can import directly from '@prisma/client' instead.

export enum ConnectionType {
  BROTHERS_IN_ARMS = 'BROTHERS_IN_ARMS',
  COMMUNITY        = 'COMMUNITY',
}

export enum ConnectionStatus {
  PENDING   = 'PENDING',
  ACTIVE    = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED   = 'EXPIRED',
}
