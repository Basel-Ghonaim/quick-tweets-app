-- Posts and comments record when their text was edited.
--
-- Safety class: ADDITIVE. Two nullable columns; no existing row changes and
-- nothing is dropped.
--
-- Why a column rather than a derived rule: `tweets.updated_at` is Prisma's
-- @updatedAt, maintained by the client rather than by the database, and it moves
-- whenever an update carries a field -- so re-saving the same words moves it. A
-- marker derived from it would announce an edit that never happened. `comments`
-- has no update timestamp at all.
--
-- NO BACKFILL, and this is a deliberate one-way door. Every existing row reads
-- as never edited, including rows that were in fact edited before this applied;
-- that information is not recoverable and is not recovered. Accepted by the
-- owner on 2026-09-23: the data is test data, no real user holds it, and v1 has
-- no released consumer. Stated here so a later reader meets an assumption rather
-- than inferring one from a null.

-- AlterTable
ALTER TABLE "tweets" ADD COLUMN     "edited_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "edited_at" TIMESTAMP(3);
