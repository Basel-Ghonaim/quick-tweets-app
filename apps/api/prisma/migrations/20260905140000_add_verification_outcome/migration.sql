-- Onboarding Journey: how the verification step ended.
--
-- Safety class: ALTERING — one column and two constraints on a populated table.
-- Nothing is backfilled and no existing row is rewritten.
--
-- Why it is derived rather than asserted, unlike the profile step's outcome:
-- that step had no witness but the reader, so the client states it. This one
-- has an owner. Channel Verification is the sole authority on whether a channel
-- is proven, so the journey reads that capability's published projection when it
-- closes and records what it said. What is stored is an observation at a moment,
-- not a claim: the projection stays authoritative afterwards, and the two may
-- diverge later exactly as that capability already documents.
--
-- No backfill, deliberately. An outcome for a journey closed before this column
-- existed would be a claim about a moment that has gone, and no reading taken
-- today can stand in for it.

-- AlterTable
ALTER TABLE "onboarding_journeys" ADD COLUMN "verification_outcome" TEXT;

-- The vocabulary is closed. A NULL satisfies a CHECK, so the rows that predate
-- the column do not violate this and it is added validated.
ALTER TABLE "onboarding_journeys"
ADD CONSTRAINT "onboarding_journeys_verification_outcome_values"
CHECK ("verification_outcome" IS NULL OR "verification_outcome" IN ('verified', 'later'));

-- A closed journey carries an outcome. NOT VALID, because every journey closed
-- before this column has none and nothing can supply one. Postgres enforces a
-- NOT VALID check on every insert and update from here on and skips only the
-- rows that predate it — the past is tolerated, the future is not. This is the
-- same shape the profile outcome's presence constraint takes, for the same
-- reason.
ALTER TABLE "onboarding_journeys"
ADD CONSTRAINT "onboarding_journeys_verification_outcome_present"
CHECK ("closed_at" IS NULL OR "verification_outcome" IS NOT NULL) NOT VALID;
