CREATE TABLE "analytics_page_views" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "load_time_ms" INTEGER,
  "dom_content_loaded_ms" INTEGER,
  "first_paint_ms" INTEGER,
  "first_contentful_paint_ms" INTEGER,
  "largest_contentful_paint_ms" INTEGER,
  "viewport_width" INTEGER,
  "viewport_height" INTEGER,
  "device_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_page_views_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_events" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT,
  "event" TEXT NOT NULL,
  "path" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_page_views_created_at_idx" ON "analytics_page_views"("created_at");
CREATE INDEX "analytics_page_views_path_created_at_idx" ON "analytics_page_views"("path", "created_at");
CREATE INDEX "analytics_page_views_session_id_created_at_idx" ON "analytics_page_views"("session_id", "created_at");
CREATE INDEX "analytics_page_views_user_id_idx" ON "analytics_page_views"("user_id");

CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");
CREATE INDEX "analytics_events_session_id_created_at_idx" ON "analytics_events"("session_id", "created_at");
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events"("user_id");

ALTER TABLE "analytics_page_views"
ADD CONSTRAINT "analytics_page_views_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analytics_events"
ADD CONSTRAINT "analytics_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
