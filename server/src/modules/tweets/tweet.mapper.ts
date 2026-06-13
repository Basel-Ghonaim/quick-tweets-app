/**
 * Tweet DTO mapper — transforms raw DB tweets into frontend response shape.
 *
 * This is extracted from the service layer so it can be shared across modules
 * (e.g., user service also returns tweets) without creating service-to-service
 * cross-module imports, which would violate modular architecture.
 *
 * Mapping:
 *   _count.likes    → likesCount
 *   _count.comments → commentsCount
 *   likes[]         → isLiked (true if array has items)
 *
 * Principle: DRY — single source of truth for tweet DTO transformation.
 * Principle: SRP — only transforms data, no business logic.
 */

import type { TweetWithRelations, TweetResponse } from "./tweet.types.js";

export const toTweetResponse = (tweet: TweetWithRelations): TweetResponse => ({
  id: tweet.id,
  body: tweet.body,
  image: tweet.image,
  author: tweet.author,
  likesCount: tweet._count.likes,
  commentsCount: tweet._count.comments,
  isLiked: (tweet.likes?.length ?? 0) > 0,
  createdAt: tweet.createdAt,
  updatedAt: tweet.updatedAt,
});
