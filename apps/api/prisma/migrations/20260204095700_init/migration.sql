-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CIVILIAN', 'VETERAN_UNVERIFIED', 'VETERAN_VERIFIED', 'VETERAN_PAID', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_DELETION', 'DELETED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "MilitaryBranch" AS ENUM ('ARMY', 'NAVY', 'AIR_FORCE', 'MARINE_CORPS', 'COAST_GUARD', 'SPACE_FORCE', 'NATIONAL_GUARD');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('DATING', 'BROTHERS');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE_PROFILE', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'SPAM', 'SCAM', 'IMPERSONATION', 'UNDERAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'DISMISSED', 'ACTION_TAKEN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CIVILIAN',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "email_verification_expires" TIMESTAMP(3),
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "refresh_token_hash" TEXT,
    "refresh_token_expires_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "ban_reason" TEXT,
    "ban_expires_at" TIMESTAMP(3),
    "deletion_requested_at" TIMESTAMP(3),
    "scheduled_deletion_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "bio" TEXT,
    "gender" "Gender",
    "date_of_birth" TIMESTAMP(3),
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "profile_image_url" TEXT,
    "looking_for" "Gender"[] DEFAULT ARRAY[]::"Gender"[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veteran_details" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch" "MilitaryBranch",
    "rank" TEXT,
    "mos" TEXT,
    "duty_stations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deployments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veteran_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_periods" (
    "id" TEXT NOT NULL,
    "veteran_details_id" TEXT NOT NULL,
    "branch" "MilitaryBranch" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "unit" TEXT,
    "duty_station" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "evidence_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidence_deleted_at" TIMESTAMP(3),
    "notes" TEXT,
    "rejection_reason" TEXT,
    "reviewer_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "user1_id" TEXT NOT NULL,
    "user2_id" TEXT NOT NULL,
    "match_type" "MatchType" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "overlap_score" DOUBLE PRECISION,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "encrypted_content" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "liker_id" TEXT NOT NULL,
    "liked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reported_user_id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "evidence_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolution" TEXT,
    "resolver_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_location_idx" ON "profiles"("location");

-- CreateIndex
CREATE INDEX "profiles_is_visible_idx" ON "profiles"("is_visible");

-- CreateIndex
CREATE UNIQUE INDEX "veteran_details_user_id_key" ON "veteran_details"("user_id");

-- CreateIndex
CREATE INDEX "service_periods_branch_idx" ON "service_periods"("branch");

-- CreateIndex
CREATE INDEX "service_periods_start_date_end_date_idx" ON "service_periods"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE INDEX "verification_requests_created_at_idx" ON "verification_requests"("created_at");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_match_type_idx" ON "matches"("match_type");

-- CreateIndex
CREATE INDEX "matches_last_message_at_idx" ON "matches"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "matches_user1_id_user2_id_match_type_key" ON "matches"("user1_id", "user2_id", "match_type");

-- CreateIndex
CREATE INDEX "messages_match_id_created_at_idx" ON "messages"("match_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "messages_receiver_id_idx" ON "messages"("receiver_id");

-- CreateIndex
CREATE INDEX "likes_liked_id_idx" ON "likes"("liked_id");

-- CreateIndex
CREATE UNIQUE INDEX "likes_liker_id_liked_id_key" ON "likes"("liker_id", "liked_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_reported_user_id_idx" ON "reports"("reported_user_id");

-- CreateIndex
CREATE INDEX "reports_created_at_idx" ON "reports"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veteran_details" ADD CONSTRAINT "veteran_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_periods" ADD CONSTRAINT "service_periods_veteran_details_id_fkey" FOREIGN KEY ("veteran_details_id") REFERENCES "veteran_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_liker_id_fkey" FOREIGN KEY ("liker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_liked_id_fkey" FOREIGN KEY ("liked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolver_id_fkey" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
