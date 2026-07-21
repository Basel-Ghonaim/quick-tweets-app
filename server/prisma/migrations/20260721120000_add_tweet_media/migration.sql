-- CreateTable
-- The tweets-domain association to media: an *ordered* collection of bare
-- Media References. "media_id" carries no foreign key by design — MediaObject
-- stays unaware of its referrers (ADR 0005 Decision 9) and Media determines
-- referenced-ness from its own registry, never from a feature table (M11).
CREATE TABLE "tweet_media" (
    "id" SERIAL NOT NULL,
    "tweet_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tweet_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tweet_media_tweet_id_position_key" ON "tweet_media"("tweet_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "tweet_media_tweet_id_media_id_key" ON "tweet_media"("tweet_id", "media_id");

-- AddForeignKey
-- ON DELETE RESTRICT, not CASCADE: cascading would drop these rows while the
-- registry still believed the objects were referenced, so they would never be
-- reclaimed. Inert today (no write path exists); becomes a loud failure once
-- media is actually attached — at the point the reference-end coordination
-- contract is due, which supersedes this posture.
ALTER TABLE "tweet_media" ADD CONSTRAINT "tweet_media_tweet_id_fkey" FOREIGN KEY ("tweet_id") REFERENCES "tweets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
-- Retire the reserved "image" scalar: it never had a write path (verified
-- across the full history) and the API contract declared it always null.
-- Superseded by the tweet_media association above.
ALTER TABLE "tweets" DROP COLUMN "image";
