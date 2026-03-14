-- Migration part 1 of 2: Add VETERAN_MEMBER enum value
-- Must be in its own migration so it commits before being used in DML
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VETERAN_MEMBER';
