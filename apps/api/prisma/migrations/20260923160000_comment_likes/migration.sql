-- Comment likes: a reader may like a comment, as they already like a post.
--
-- Safety class: ADDITIVE. One new table with its constraints; no existing table
-- is altered and no existing row changes.
--
-- Both foreign keys CASCADE, and that is the difference from the comments table
-- itself. A like holds no media reference, so nothing outlives the row and
-- nothing has to be told the row is gone; deleting a comment may therefore take
-- its likes at the database, where deleting a comment's replies may not.
--
-- The unique pair is the idempotency: a second like cannot become a second row,
-- so setting a like the reader already holds is refused by the database rather
-- than by a check the service would have to win a race on.

-- CreateTable
CREATE TABLE "comment_likes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_likes_comment_id_idx" ON "comment_likes"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_likes_user_id_comment_id_key" ON "comment_likes"("user_id", "comment_id");

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
