/*
  Warnings:

  - The values [CIVILIAN,VETERAN_PAID] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('VETERAN_UNVERIFIED', 'VETERAN_VERIFIED', 'VETERAN_MEMBER', 'MODERATOR', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VETERAN_UNVERIFIED';
COMMIT;

-- AlterTable
ALTER TABLE "connections" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "memberships" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropEnum
DROP TYPE "MatchStatus";

-- DropEnum
DROP TYPE "MatchType";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- DropEnum
DROP TYPE "SubscriptionTier";

-- CreateIndex
CREATE INDEX "memberships_stripe_customer_id_idx" ON "memberships"("stripe_customer_id");
