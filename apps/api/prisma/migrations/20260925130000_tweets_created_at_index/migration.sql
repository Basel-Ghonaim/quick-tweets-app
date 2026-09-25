-- Tweets by creation time: trending counts the posts written in the last week.
--
-- Safety class: ADDITIVE. One index; no table is altered and no row changes.
--
-- An index on created_at was removed once because nothing read it (Finding 0003):
-- the feed orders on id. Trending is its reader now, ranging over the window.

-- CreateIndex
CREATE INDEX "tweets_created_at_idx" ON "tweets"("created_at");
