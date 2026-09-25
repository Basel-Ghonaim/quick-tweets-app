-- Tweet hashtags: the hashtags each post carries, stored when it is written.
--
-- Safety class: ADDITIVE. One new table with its constraints; no existing table
-- is altered and no existing row changes. There is no backfill: posts written
-- before this carry no hashtags.
--
-- One row per post and key, so counting rows counts posts. The key is TEXT, not
-- VARCHAR(280): folding case can lengthen a tag up to threefold. The foreign key
-- CASCADES, as a like's does: a hashtag holds no media reference, so nothing
-- outlives the row and nothing has to be told the row is gone.

-- CreateTable
CREATE TABLE "tweet_hashtags" (
    "id" SERIAL NOT NULL,
    "tweet_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "spelling" VARCHAR(280) NOT NULL,

    CONSTRAINT "tweet_hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tweet_hashtags_tweet_id_key_key" ON "tweet_hashtags"("tweet_id", "key");

-- AddForeignKey
ALTER TABLE "tweet_hashtags" ADD CONSTRAINT "tweet_hashtags_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
