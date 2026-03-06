-- CreateTable: profile_views
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "viewed_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable: undo_swipes
CREATE TABLE "undo_swipes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "undo_swipes_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "profile_views_viewer_id_viewed_id_key" ON "profile_views"("viewer_id", "viewed_id");
CREATE INDEX "profile_views_viewed_id_idx" ON "profile_views"("viewed_id");
CREATE INDEX "profile_views_created_at_idx" ON "profile_views"("created_at");
CREATE INDEX "undo_swipes_user_id_idx" ON "undo_swipes"("user_id");
CREATE INDEX "undo_swipes_created_at_idx" ON "undo_swipes"("created_at");

-- Foreign Keys
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewed_id_fkey" FOREIGN KEY ("viewed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "undo_swipes" ADD CONSTRAINT "undo_swipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
