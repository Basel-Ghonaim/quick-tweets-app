/**
 * Search against a REAL Postgres. Run with `npm run test:integration`.
 *
 * Which words match, under which letter rule, and in what order is the database's to
 * say. Every post here carries a word made for this run, and every word query names it,
 * so no other post can match.
 *
 * TAG-scoped: every row belongs to the tagged author, and only those rows are removed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/database/index.js";
import { createCommentService } from "../comments/comment.service.js";
import { createTweetRepository } from "./tweet.repository.js";
import { createTweetService } from "./tweet.service.js";

const TAG = `itsrch${process.pid}x${Math.floor(process.hrtime()[1])}`;
const tweets = createTweetService();
const comments = createCommentService();

const cp = (...points: number[]) => String.fromCodePoint(...points);
const [SUKUN, KASRA, FATHA, TATWEEL, ACUTE] = [0x0652, 0x0650, 0x064e, 0x0640, 0x0301].map((p) => cp(p));

let reachable = false;
let authorId = 0;
const ids: Record<string, number> = {};

const found = async (q: string, limit = 50) => (await tweets.search(q, { limit })).data.map((t) => t.id);
const named = (...names: string[]) => names.map((name) => ids[name]!);

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
    return;
  }
  authorId = (await prisma.user.create({ data: { username: TAG, email: `${TAG}@it.local`, passwordHash: "x" } })).id;

  const posts: [string, string][] = [
    ["P1", `${TAG} Reading the guide`],
    ["P2", `${TAG} read it`],
    ["P3", `${TAG} قال أحمد`],
    ["P4", `${TAG} ال${SUKUN}ق${KASRA}ر${FATHA}اء${FATHA}ة`],
    ["P5", `${TAG} ال${TATWEEL}قراءة`],
    ["P6", `${TAG} مدرسة`],
    ["P7", `${TAG} coffee and code`],
    ["H1", `#${TAG}Tag first`],
    ["H2", `#${TAG.toUpperCase()}TAG second`],
    ["H3", `#أحمد${TAG} third`],
    ["H4", `${TAG}tag written as a plain word`],
  ];
  for (const [name, body] of posts) ids[name] = (await tweets.create(authorId, body)).id;
  // Written as a row from before text was stored in NFC: the letter and its accent apart.
  ids.P8 = (await prisma.tweet.create({ data: { authorId, body: `${TAG} cafe${ACUTE} time` } })).id;
  await comments.create(authorId, ids.P7!, `${TAG} commentonly`);
}, 60_000);

afterAll(async () => {
  if (reachable) {
    await prisma.comment.deleteMany({ where: { authorId } });
    await prisma.tweet.deleteMany({ where: { authorId } });
    await prisma.user.deleteMany({ where: { username: TAG } });
  }
  await prisma.$disconnect();
});

describe("a word query", () => {
  it("finds the word, and longer words beginning with it, newest first", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} read`)).toEqual(named("P2", "P1"));
  });

  it("does not find a shorter word from a longer one", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} reading`)).toEqual(named("P1"));
  });

  it("needs every word to match", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} code coffee`)).toEqual(named("P7"));
    expect(await found(`${TAG} code tea`)).toEqual([]);
  });

  it("ignores Latin case", async () => {
    if (!reachable) return;

    expect(await found(`${TAG.toUpperCase()} READING`)).toEqual(named("P1"));
  });

  it("finds a post written before text was stored in NFC", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} café`)).toEqual(named("P8"));
  });

  it("never finds a comment", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} commentonly`)).toEqual([]);
  });

  it("finds nothing for a query with no word in it", async () => {
    if (!reachable) return;

    expect(await found("!!! *** 🔥")).toEqual([]);
  });
});

describe("the Arabic letter rule, in words", () => {
  it("reads the alef forms as ا", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} احمد`)).toEqual(named("P3"));
  });

  it("ignores the harakat and tatweel", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} القراءة`)).toEqual(named("P5", "P4"));
  });

  it("keeps ة apart from ه", async () => {
    if (!reachable) return;

    expect(await found(`${TAG} مدرسه`)).toEqual([]);
  });
});

describe("a hashtag query", () => {
  it("finds the posts carrying the hashtag by key, however each spelled it", async () => {
    if (!reachable) return;

    expect(await found(`#${TAG}Tag`)).toEqual(named("H2", "H1"));
    expect(await found(`#${TAG.toUpperCase()}TAG`)).toEqual(named("H2", "H1"));
  });

  it("does not find the same letters written without #", async () => {
    if (!reachable) return;

    expect(await found(`#${TAG}Tag`)).not.toContain(ids.H4);
  });

  it("applies the Arabic letter rule to the hashtag", async () => {
    if (!reachable) return;

    expect(await found(`#احمد${TAG}`)).toEqual(named("H3"));
  });
});

describe("pages", () => {
  it("walks every match once, newest first, and says when it is done", async () => {
    if (!reachable) return;
    const walked: number[] = [];
    let cursor: number | undefined;
    // Bounded, so a cursor that stopped moving fails here rather than looping.
    for (let page = 0; page < 10; page++) {
      const { data, meta } = await tweets.search(TAG, { limit: 4, cursor });
      walked.push(...data.map((t) => t.id));
      if (!meta.hasMore) break;
      cursor = Number(meta.nextCursor);
    }

    // Every post whose words begin with the run's word: all but H3, whose hashtag begins in Arabic.
    const expected = named("P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "H1", "H2", "H4").sort((a, b) => b - a);
    expect(walked).toEqual(expected);
  });
});

describe("the index", () => {
  it("serves the word query, whose expression repeats the indexed one", async () => {
    if (!reachable) return;
    const logged = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
      log: [{ emit: "event", level: "query" }],
    });
    const seen: { query: string; params: string }[] = [];
    logged.$on("query", (e) => seen.push({ query: e.query, params: e.params }));

    await createTweetRepository(logged as unknown as typeof prisma).findByWords(`${TAG} read`, { limit: 10 });
    const words = seen.find((e) => e.query.includes("search_text"))!;
    const plan = await logged.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
      return tx.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(`EXPLAIN ${words.query}`, ...JSON.parse(words.params));
    });
    await logged.$disconnect();

    expect(plan.map((row) => row["QUERY PLAN"]).join("\n")).toContain("Bitmap Index Scan on tweets_search_idx");
  });
});
