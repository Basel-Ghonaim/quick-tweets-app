/**
 * Real producer paths, bound to a DisposableMediaEnv (WI-B, #375).
 *
 * The referenced / reference-ended fixtures are built by driving the ACTUAL
 * Tweet / Comment / Avatar use-cases (not hand-seeded ledger rows), so reference
 * coordination itself is under test. Every service is constructed with the
 * disposable Prisma client, the disposable transaction runner, and a media port
 * bound to the same client — so all coordination lands in the disposable DB.
 *
 * Verification-only; never imported by production code.
 */

import { Readable } from "node:stream";

import { createCommentRepository } from "../../comments/comment.repository.js";
import { createCommentService } from "../../comments/comment.service.js";
import { createTweetRepository } from "../../tweets/tweet.repository.js";
import { createTweetService } from "../../tweets/tweet.service.js";
import { createUserRepository } from "../../users/user.repository.js";
import { createUserService } from "../../users/user.service.js";
import { storageKey } from "../media.keys.js";
import { createMediaOwnership } from "../media.ownership.js";
import { createMediaReferences } from "../media.references.js";
import { createMediaRepository } from "../media.repository.js";
import { createMediaResolution } from "../media.resolution.js";
import { mintToken } from "../media.tokens.js";
import type { DisposableMediaEnv } from "./disposable-env.js";

/** The producer services + media port, all bound to the disposable env. */
export const boundServices = (env: DisposableMediaEnv) => {
  const mediaRepo = createMediaRepository(env.prisma);
  const port = {
    ownership: createMediaOwnership(mediaRepo),
    references: createMediaReferences(mediaRepo),
    resolution: createMediaResolution(mediaRepo),
  };
  return {
    port,
    tweets: createTweetService(createTweetRepository(env.prisma), port, env.runInTransaction),
    comments: createCommentService(createCommentRepository(env.prisma), port, env.runInTransaction),
    users: createUserService(createUserRepository(env.prisma), port, env.runInTransaction),
  };
};

let userSeq = 0;
let objSeq = 0;

/** A fresh user (author/uploader) in the disposable DB. */
export const seedUser = async (env: DisposableMediaEnv): Promise<number> => {
  userSeq += 1;
  const user = await env.prisma.user.create({
    data: {
      username: `wib-u${userSeq}`,
      name: `WIB ${userSeq}`,
      email: `wib-u${userSeq}@verify.local`,
      passwordHash: "x",
    },
  });
  return user.id;
};

/** A ready, owned MediaObject (optionally with real bytes and a chosen createdAt). */
export const seedOwnedReady = async (
  env: DisposableMediaEnv,
  opts: {
    userId: number;
    createdAt?: Date;
    contentType?: string;
    size?: number;
    withBytes?: boolean;
  },
): Promise<{ id: number; token: string; key: string }> => {
  objSeq += 1;
  const key = `objects/wibr-${objSeq}`;
  const token = mintToken();
  const obj = await env.prisma.mediaObject.create({
    data: {
      token,
      storageKey: key,
      contentType: opts.contentType ?? "image/png",
      size: opts.size ?? 3,
      status: "ready",
      uploaderId: opts.userId,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    },
  });
  if (opts.withBytes ?? true) {
    await env.storage.save(storageKey(key), Readable.from([Buffer.from("abc")]));
  }
  return { id: obj.id, token, key };
};

/** Bytes at a key with NO registry row — the orphan-bytes fixture. */
export const seedOrphanBytes = async (env: DisposableMediaEnv): Promise<{ key: string }> => {
  objSeq += 1;
  const key = `objects/wibr-orphan-${objSeq}`;
  await env.storage.save(storageKey(key), Readable.from([Buffer.from("abc")]));
  return { key };
};

/** Open a quarantine row against an object (the excluded-from-selection fixture). */
export const seedOpenQuarantine = async (
  env: DisposableMediaEnv,
  mediaId: number,
  key: string,
): Promise<void> => {
  await env.prisma.mediaQuarantine.create({
    data: { mediaId, storageKey: key, kind: "row_without_bytes", detail: "", detectedAt: new Date(0) },
  });
};

// ─── Real producer drivers ───────────────────────────────────────────────────

/** Attach `token` to a new tweet — reference begins under `tweet:{id}`. */
export const referenceViaTweet = async (
  env: DisposableMediaEnv,
  authorId: number,
  token: string,
): Promise<number> => {
  const tweet = await boundServices(env).tweets.create(authorId, "wib tweet", [token]);
  return tweet.id;
};

/** End a tweet's media reference by replacing its media set with the empty set. */
export const endTweetReference = async (
  env: DisposableMediaEnv,
  tweetId: number,
  authorId: number,
): Promise<void> => {
  await boundServices(env).tweets.update(tweetId, authorId, { media: [] });
};

/** Attach `token` to a new comment on `tweetId` — reference begins under `comment:{id}`. */
export const referenceViaComment = async (
  env: DisposableMediaEnv,
  authorId: number,
  tweetId: number,
  token: string,
): Promise<number> => {
  const comment = await boundServices(env).comments.create(authorId, tweetId, "wib comment", token);
  return comment.id;
};

/** End a comment's media reference by deleting the comment. */
export const endCommentReference = async (
  env: DisposableMediaEnv,
  commentId: number,
  authorId: number,
): Promise<void> => {
  await boundServices(env).comments.delete(commentId, authorId);
};

/** Set `token` as the user's avatar via PATCH /users/me — reference begins under `user-avatar:{id}`. */
export const referenceViaAvatar = async (
  env: DisposableMediaEnv,
  userId: number,
  token: string,
): Promise<void> => {
  await boundServices(env).users.updateMe(userId, { avatar: { token } });
};

/** Remove the user's avatar via PATCH /users/me — reference ends. */
export const endAvatarReference = async (env: DisposableMediaEnv, userId: number): Promise<void> => {
  await boundServices(env).users.updateMe(userId, { avatar: null });
};
