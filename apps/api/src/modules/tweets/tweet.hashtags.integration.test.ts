/**
 * A post's hashtags against a REAL Postgres. Run with `npm run test:integration`.
 *
 * That they are written with the post, replaced by a text edit, kept by an image edit and
 * dropped with the post is the database's to say. So is the table the migration made.
 *
 * TAG-scoped: every row carries the tag, and only tagged rows are removed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { hashtagKey } from "../../shared/hashtags/index.js";
import { createDeleteTweet } from "../../application/deleteTweet.js";
import { createCommentService } from "../comments/comment.service.js";
import { createTweetService } from "./tweet.service.js";

const TAG = `ithash${process.pid}x${Math.floor(process.hrtime()[1])}`;
const tweets = createTweetService();
const comments = createCommentService();
const deleteTweet = createDeleteTweet();

let reachable = false;
let authorId = 0;
let seq = 0;

/** A real, ready image owned by the author, so an edit to the images takes the path it takes in use. */
const readyImage = async () => {
  seq += 1;
  const token = `${TAG}-tok-${seq}`;
  await prisma.mediaObject.create({
    data: { token, storageKey: `objects/${TAG}-${seq}`, contentType: "image/png", size: 10, status: "ready", uploaderId: authorId },
  });
  return token;
};

const stored = (tweetId: number) =>
  prisma.tweetHashtag.findMany({ where: { tweetId }, select: { key: true, spelling: true }, orderBy: { id: "asc" } });

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  const user = await prisma.user.create({
    data: { username: TAG, email: `${TAG}@it.local`, passwordHash: "x" },
  });
  authorId = user.id;
}, 30_000);

afterAll(async () => {
  if (reachable) {
    await prisma.comment.deleteMany({ where: { authorId } });
    // Media rows first: their foreign key to the post is RESTRICT.
    await prisma.tweetMedia.deleteMany({ where: { tweet: { authorId } } });
    await prisma.tweet.deleteMany({ where: { authorId } });
    await prisma.mediaReference.deleteMany({ where: { media: { token: { startsWith: TAG } } } });
    await prisma.mediaObject.deleteMany({ where: { token: { startsWith: TAG } } });
    await prisma.user.deleteMany({ where: { username: TAG } });
  }
  await prisma.$disconnect();
});

describe("a post's hashtags are written with it", () => {
  it("stores each hashtag once, by key, as the post first spelled it", async () => {
    if (!reachable) return;

    const t = await tweets.create(authorId, `${TAG} #WebDev and #القراءة, again #webdev`);

    expect(await stored(t.id)).toEqual([
      { key: "webdev", spelling: "WebDev" },
      { key: "القراءة", spelling: "القراءة" },
    ]);
  });

  it("stores them for a post carrying images too", async () => {
    if (!reachable) return;
    const t = await tweets.create(authorId, `${TAG} #Imaged`, [await readyImage()]);

    expect(await stored(t.id)).toEqual([{ key: "imaged", spelling: "Imaged" }]);
  });

  it("replaces them when the text is edited", async () => {
    if (!reachable) return;
    const t = await tweets.create(authorId, `${TAG} #Before #Kept`);

    await tweets.update(t.id, authorId, { body: `${TAG} #kept #After` });

    expect(await stored(t.id)).toEqual([
      { key: "kept", spelling: "kept" },
      { key: "after", spelling: "After" },
    ]);
  });

  it("replaces them when the text changes together with the images", async () => {
    if (!reachable) return;
    const t = await tweets.create(authorId, `${TAG} #Before`, [await readyImage()]);

    await tweets.update(t.id, authorId, { body: `${TAG} #After`, media: [] });

    expect(await stored(t.id)).toEqual([{ key: "after", spelling: "After" }]);
  });

  it("keeps them when only the images change", async () => {
    if (!reachable) return;
    const t = await tweets.create(authorId, `${TAG} #Steady`, [await readyImage()]);

    await tweets.update(t.id, authorId, { media: [await readyImage()] });

    expect(await stored(t.id)).toEqual([{ key: "steady", spelling: "Steady" }]);
  });

  it("drops them with the post", async () => {
    if (!reachable) return;
    const t = await tweets.create(authorId, `${TAG} #Gone`);
    expect(await prisma.tweetHashtag.count({ where: { tweetId: t.id } })).toBe(1);

    await deleteTweet(t.id, authorId);

    expect(await prisma.tweetHashtag.count({ where: { tweetId: t.id } })).toBe(0);
  });

  it("stores none for a comment or a reply", async () => {
    if (!reachable) return;
    const t = await tweets.create(authorId, `${TAG} a post without tags`);
    const parent = await comments.create(authorId, t.id, `#${TAG}c on the post`);
    await comments.create(authorId, t.id, `#${TAG}c again`, undefined, parent.id);

    expect(await prisma.tweetHashtag.count({ where: { key: hashtagKey(`${TAG}c`) } })).toBe(0);
  });
});

describe("the table the migration made", () => {
  it("refuses a second row for one post and key, so a row counts a post", async () => {
    if (!reachable) return;
    const t = await tweets.create(authorId, `${TAG} #Once`);

    await expect(
      prisma.tweetHashtag.create({ data: { tweetId: t.id, key: "once", spelling: "ONCE" } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("keys on unbounded text, spells in 280, and cascades from the post", async () => {
    if (!reachable) return;
    const columns = await prisma.$queryRaw<{ column_name: string; data_type: string; len: number | null }[]>`
      SELECT column_name, data_type, character_maximum_length AS len
        FROM information_schema.columns
       WHERE table_name = 'tweet_hashtags' AND column_name IN ('key', 'spelling')
       ORDER BY column_name`;
    const cascade = await prisma.$queryRaw<{ confdeltype: string }[]>`
      SELECT confdeltype::text FROM pg_constraint WHERE conname = 'tweet_hashtags_tweet_id_fkey'`;

    expect(columns).toEqual([
      { column_name: "key", data_type: "text", len: null },
      { column_name: "spelling", data_type: "character varying", len: 280 },
    ]);
    expect(cascade).toEqual([{ confdeltype: "c" }]);
  });
});
