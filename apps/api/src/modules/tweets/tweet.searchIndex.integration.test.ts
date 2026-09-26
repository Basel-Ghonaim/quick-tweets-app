/**
 * The word-search index against a REAL Postgres. Run with `npm run test:integration`.
 *
 * search_text() states the hashtags' Arabic letter rule a second time, in SQL, so the
 * index can hold it. These cases keep the two statements in agreement, and show the
 * function is fit for an index at all.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../shared/database/index.js";
import { hashtagKey } from "../../shared/hashtags/index.js";

const cp = (...points: number[]) => String.fromCodePoint(...points);
const BA = cp(0x0628);
const TA = cp(0x062a);

let reachable = false;

beforeAll(async () => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    reachable = true;
  } catch {
    reachable = false;
  }
}, 30_000);

afterAll(async () => {
  await prisma.$disconnect();
});

/** What the database makes of each text, lowered as to_tsvector lowers it. */
const inSql = async (texts: string[]) =>
  prisma.$queryRaw<{ text: string; out: string }[]>`
    SELECT t AS text, lower(search_text(t)) AS out FROM unnest(${texts}::text[]) AS t`;

describe("search_text agrees with hashtagKey on the Arabic letter rule", () => {
  it("for every code point in the Arabic block, inside a word", async () => {
    if (!reachable) return;
    const samples: string[] = [];
    for (let point = 0x0600; point <= 0x06ff; point++) samples.push(BA + cp(point) + TA);

    const differ = (await inSql(samples)).filter((row) => row.out !== hashtagKey(row.text));

    expect(samples).toHaveLength(256);
    expect(differ).toEqual([]);
  });

  it("for words written with hamza, harakat, tatweel and the letters kept apart", async () => {
    if (!reachable) return;
    const words = [
      "أحمد", "إحمد", "آحمد", "ٱحمد", `ا${cp(0x0654)}حمد`,
      `ال${cp(0x0652)}ق${cp(0x0650)}ر${cp(0x064e)}اء${cp(0x064e)}ة`, `ال${cp(0x0640)}قراءة`,
      "سؤال", "مسائل", "مدرسة", "مدرسه", "على", "علي",
    ];

    const rows = await inSql(words);

    expect(rows.map((row) => row.out)).toEqual(words.map(hashtagKey));
  });
});

describe("the function and the index", () => {
  it("is immutable, which an index expression requires", async () => {
    if (!reachable) return;
    const rows = await prisma.$queryRaw<{ provolatile: string }[]>`
      SELECT provolatile::text FROM pg_proc WHERE proname = 'search_text'`;

    expect(rows).toEqual([{ provolatile: "i" }]);
  });

  it("indexes each post's body as search reads it", async () => {
    if (!reachable) return;
    const rows = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'tweets_search_idx'`;

    expect(rows).toHaveLength(1);
    expect(rows[0]!.indexdef).toContain("USING gin (to_tsvector('simple'::regconfig, search_text((body)::text)))");
  });
});
