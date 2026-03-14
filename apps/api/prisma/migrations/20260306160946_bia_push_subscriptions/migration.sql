-- BIA community models + PushSubscriptions

CREATE TABLE "forum_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'BIA',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");
CREATE INDEX "forum_categories_tier_idx" ON "forum_categories"("tier");

CREATE TABLE "forum_threads" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "last_post_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "forum_threads_category_id_last_post_at_idx" ON "forum_threads"("category_id", "last_post_at");
CREATE INDEX "forum_threads_author_id_idx" ON "forum_threads"("author_id");

CREATE TABLE "forum_posts" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "forum_posts_thread_id_created_at_idx" ON "forum_posts"("thread_id", "created_at");
CREATE INDEX "forum_posts_author_id_idx" ON "forum_posts"("author_id");

CREATE TABLE "business_listings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "logo_url" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_listings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_listings_user_id_key" ON "business_listings"("user_id");
CREATE INDEX "business_listings_user_id_idx" ON "business_listings"("user_id");
CREATE INDEX "business_listings_category_idx" ON "business_listings"("category");
CREATE INDEX "business_listings_is_approved_idx" ON "business_listings"("is_approved");

CREATE TABLE "mentor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mentor_profiles_user_id_key" ON "mentor_profiles"("user_id");
CREATE INDEX "mentor_profiles_is_active_idx" ON "mentor_profiles"("is_active");

CREATE TABLE "mentor_requests" (
    "id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mentor_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mentor_requests_mentor_id_idx" ON "mentor_requests"("mentor_id");
CREATE INDEX "mentor_requests_mentee_id_idx" ON "mentor_requests"("mentee_id");
CREATE INDEX "mentor_requests_status_idx" ON "mentor_requests"("status");

CREATE TABLE "career_resources" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "career_resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "career_resources_category_idx" ON "career_resources"("category");
CREATE INDEX "career_resources_is_published_idx" ON "career_resources"("is_published");

CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_listings" ADD CONSTRAINT "business_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "career_resources" ADD CONSTRAINT "career_resources_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "forum_categories" ("id", "slug", "name", "description", "tier", "sort_order", "updated_at") VALUES
  (gen_random_uuid(), 'general', 'General', 'General veteran discussion', 'BIA', 1, NOW()),
  (gen_random_uuid(), 'ops-and-tours', 'Ops & Tours', 'Share experiences from operations and tours', 'BIA', 2, NOW()),
  (gen_random_uuid(), 'transition', 'Civvy Street', 'Life after service — jobs, housing, benefits', 'BIA', 3, NOW()),
  (gen_random_uuid(), 'mental-health', 'Mental Health', 'A safe space — no judgment', 'BIA', 4, NOW()),
  (gen_random_uuid(), 'the-bunker', 'The Bunker', 'Premium veteran forum — Plus members only', 'BIA_PLUS', 5, NOW());