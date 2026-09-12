import { describe, expect, it, vi } from "vitest";
import { restProfile } from "./restProfile";

const response = {
  data: { success: true, data: { username: "ada", name: "Ada", bio: "hello", email: "a@b.c" } },
};

const clientThatCaptures = () => {
  const calls: { url: string; body: unknown }[] = [];
  return {
    calls,
    client: {
      patch: vi.fn(async (url: string, body: unknown) => {
        calls.push({ url, body });
        return response;
      }),
    } as never,
  };
};

describe("restProfile", () => {
  it("reaches the self alias, so the subject is the token's account", async () => {
    const { calls, client } = clientThatCaptures();

    await restProfile(client).updateProfile({ name: "Ada" });

    expect(calls[0].url).toBe("/users/me");
  });

  it("sends the wire shape, not the screen's", async () => {
    const { calls, client } = clientThatCaptures();

    await restProfile(client).updateProfile({ name: "", bio: "hi", avatarToken: "t0ken" });

    expect(calls[0].body).toEqual({ name: null, bio: "hi", avatar: { token: "t0ken" } });
  });

  it("returns the domain shape, dropping what this screen does not read", async () => {
    const { client } = clientThatCaptures();

    await expect(restProfile(client).updateProfile({ bio: "hello" })).resolves.toEqual({
      username: "ada",
      name: "Ada",
      bio: "hello",
    });
  });
});
