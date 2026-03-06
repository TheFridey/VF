-- Add password_changed_at column (the lockout columns were added in 20260220_add_account_lockout)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP(3);

-- Password history table — stores hashes of last 10 passwords per user
CREATE TABLE IF NOT EXISTS "password_history" (
  "id"            TEXT         NOT NULL,
  "user_id"       TEXT         NOT NULL,
  "password_hash" TEXT         NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "password_history_user_id_idx" ON "password_history"("user_id");
CREATE INDEX IF NOT EXISTS "password_history_created_at_idx" ON "password_history"("created_at");

ALTER TABLE "password_history"
  DROP CONSTRAINT IF EXISTS "password_history_user_id_fkey";

ALTER TABLE "password_history"
  ADD CONSTRAINT "password_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
