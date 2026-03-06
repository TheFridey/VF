-- Forum Categories
CREATE TABLE "forum_categories" (
  "id"          TEXT         NOT NULL,
  "slug"        TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "description" TEXT         NOT NULL,
  "icon"        TEXT         NOT NULL DEFAULT 'MessageSquare',
  "sort_order"  INTEGER      NOT NULL DEFAULT 0,
  "tier"        TEXT         NOT NULL DEFAULT 'BIA',
  "is_active"   BOOLEAN      NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "forum_categories_slug_key" ON "forum_categories"("slug");
CREATE INDEX "forum_categories_tier_idx" ON "forum_categories"("tier");

-- Forum Threads
CREATE TABLE "forum_threads" (
  "id"           TEXT         NOT NULL,
  "category_id"  TEXT         NOT NULL,
  "author_id"    TEXT         NOT NULL,
  "title"        TEXT         NOT NULL,
  "is_pinned"    BOOLEAN      NOT NULL DEFAULT false,
  "is_locked"    BOOLEAN      NOT NULL DEFAULT false,
  "view_count"   INTEGER      NOT NULL DEFAULT 0,
  "post_count"   INTEGER      NOT NULL DEFAULT 0,
  "last_post_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "forum_threads_category_id_idx" ON "forum_threads"("category_id");
CREATE INDEX "forum_threads_last_post_at_idx" ON "forum_threads"("last_post_at");
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "forum_categories"("id") ON DELETE CASCADE;
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Forum Posts
CREATE TABLE "forum_posts" (
  "id"         TEXT         NOT NULL,
  "thread_id"  TEXT         NOT NULL,
  "author_id"  TEXT         NOT NULL,
  "content"    TEXT         NOT NULL,
  "is_edited"  BOOLEAN      NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "forum_posts_thread_id_idx" ON "forum_posts"("thread_id");
CREATE INDEX "forum_posts_author_id_idx" ON "forum_posts"("author_id");
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE;
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Business Listings
CREATE TABLE "business_listings" (
  "id"          TEXT         NOT NULL,
  "user_id"     TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "description" TEXT         NOT NULL,
  "category"    TEXT         NOT NULL,
  "website"     TEXT,
  "location"    TEXT,
  "logo_url"    TEXT,
  "is_approved" BOOLEAN      NOT NULL DEFAULT false,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_listings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "business_listings_category_idx" ON "business_listings"("category");
CREATE INDEX "business_listings_is_approved_idx" ON "business_listings"("is_approved");
ALTER TABLE "business_listings" ADD CONSTRAINT "business_listings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Mentor Profiles
CREATE TABLE "mentor_profiles" (
  "id"           TEXT         NOT NULL,
  "user_id"      TEXT         NOT NULL,
  "specialisms"  TEXT[]       NOT NULL DEFAULT '{}',
  "bio"          TEXT         NOT NULL,
  "availability" TEXT         NOT NULL,
  "is_active"    BOOLEAN      NOT NULL DEFAULT true,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mentor_profiles_user_id_key" ON "mentor_profiles"("user_id");
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Mentor Requests
CREATE TABLE "mentor_requests" (
  "id"         TEXT         NOT NULL,
  "mentor_id"  TEXT         NOT NULL,
  "mentee_id"  TEXT         NOT NULL,
  "message"    TEXT         NOT NULL,
  "status"     TEXT         NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentor_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mentor_requests_mentor_id_idx" ON "mentor_requests"("mentor_id");
CREATE INDEX "mentor_requests_mentee_id_idx" ON "mentor_requests"("mentee_id");
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentor_id_fkey"
  FOREIGN KEY ("mentor_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "mentor_requests" ADD CONSTRAINT "mentor_requests_mentee_id_fkey"
  FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Career Resources
CREATE TABLE "career_resources" (
  "id"           TEXT         NOT NULL,
  "title"        TEXT         NOT NULL,
  "description"  TEXT         NOT NULL,
  "category"     TEXT         NOT NULL,
  "url"          TEXT,
  "file_url"     TEXT,
  "author_id"    TEXT         NOT NULL,
  "is_published" BOOLEAN      NOT NULL DEFAULT true,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "career_resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "career_resources_category_idx" ON "career_resources"("category");
ALTER TABLE "career_resources" ADD CONSTRAINT "career_resources_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Seed default forum categories
INSERT INTO "forum_categories" ("id", "slug", "name", "description", "icon", "sort_order", "tier") VALUES
  (gen_random_uuid()::text, 'getting-started',    'Getting Started',     'New to VeteranFinder BIA? Start here.',                  'Rocket',        1, 'BIA'),
  (gen_random_uuid()::text, 'introduce-yourself', 'Introduce Yourself',  'Tell the community who you are and where you served.',    'Hand',          2, 'BIA'),
  (gen_random_uuid()::text, 'veterans-support',   'Veterans Support',    'Share experiences, advice and support one another.',      'Heart',         3, 'BIA'),
  (gen_random_uuid()::text, 'general-discussion', 'General Discussion',  'Anything and everything — keep it clean, keep it real.', 'MessageSquare', 4, 'BIA'),
  (gen_random_uuid()::text, 'bunker-general',     'The Bunker',          'BIA+ exclusive — unrestricted discussion.',              'Shield',        5, 'BIA_PLUS'),
  (gen_random_uuid()::text, 'ops-room',           'Ops Room',            'Tactical career and business discussions.',              'Briefcase',     6, 'BIA_PLUS'),
  (gen_random_uuid()::text, 'classified',         'Classified',          'BIA+ members only — the inner circle.',                  'Lock',          7, 'BIA_PLUS');
