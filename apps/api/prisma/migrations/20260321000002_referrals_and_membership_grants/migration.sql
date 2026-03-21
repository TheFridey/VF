-- Referral system + timed membership grants

CREATE TYPE "MembershipGrantSource" AS ENUM ('REFERRAL', 'ADMIN');

ALTER TABLE "users"
ADD COLUMN "referral_code" TEXT;

CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "qualified_at" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referrals_referred_user_id_key" ON "referrals"("referred_user_id");
CREATE INDEX "referrals_inviter_id_qualified_at_idx" ON "referrals"("inviter_id", "qualified_at");

CREATE TABLE "membership_grants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "MembershipTier" NOT NULL,
    "source" "MembershipGrantSource" NOT NULL,
    "admin_id" TEXT,
    "referral_milestone" INTEGER,
    "label" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "membership_grants_user_id_starts_at_ends_at_idx" ON "membership_grants"("user_id", "starts_at", "ends_at");
CREATE INDEX "membership_grants_source_referral_milestone_idx" ON "membership_grants"("source", "referral_milestone");

ALTER TABLE "referrals"
ADD CONSTRAINT "referrals_inviter_id_fkey"
FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "referrals"
ADD CONSTRAINT "referrals_referred_user_id_fkey"
FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_grants"
ADD CONSTRAINT "membership_grants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_grants"
ADD CONSTRAINT "membership_grants_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
