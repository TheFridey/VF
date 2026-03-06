/*
  Warnings:

  - You are about to drop the column `failed_login_attempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_failed_login_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `locked_until` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_changed_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `business_listings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `career_resources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `forum_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `forum_posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `forum_threads` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mentor_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mentor_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `password_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profile_views` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `push_subscriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `undo_swipes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "business_listings" DROP CONSTRAINT "business_listings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "career_resources" DROP CONSTRAINT "career_resources_author_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_posts" DROP CONSTRAINT "forum_posts_author_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_posts" DROP CONSTRAINT "forum_posts_thread_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_threads" DROP CONSTRAINT "forum_threads_author_id_fkey";

-- DropForeignKey
ALTER TABLE "forum_threads" DROP CONSTRAINT "forum_threads_category_id_fkey";

-- DropForeignKey
ALTER TABLE "mentor_profiles" DROP CONSTRAINT "mentor_profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "mentor_requests" DROP CONSTRAINT "mentor_requests_mentee_id_fkey";

-- DropForeignKey
ALTER TABLE "mentor_requests" DROP CONSTRAINT "mentor_requests_mentor_id_fkey";

-- DropForeignKey
ALTER TABLE "password_history" DROP CONSTRAINT "password_history_user_id_fkey";

-- DropForeignKey
ALTER TABLE "profile_views" DROP CONSTRAINT "profile_views_viewed_id_fkey";

-- DropForeignKey
ALTER TABLE "profile_views" DROP CONSTRAINT "profile_views_viewer_id_fkey";

-- DropForeignKey
ALTER TABLE "push_subscriptions" DROP CONSTRAINT "push_subscriptions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "undo_swipes" DROP CONSTRAINT "undo_swipes_user_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "failed_login_attempts",
DROP COLUMN "last_failed_login_at",
DROP COLUMN "locked_until",
DROP COLUMN "password_changed_at";

-- DropTable
DROP TABLE "business_listings";

-- DropTable
DROP TABLE "career_resources";

-- DropTable
DROP TABLE "forum_categories";

-- DropTable
DROP TABLE "forum_posts";

-- DropTable
DROP TABLE "forum_threads";

-- DropTable
DROP TABLE "mentor_profiles";

-- DropTable
DROP TABLE "mentor_requests";

-- DropTable
DROP TABLE "password_history";

-- DropTable
DROP TABLE "profile_views";

-- DropTable
DROP TABLE "push_subscriptions";

-- DropTable
DROP TABLE "undo_swipes";
