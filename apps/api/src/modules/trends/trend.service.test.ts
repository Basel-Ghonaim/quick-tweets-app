/**
 * What the trend service asks of the ranking, and how it words the answer.
 * The ranking itself is SQL, and is proved against a real database.
 */

import { describe, expect, it } from "vitest";

import { createTrendService } from "./trend.service";
import type { ITrendRepository, TrendQuery, TrendRow } from "./trend.types";

const NOW = new Date("2026-09-25T12:00:00.000Z");

const makeWorld = (rows: TrendRow[] = []) => {
  const asked: TrendQuery[] = [];
  const repo: ITrendRepository = {
    findTrending: async (query) => {
      asked.push(query);
      return rows;
    },
  };
  return { svc: createTrendService(repo, () => NOW), asked };
};

describe("what is asked of the ranking", () => {
  it("counts the posts written in the seven days up to now", async () => {
    const w = makeWorld();

    await w.svc.getTrending();

    expect(w.asked[0]!.since).toEqual(new Date("2026-09-18T12:00:00.000Z"));
    expect(w.asked[0]!.until).toEqual(NOW);
  });

  it("asks for hashtags at least two posts used, five at most", async () => {
    const w = makeWorld();

    await w.svc.getTrending();

    expect(w.asked[0]).toMatchObject({ minPosts: 2, limit: 5 });
  });
});

describe("the answer", () => {
  it("writes each hashtag with its #, keeping the ranking's order and counts", async () => {
    const w = makeWorld([
      { spelling: "WebDev", tweetsCount: 3 },
      { spelling: "القراءة", tweetsCount: 2 },
    ]);

    expect(await w.svc.getTrending()).toEqual([
      { tag: "#WebDev", tweetsCount: 3 },
      { tag: "#القراءة", tweetsCount: 2 },
    ]);
  });

  it("is an empty list when nothing trends", async () => {
    expect(await makeWorld().svc.getTrending()).toEqual([]);
  });
});
