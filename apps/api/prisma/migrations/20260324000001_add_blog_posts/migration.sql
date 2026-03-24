-- CreateEnum
CREATE TYPE "post_status" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "status" "post_status" NOT NULL DEFAULT 'DRAFT',
    "publish_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "author_id" TEXT NOT NULL,
    "tags" TEXT[],
    "meta_title" TEXT,
    "meta_description" TEXT,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "read_time_minutes" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_views" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "referrer" TEXT,
    "read_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_status_publish_at_idx" ON "posts"("status", "publish_at");

-- CreateIndex
CREATE INDEX "posts_slug_idx" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "post_views_post_id_idx" ON "post_views"("post_id");

-- CreateIndex
CREATE INDEX "post_views_post_id_created_at_idx" ON "post_views"("post_id", "created_at");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
