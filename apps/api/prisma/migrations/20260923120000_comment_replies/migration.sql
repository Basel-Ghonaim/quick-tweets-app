-- Comments: a comment may answer another comment.
--
-- Safety class: ADDITIVE. One nullable column, two indexes and one foreign key
-- are added. No existing row changes and nothing is dropped: every comment that
-- exists today reads as a top-level comment, which is what it already was.
--
-- The foreign key is ON DELETE RESTRICT rather than CASCADE, for the reason
-- comments_tweet_id_fkey already carries: a reply may hold a media reference, so
-- a database cascade would drop the row while the registry still believed the
-- object referenced, leaking it permanently. Deleting a parent goes through the
-- coordinated application use-case, which ends each reply's reference and
-- removes the replies before their parent. RESTRICT turns any bypass into a loud
-- failure instead of a silent leak.

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "parent_id" INTEGER;

-- CreateIndex
CREATE INDEX "comments_replies_idx" ON "comments"("parent_id", "id");

-- CreateIndex
-- Partial: the replies are excluded from the thread page, and would otherwise be
-- the bulk of the rows this index carries.
CREATE INDEX "comments_thread_idx" ON "comments"("tweet_id", "id") WHERE "parent_id" IS NULL;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
