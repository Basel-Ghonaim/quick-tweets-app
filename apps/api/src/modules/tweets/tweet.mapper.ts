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
 *   follow state    → author.isFollowing / author.followsYou (supplied, per page)
 *
 * Principle: DRY — single source of truth for tweet DTO transformation.
 * Principle: SRP — only transforms data, no business logic.
 */

import { toAuthorEmbed } from "../../shared/utils/index.js";
import { NO_FOLLOW_STATE, type FollowState } from "../../shared/social/index.js";
import type { TweetWithRelations, TweetResponse } from "./tweet.types.js";

/**
 * Resolved read tokens, keyed by internal media reference. Supplied by the
 * caller rather than looked up here: resolution is one batched query per page,
 * and the mapper stays pure and synchronous.
 *
 * A media reference missing from the map is **omitted** from the response — Media
 * only resolves servable objects, so surfacing it would hand the client a token
 * that cannot be read.
 */
export type ResolvedMediaTokens = ReadonlyMap<number, string>;

export const toTweetResponse = (
  tweet: TweetWithRelations,
  tokens: ResolvedMediaTokens = new Map(),
  follow: FollowState = NO_FOLLOW_STATE,
): TweetResponse => ({
  id: tweet.id,
  body: tweet.body,
  media: tweet.media.flatMap((ref) => {
    const token = tokens.get(ref.mediaId);
    return token === undefined ? [] : [{ token }];
  }),
  author: { ...toAuthorEmbed(tweet.author, tokens), ...follow },
  likesCount: tweet._count.likes,
  commentsCount: tweet._count.comments,
  isLiked: (tweet.likes?.length ?? 0) > 0,
  createdAt: tweet.createdAt,
  updatedAt: tweet.updatedAt,
  editedAt: tweet.editedAt,
});
