/**
 * Trend service — what is trending: the hashtags the most posts used in the last week.
 *
 * Principle: SRP — the rule (window, threshold, length) lives here; the ranking is the repository's.
 * Principle: Factory Pattern — createTrendService(repo?, now?) for DI and testability.
 */

import { createTrendRepository } from "./trend.repository.js";
import type { ITrendRepository, ITrendService } from "./trend.types.js";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_POSTS = 2;
const MAX_TRENDS = 5;

/**
 * Creates an ITrendService with injected dependencies.
 *
 * @param repo - The ranking (defaults to Prisma implementation)
 * @param now - The clock the window is measured back from
 */
export const createTrendService = (
  repo: ITrendRepository = createTrendRepository(),
  now: () => Date = () => new Date(),
): ITrendService => ({
  getTrending: async () => {
    const until = now();
    const rows = await repo.findTrending({
      since: new Date(until.getTime() - WINDOW_MS),
      until,
      minPosts: MIN_POSTS,
      limit: MAX_TRENDS,
    });
    return rows.map((row) => ({ tag: `#${row.spelling}`, tweetsCount: row.tweetsCount }));
  },
});
