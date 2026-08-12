-- Flip the comment→tweet foreign key from CASCADE to RESTRICT.
--
-- A comment may hold a media reference (comment:{id} in the registry). Under
-- CASCADE, deleting a tweet drops its comment rows while the registry still
-- believes their objects are referenced — a silent leak. RESTRICT refuses to
-- delete a tweet while any comment references it, forcing deletion through the
-- coordinated application use-case (which ends the references and deletes the
-- comments first). Only this relationship changes: the author (User) cascade
-- and the likes cascade hold no references and are left untouched.
ALTER TABLE "comments" DROP CONSTRAINT "comments_tweet_id_fkey";

ALTER TABLE "comments" ADD CONSTRAINT "comments_tweet_id_fkey"
  FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
