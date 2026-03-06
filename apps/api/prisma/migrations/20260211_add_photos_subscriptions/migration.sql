-- Add Photo table
CREATE TABLE IF NOT EXISTS "photos" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- Add Subscription table
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PREMIUM_MONTHLY', 'PREMIUM_ANNUAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED');

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "daily_likes_remaining" INTEGER NOT NULL DEFAULT 10,
    "daily_likes_reset_at" TIMESTAMP(3),
    "super_likes_remaining" INTEGER NOT NULL DEFAULT 0,
    "super_likes_reset_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "photos_profile_id_idx" ON "photos"("profile_id");
CREATE INDEX "photos_is_primary_idx" ON "photos"("is_primary");

CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX "subscriptions_tier_idx" ON "subscriptions"("tier");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- Add foreign keys
ALTER TABLE "photos" ADD CONSTRAINT "photos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
