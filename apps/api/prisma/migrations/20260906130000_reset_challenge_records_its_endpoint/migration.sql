-- Password Reset: the credential records the address it was sent to.
--
-- Safety class: ALTERING + BACKFILL. One column added to a populated table and
-- filled for the rows already in it.
--
-- Why: a completed reset proves the endpoint the code was delivered to (ADR
-- 0017 Decision 6), and that endpoint must be the one frozen at mint. Resolving
-- the account's address at completion instead would prove an address nobody
-- demonstrated, if it changed mid-flow.
--
-- The backfill takes each row's account address as it stands now. That is a
-- best available reading rather than a record of what was sent -- but every
-- existing credential is spent or expired within ten minutes of its creation,
-- so none of them can reach a completion that would use it.

-- AlterTable
ALTER TABLE "password_reset_challenges" ADD COLUMN "endpoint" TEXT;

UPDATE "password_reset_challenges" c
SET "endpoint" = u."email"
FROM "users" u
WHERE u."id" = c."user_id" AND c."endpoint" IS NULL;

-- Every row now has one, and nothing may create one without it.
ALTER TABLE "password_reset_challenges" ALTER COLUMN "endpoint" SET NOT NULL;
