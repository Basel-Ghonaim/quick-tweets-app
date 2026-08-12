-- Make users.name optional: name is optional profile data — absent = NULL, never
-- defaulted or derived from username. Safe widening: existing values are preserved,
-- nothing is backfilled, and new registrations insert NULL.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;
