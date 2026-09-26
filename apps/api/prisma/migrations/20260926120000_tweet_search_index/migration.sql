-- Searching posts by their words: one function that reads a text as search compares it,
-- and a GIN index over what it makes of each post's body.
--
-- Safety class: ADDITIVE. One function and one index; no table is altered and no row
-- changes. The index covers every post, including those written before this.
--
-- search_text() is the hashtags' Arabic letter rule in SQL: NFC, the nonspacing marks
-- of the Arabic block and tatweel removed, and the alef forms read as alef. The same
-- rule lives in shared/hashtags (hashtagKey), and an integration test keeps the two in
-- agreement across the whole Arabic block. Case is left to to_tsvector.
--
-- Prisma can express neither a function nor an expression index, and leaves both alone:
-- a diff from a database holding them against schema.prisma is empty. A query uses the
-- index only when it repeats the indexed expression exactly.

-- CreateFunction
CREATE FUNCTION search_text(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  RETURN translate(
    regexp_replace(normalize(t, NFC), U&'[\0610-\061A\064B-\065F\0670\06D6-\06DC\06DF-\06E4\06E7\06E8\06EA-\06ED\0640]', '', 'g'),
    U&'\0622\0623\0625\0671',
    U&'\0627\0627\0627\0627'
  );

-- CreateIndex
CREATE INDEX "tweets_search_idx" ON "tweets" USING GIN (to_tsvector('simple', search_text("body")));
