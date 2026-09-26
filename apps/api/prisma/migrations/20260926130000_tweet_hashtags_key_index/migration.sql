-- Tweet hashtags by key: a hashtag search finds the posts carrying one key.
--
-- Safety class: ADDITIVE. One index; no table is altered and no row changes.
--
-- The unique (tweet_id, key) serves reading one post's hashtags; this is the other
-- direction, from a hashtag to its posts, with the post id second so a page of them
-- comes back in order.

-- CreateIndex
CREATE INDEX "tweet_hashtags_key_tweet_id_idx" ON "tweet_hashtags"("key", "tweet_id");
