/**
 * Trend module type definitions — the ranking's input and rows, and the response.
 *
 * Principle: DIP — the service depends on ITrendRepository, not on Prisma.
 */

/** What the ranking is asked: posts written in [since, until], a threshold, and a length. */
export interface TrendQuery {
  since: Date;
  until: Date;
  minPosts: number;
  limit: number;
}

/** One ranked hashtag: the spelling most of its posts used, and how many posts used it. */
export interface TrendRow {
  spelling: string;
  tweetsCount: number;
}

/** One trend on the wire. `tag` carries its `#`, so it is already a hashtag search. */
export interface TrendResponse {
  tag: string;
  tweetsCount: number;
}

export interface ITrendRepository {
  findTrending(query: TrendQuery): Promise<TrendRow[]>;
}

export interface ITrendService {
  getTrending(): Promise<TrendResponse[]>;
}
