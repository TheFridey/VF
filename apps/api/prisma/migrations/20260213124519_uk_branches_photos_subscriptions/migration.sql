-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MilitaryBranch" ADD VALUE 'BRITISH_ARMY';
ALTER TYPE "MilitaryBranch" ADD VALUE 'ROYAL_NAVY';
ALTER TYPE "MilitaryBranch" ADD VALUE 'ROYAL_AIR_FORCE';
ALTER TYPE "MilitaryBranch" ADD VALUE 'ROYAL_MARINES';
ALTER TYPE "MilitaryBranch" ADD VALUE 'RESERVE_FORCES';
ALTER TYPE "MilitaryBranch" ADD VALUE 'TERRITORIAL_ARMY';
ALTER TYPE "MilitaryBranch" ADD VALUE 'OTHER';
