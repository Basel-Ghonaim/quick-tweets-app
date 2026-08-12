/**
 * deleteTweet — a cross-aggregate application use-case (Comment Media).
 *
 * Deleting a tweet also deletes its comments, and both may hold media
 * references that must be *ended* (a DB cascade would drop the rows silently
 * and leak the references). Neither feature may depend on the other (ADR 0005
 * Decision 2), so the coordination lives here, in the application layer that
 * composes both.
 *
 * This orchestrator holds **no** reference logic and **no** authorization logic
 * of its own — each feature owns its references (`comments.deleteForTweet` ends
 * `comment:{id}`, `tweets.deleteWithMedia` ends `tweet:{id}`) and its rules
 * (`tweets.assertOwner`). The use-case only sequences them, inside one
 * transaction:
 *
 *   1. assert ownership — in-transaction, first (no external check);
 *   2. delete the dependent comments (ending their references);
 *   3. delete the tweet (ending its references; likes still cascade at the DB).
 *
 * Any failure rolls the whole chain back — no half-deletion, no half-ended
 * ledger.
 */

import {
  runInTransaction as defaultRunInTransaction,
  type RunInTransaction,
} from "../shared/database/index.js";
import { createCommentService } from "../modules/comments/comment.service.js";
import { createTweetService } from "../modules/tweets/tweet.service.js";
import type { ICommentService } from "../modules/comments/comment.types.js";
import type { ITweetService } from "../modules/tweets/tweet.types.js";

export interface DeleteTweetDeps {
  tweets: Pick<ITweetService, "assertOwner" | "deleteWithMedia">;
  comments: Pick<ICommentService, "deleteForTweet">;
  runInTransaction: RunInTransaction;
}

export type DeleteTweet = (tweetId: number, userId: number) => Promise<void>;

export const createDeleteTweet = (deps: Partial<DeleteTweetDeps> = {}): DeleteTweet => {
  const tweets = deps.tweets ?? createTweetService();
  const comments = deps.comments ?? createCommentService();
  const runInTransaction = deps.runInTransaction ?? defaultRunInTransaction;

  return (tweetId, userId) =>
    runInTransaction(async (tx) => {
      await tweets.assertOwner(tweetId, userId, tx);
      await comments.deleteForTweet(tweetId, tx);
      await tweets.deleteWithMedia(tweetId, tx);
    });
};
