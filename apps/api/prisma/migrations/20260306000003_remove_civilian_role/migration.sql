-- Migration: Remove CIVILIAN role from UserRole enum
-- This platform is veteran-only; unregistered veterans use VETERAN_UNVERIFIED

-- Step 1: Update any remaining CIVILIAN users to VETERAN_UNVERIFIED
UPDATE "users" SET role = 'VETERAN_UNVERIFIED' WHERE role = 'CIVILIAN';

-- Step 2: Change the default
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VETERAN_UNVERIFIED';

-- Note: PostgreSQL does not support removing enum values directly.
-- The CIVILIAN value will remain in the enum type but will no longer be
-- used or assignable through the application layer.
-- If you need to fully remove it, you would need to recreate the enum type.
