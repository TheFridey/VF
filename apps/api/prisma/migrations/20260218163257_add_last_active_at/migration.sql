-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionTier" ADD VALUE 'DATING_PREMIUM';
ALTER TYPE "SubscriptionTier" ADD VALUE 'DATING_PREMIUM_PLUS';
ALTER TYPE "SubscriptionTier" ADD VALUE 'BIA_BASIC';
ALTER TYPE "SubscriptionTier" ADD VALUE 'BIA_PLUS';
ALTER TYPE "SubscriptionTier" ADD VALUE 'BUNDLE_PREMIUM_BIA';
ALTER TYPE "SubscriptionTier" ADD VALUE 'BUNDLE_ULTIMATE';

-- AlterTable
ALTER TABLE "likes" ADD COLUMN     "is_super_like" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_online" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "daily_swipes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "likes_used" INTEGER NOT NULL DEFAULT 0,
    "super_likes_used" INTEGER NOT NULL DEFAULT 0,
    "last_swipe_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_swipes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_swipes_user_id_key" ON "daily_swipes"("user_id");

-- CreateIndex
CREATE INDEX "daily_swipes_date_idx" ON "daily_swipes"("date");

-- CreateIndex
CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at");

-- AddForeignKey
ALTER TABLE "daily_swipes" ADD CONSTRAINT "daily_swipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
