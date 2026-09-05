-- Onboarding Journey: how the profile step was left.
--
-- Safety class: ALTERING + BACKFILL — not additive, unlike the migration that
-- created this table. It adds a column to a populated table, writes to existing
-- rows, and adds two constraints. Read the backfill before applying it.
--
-- Why the column exists: `profile_settled_at` records that the step ended and
-- not how. Saving a profile and skipping it are the same transition, so a
-- skipped step is indistinguishable from a completed one. That difference is a
-- state of the journey, so it is stored here rather than remembered by a client
-- that loses it on reload.
--
-- Why the client asserts it: no authoritative server-side source exists.
-- Reading it off the profile's fields would be a proxy — a reader who saves a
-- sparse profile and a reader who skips leave identical data behind. The
-- reader's own choice is the only witness.

-- AlterTable
ALTER TABLE "onboarding_journeys" ADD COLUMN "profile_outcome" TEXT;

-- Backfill: close every journey that predates the column.
--
-- These rows carry a settled profile and no outcome, and nothing can supply one
-- without inventing it. Closing them puts each at phase "none", where no
-- onboarding screen renders and the undefined outcome is never read. The rows
-- are kept: this table's permanence invariant is that a journey is created once
-- and never deleted, and a closed journey is what makes a finished one finished
-- rather than merely missing.
--
-- Each closes at the step it actually stood on, so `closed_reason` stays true.
UPDATE "onboarding_journeys"
SET "closed_at" = CURRENT_TIMESTAMP,
    "closed_reason" = CASE WHEN "code_reached_at" IS NOT NULL THEN 'code' ELSE 'verify' END
WHERE "closed_at" IS NULL;

-- The vocabulary is closed. A NULL satisfies a CHECK, so the rows above do not
-- violate this and it is added validated.
ALTER TABLE "onboarding_journeys"
ADD CONSTRAINT "onboarding_journeys_profile_outcome_values"
CHECK ("profile_outcome" IS NULL OR "profile_outcome" IN ('saved', 'skipped'));

-- A settled profile carries an outcome. NOT VALID, because the backfilled rows
-- above still violate it — closing a journey sets `closed_at` and does not
-- clear `profile_settled_at`. Postgres enforces a NOT VALID check on every
-- insert and update from here on and only skips the rows that predate it, which
-- is exactly the guarantee wanted: the past is tolerated, the future is not.
ALTER TABLE "onboarding_journeys"
ADD CONSTRAINT "onboarding_journeys_profile_outcome_present"
CHECK ("profile_settled_at" IS NULL OR "profile_outcome" IS NOT NULL) NOT VALID;
