-- ============================================================
-- Migration part 2 of 2: Remove dating features
-- VeteranFinder v2 — Community-only reconnection platform
-- ============================================================

-- 1. Create new enums
CREATE TYPE "ConnectionType" AS ENUM ('BROTHERS_IN_ARMS', 'COMMUNITY');
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'BIA_BASIC', 'BIA_PLUS');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED');

-- 2. Migrate VETERAN_PAID -> VETERAN_MEMBER (safe now, enum value committed)
UPDATE "users" SET "role" = 'VETERAN_MEMBER'::"UserRole" WHERE "role" = 'VETERAN_PAID'::"UserRole";

-- 3. Create connections table
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "user1_id" TEXT NOT NULL,
    "user2_id" TEXT NOT NULL,
    "connection_type" "ConnectionType" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "overlap_score" DOUBLE PRECISION,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- 4. Migrate existing BROTHERS matches -> connections
INSERT INTO "connections" ("id", "user1_id", "user2_id", "connection_type", "status", "overlap_score", "last_message_at", "created_at", "updated_at")
SELECT
    "id",
    "user1_id",
    "user2_id",
    'BROTHERS_IN_ARMS'::"ConnectionType",
    "status"::"text"::"ConnectionStatus",
    "overlap_score",
    "last_message_at",
    "created_at",
    "updated_at"
FROM "matches"
WHERE "match_type" = 'BROTHERS';

-- 5. Add connection_id to messages
ALTER TABLE "messages" ADD COLUMN "connection_id" TEXT;

-- 6. Populate connection_id from match_id where a connection exists
UPDATE "messages" m
SET "connection_id" = m."match_id"
WHERE EXISTS (SELECT 1 FROM "connections" c WHERE c."id" = m."match_id");

-- 7. Drop messages that belonged to dating matches
DELETE FROM "messages" WHERE "connection_id" IS NULL;

-- 8. Make connection_id NOT NULL
ALTER TABLE "messages" ALTER COLUMN "connection_id" SET NOT NULL;

-- 9. Create memberships table
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL DEFAULT 'FREE',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- 10. Migrate subscriptions -> memberships
INSERT INTO "memberships" ("id", "user_id", "tier", "status", "stripe_customer_id", "stripe_subscription_id", "stripe_price_id", "current_period_start", "current_period_end", "cancel_at_period_end", "created_at", "updated_at")
SELECT
    "id",
    "user_id",
    CASE
        WHEN "tier" = 'BIA_BASIC' THEN 'BIA_BASIC'::"MembershipTier"
        WHEN "tier" IN ('BIA_PLUS', 'BUNDLE_PREMIUM_BIA', 'BUNDLE_ULTIMATE') THEN 'BIA_PLUS'::"MembershipTier"
        ELSE 'FREE'::"MembershipTier"
    END,
    CASE "status"
        WHEN 'ACTIVE'    THEN 'ACTIVE'::"MembershipStatus"
        WHEN 'CANCELLED' THEN 'CANCELLED'::"MembershipStatus"
        WHEN 'PAST_DUE'  THEN 'PAST_DUE'::"MembershipStatus"
        ELSE 'ACTIVE'::"MembershipStatus"
    END,
    "stripe_customer_id",
    "stripe_subscription_id",
    "stripe_price_id",
    "current_period_start",
    "current_period_end",
    "cancel_at_period_end",
    "created_at",
    "updated_at"
FROM "subscriptions";

-- 11. Remove lookingFor from profiles
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "looking_for";

-- 12. Indexes and constraints for connections
CREATE UNIQUE INDEX "connections_user1_id_user2_id_connection_type_key" ON "connections"("user1_id", "user2_id", "connection_type");
CREATE INDEX "connections_status_idx" ON "connections"("status");
CREATE INDEX "connections_connection_type_idx" ON "connections"("connection_type");
CREATE INDEX "connections_last_message_at_idx" ON "connections"("last_message_at");

-- 13. Indexes and constraints for memberships
CREATE UNIQUE INDEX "memberships_user_id_key" ON "memberships"("user_id");
CREATE UNIQUE INDEX "memberships_stripe_customer_id_key" ON "memberships"("stripe_customer_id");
CREATE UNIQUE INDEX "memberships_stripe_subscription_id_key" ON "memberships"("stripe_subscription_id");
CREATE INDEX "memberships_tier_idx" ON "memberships"("tier");
CREATE INDEX "memberships_status_idx" ON "memberships"("status");

-- 14. Foreign keys for connections
ALTER TABLE "connections" ADD CONSTRAINT "connections_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "connections" ADD CONSTRAINT "connections_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 15. Foreign keys for memberships
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 16. Swap messages foreign key from match_id to connection_id
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_match_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" DROP COLUMN IF EXISTS "match_id";

-- 17. Drop old tables
DROP TABLE IF EXISTS "likes";
DROP TABLE IF EXISTS "daily_swipes";
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "matches";

-- 18. Update messages index
DROP INDEX IF EXISTS "messages_match_id_created_at_idx";
CREATE INDEX "messages_connection_id_created_at_idx" ON "messages"("connection_id", "created_at");
