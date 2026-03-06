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

-- AlterTable
ALTER TABLE "business_listings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "career_resources" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "forum_posts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "forum_threads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mentor_profiles" ALTER COLUMN "specialisms" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mentor_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_listings" ADD CONSTRAINT "business_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_resources" ADD CONSTRAINT "career_resources_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
