/**
 * Trend repository — the ranking, as one SQL query over the hashtags posts carry.
 *
 * Principle: SRP — only executes database queries, no business logic.
 * Principle: Factory Pattern — createTrendRepository(db?) enables mock injection.
 */

import { prisma } from "../../shared/database/index.js";
import type { ITrendRepository, TrendRow } from "./trend.types.js";

type PrismaInstance = typeof prisma;

/**
 * Creates an ITrendRepository backed by Prisma.
 *
 * @param db - Prisma client instance (defaults to singleton, injectable for tests)
 */
export const createTrendRepository = (db: PrismaInstance = prisma): ITrendRepository => ({
  // A row per post and key, so a count of rows is a count of posts. The window is bound, never
  // now(): created_at holds UTC without a zone, and now() would be read in the session's zone.
  findTrending: ({ since, until, minPosts, limit }) =>
    db.$queryRaw<TrendRow[]>`
      WITH recent AS (
        SELECT h.key, h.spelling, h.tweet_id
          FROM tweet_hashtags h
          JOIN tweets t ON t.id = h.tweet_id
         WHERE t.created_at >= ${since} AND t.created_at <= ${until}
      ), ranked AS (
        SELECT key, COUNT(*) AS posts, MAX(tweet_id) AS latest
          FROM recent
         GROUP BY key
        HAVING COUNT(*) >= ${minPosts}::int
      ), shown AS (
        SELECT DISTINCT ON (key) key, spelling
          FROM recent
         WHERE key IN (SELECT key FROM ranked)
         GROUP BY key, spelling
         ORDER BY key, COUNT(*) DESC, MAX(tweet_id) DESC, spelling COLLATE "C"
      )
      SELECT s.spelling, r.posts::int AS "tweetsCount"
        FROM ranked r
        JOIN shown s USING (key)
       ORDER BY r.posts DESC, r.latest DESC, r.key COLLATE "C"
       LIMIT ${limit}::int`,
});
