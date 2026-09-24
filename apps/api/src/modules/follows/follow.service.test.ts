// Follow lists: a page resolves its users' avatars in one batch.

import { describe, expect, it } from "vitest";

import type { IMediaResolution } from "../media/index.js";
import { createFollowService } from "./follow.service";
import type { FollowUserRow, IFollowRepository } from "./follow.types";

const user = (id: number, avatarMediaId: number | null): FollowUserRow => ({
  id,
  username: `user${id}`,
  name: null,
  avatarMediaId,
  bio: "",
});

const makeRepo = (users: FollowUserRow[]): IFollowRepository => ({
  findUserIdByUsername: async () => 3,
  isFollowing: async () => false,
  follow: async () => {},
  unfollow: async () => {},
  countFollowers: async () => 0,
  getFollowers: async () => users.map((follower, i) => ({ id: i + 1, follower })),
  getFollowing: async () => users.map((following, i) => ({ id: i + 1, following })),
  findSuggestions: async () => [],
});

/** A resolution that records every batch it is asked for; `unresolved` stay absent. */
const recording = (unresolved: number[] = []) => {
  const batches: number[][] = [];
  const resolution: IMediaResolution = {
    resolveTokens: async (ids) => {
      batches.push([...ids]);
      const servable = ids.filter((id) => !unresolved.includes(id));
      return new Map(servable.map((id) => [id, `tok-${id}` as never]));
    },
    resolveToken: async () => {
      throw new Error("a list resolves in one batch, never per user");
    },
  };
  return { resolution, batches };
};

describe("follow lists — the avatar", () => {
  it.each(["getFollowers", "getFollowing"] as const)(
    "%s resolves the page's avatars in one batch",
    async (list) => {
      const { resolution, batches } = recording();
      const svc = createFollowService(makeRepo([user(1, 90), user(2, null), user(3, 91)]), resolution);

      const { data } = await svc[list]("ada", { limit: 20 });

      expect(data.map((item) => item.avatar)).toEqual([{ token: "tok-90" }, null, { token: "tok-91" }]);
      expect(batches).toEqual([[90, 91]]);
    },
  );

  it("an item carries the author embed and its bio, and never the reference", async () => {
    const { resolution } = recording();
    const svc = createFollowService(makeRepo([user(1, 90)]), resolution);

    const { data } = await svc.getFollowers("ada", { limit: 20 });

    // No reader, so neither direction — and the shape is asserted whole, so a
    // field added without the contract knowing would fail here.
    expect(data[0]).toEqual({
      id: 1,
      username: "user1",
      name: null,
      avatar: { token: "tok-90" },
      bio: "",
      isFollowing: false,
      followsYou: false,
    });
  });

  it("an avatar that does not resolve is null", async () => {
    const { resolution } = recording([90]);
    const svc = createFollowService(makeRepo([user(1, 90)]), resolution);

    const { data } = await svc.getFollowing("ada", { limit: 20 });

    expect(data[0]!.avatar).toBeNull();
  });
});
