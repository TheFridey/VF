-- Restore security columns dropped by 20260305165201_init

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_failed_login_at"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "password_changed_at"   TIMESTAMP(3);

-- Restore password_history table (also dropped by that migration)
CREATE TABLE IF NOT EXISTS "password_history" (
    "id"           TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "password_history_user_id_idx" ON "password_history"("user_id");
ALTER TABLE "password_history"
  ADD CONSTRAINT "password_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
