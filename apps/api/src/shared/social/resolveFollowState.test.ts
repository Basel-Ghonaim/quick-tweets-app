/**
 * Follow state — the two directions, and the promises that are easy to lose.
 *
 * Two of these are invariants rather than outcomes, and both are stated in the
 * Work Item: **one query for a whole page, never one per row**, and **a guest
 * asks nothing at all**. Neither is visible in a response, so neither survives
 * without a case that counts.
 *
 * That the `OR` really returns both directions is the database's to say, and is
 * proved in the integration lane.
 */

import { describe, expect, it } from "vitest";

import { resolveFollowState, followStateOf, NO_FOLLOW_STATE } from "./resolveFollowState";

const READER = 1;

/** A fake client that records every follow query and answers from a fixed graph. */
const makeClient = (edges: [number, number][]) => {
  const queries: unknown[] = [];
  const client = {
    follow: {
      findMany: async (args: { where: unknown }) => {
        queries.push(args.where);
        return edges.map(([followerId, followingId]) => ({ followerId, followingId }));
      },
    },
  } as never;
  return { client, queries };
};

describe("resolveFollowState", () => {
  it("reports the reader following someone", async () => {
    const { client } = makeClient([[READER, 2]]);

    const state = await resolveFollowState(READER, [2], client);

    expect(followStateOf(state, 2)).toEqual({ isFollowing: true, followsYou: false });
  });

  it("reports someone following the reader — the state Follow back is drawn from", async () => {
    const { client } = makeClient([[2, READER]]);

    const state = await resolveFollowState(READER, [2], client);

    expect(followStateOf(state, 2)).toEqual({ isFollowing: false, followsYou: true });
  });

  it("reports both when the follow is mutual", async () => {
    const { client } = makeClient([
      [READER, 2],
      [2, READER],
    ]);

    const state = await resolveFollowState(READER, [2], client);

    expect(followStateOf(state, 2)).toEqual({ isFollowing: true, followsYou: true });
  });

  it("reports neither for someone unconnected to the reader", async () => {
    const { client } = makeClient([]);

    const state = await resolveFollowState(READER, [2], client);

    expect(followStateOf(state, 2)).toEqual({ isFollowing: false, followsYou: false });
  });

  it("keeps each person's directions apart across a page", async () => {
    const { client } = makeClient([
      [READER, 2], // the reader follows 2
      [3, READER], // 3 follows the reader
      [READER, 4], // mutual with 4
      [4, READER],
    ]);

    const state = await resolveFollowState(READER, [2, 3, 4, 5], client);

    expect(followStateOf(state, 2)).toEqual({ isFollowing: true, followsYou: false });
    expect(followStateOf(state, 3)).toEqual({ isFollowing: false, followsYou: true });
    expect(followStateOf(state, 4)).toEqual({ isFollowing: true, followsYou: true });
    expect(followStateOf(state, 5)).toEqual({ isFollowing: false, followsYou: false });
  });

  // ─── The invariants ────────────────────────────────────────────────────────

  it("asks once for a whole page, never once per row", async () => {
    const { client, queries } = makeClient([]);

    await resolveFollowState(READER, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], client);

    expect(queries).toHaveLength(1);
  });

  it("asks nothing at all for a guest", async () => {
    const { client, queries } = makeClient([[2, 3]]);

    const state = await resolveFollowState(undefined, [2, 3], client);

    expect(queries).toHaveLength(0); // no reader to be related to — nothing to ask
    expect(followStateOf(state, 2)).toEqual(NO_FOLLOW_STATE);
    expect(followStateOf(state, 3)).toEqual(NO_FOLLOW_STATE);
  });

  it("asks nothing for an empty page", async () => {
    const { client, queries } = makeClient([]);

    await resolveFollowState(READER, [], client);

    expect(queries).toHaveLength(0);
  });

  it("asks for each person once, however often they appear", async () => {
    const { client, queries } = makeClient([]);

    // A feed shows the same author repeatedly; the query should not.
    await resolveFollowState(READER, [2, 2, 2, 3], client);

    expect(queries).toHaveLength(1);
    const where = queries[0] as { OR: { followingId?: { in: number[] }; followerId?: { in: number[] } }[] };
    expect(where.OR[0]!.followingId!.in).toEqual([2, 3]);
    expect(where.OR[1]!.followerId!.in).toEqual([2, 3]);
  });

  it("leads both arms with followerId, so the unique pair's index serves each", async () => {
    const { client, queries } = makeClient([]);

    await resolveFollowState(READER, [2], client);

    const where = queries[0] as { OR: Record<string, unknown>[] };
    // Arm one: the reader's own follows. Arm two: the page's follows of the reader.
    expect(where.OR[0]).toEqual({ followerId: READER, followingId: { in: [2] } });
    expect(where.OR[1]).toEqual({ followerId: { in: [2] }, followingId: READER });
  });

  it("gives an unasked-for person neither direction rather than undefined", async () => {
    const { client } = makeClient([]);

    const state = await resolveFollowState(READER, [2], client);

    expect(followStateOf(state, 999)).toEqual(NO_FOLLOW_STATE);
  });
});
