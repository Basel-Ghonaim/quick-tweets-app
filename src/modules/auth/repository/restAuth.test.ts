/**
 * Characterization of the auth repository's refresh contract (#261, updated #258).
 *
 * `restAuth.refresh` POSTs to `/auth/refresh` and returns the **full session**
 * ({ user, accessToken }) — the server-side source Session Restore uses, with no
 * local persistence. Locked via the repository's injectable client — no DOM, no
 * network.
 */
import { describe, it, expect, vi } from "vitest";
import { restAuth } from "./restAuth";
import type { User } from "@shared/types";

const userDto = {
  id: 1,
  username: "ada",
  name: "Ada Lovelace",
  email: "ada@example.com",
  profileImage: null,
  avatar: null,
  bio: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const expectedUser: User = { ...userDto };

describe("restAuth.refresh — returns the full session (#261, #258)", () => {
  it("POSTs to /auth/refresh (no body) and returns { user, accessToken }", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, data: { user: userDto, accessToken: "tok-abc" } },
    });
    const repo = restAuth({ post } as unknown as Parameters<typeof restAuth>[0]);

    const session = await repo.refresh();

    expect(post).toHaveBeenCalledWith("/auth/refresh");
    expect(session.accessToken).toBe("tok-abc");
    expect(session.user).toEqual(expectedUser);
  });
});

describe("restAuth.register — account creation only (auth-first, ADR 0008)", () => {
  const creds = {
    username: "ada", name: "Ada Lovelace", email: "ada@example.com",
    password: "Passw0rd!", confirmPassword: "Passw0rd!", privacy: true,
  };
  const asClient = (post: unknown) => post as Parameters<typeof restAuth>[0];

  it("POSTs the account fields to /auth/register — no avatar, no grant, no upload", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, data: { user: userDto, accessToken: "acc" } },
    });
    const repo = restAuth(asClient({ post }));

    const session = await repo.register(creds);

    expect(post).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({ username: "ada", name: "Ada Lovelace", email: "ada@example.com" }),
    );
    // The avatar is not part of signup anymore — the request must not carry it.
    expect(post).toHaveBeenCalledWith(
      "/auth/register",
      expect.not.objectContaining({ avatar: expect.anything() }),
    );
    expect(session.accessToken).toBe("acc");
  });
});
