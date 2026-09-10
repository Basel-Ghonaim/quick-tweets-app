/**
 * Characterization of the auth repository's refresh contract.
 *
 * `restAuth.refresh` POSTs to `/auth/refresh` and returns the session
 * ({ user: { id, username }, accessToken }) — the source Session Restore uses,
 * with no local persistence. Locked via the repository's injectable client — no
 * DOM, no network.
 */
import type { AuthUser } from "@shared/types";
import { describe, expect, it, vi } from "vitest";
import { restAuth } from "./restAuth";

const userDto = { id: 1, username: "ada" };
const expectedUser: AuthUser = { ...userDto };

describe("restAuth.refresh — returns the session", () => {
  it("POSTs to /auth/refresh (no body) and returns { user, accessToken }", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, data: { user: userDto, accessToken: "tok-abc" } },
    });
    const repo = restAuth({ post } as unknown as Parameters<
      typeof restAuth
    >[0]);

    const session = await repo.refresh();

    expect(post).toHaveBeenCalledWith("/auth/refresh");
    expect(session.accessToken).toBe("tok-abc");
    expect(session.user).toEqual(expectedUser);
  });
});

describe("restAuth.register — account creation only (auth-first, ADR 0008)", () => {
  const creds = {
    username: "ada",
    email: "ada@example.com",
    password: "Passw0rd!",
    confirmPassword: "Passw0rd!",
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
      expect.objectContaining({ username: "ada", email: "ada@example.com" }),
    );
    // Registration is account-only: the request must not carry name (nor an avatar).
    expect(post).toHaveBeenCalledWith(
      "/auth/register",
      expect.not.objectContaining({
        name: expect.anything(),
        avatar: expect.anything(),
      }),
    );
    expect(session.accessToken).toBe("acc");
  });
});

describe("restAuth.login — submits the neutral identifier", () => {
  it("POSTs { identifier, password } to /auth/login", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, data: { user: userDto, accessToken: "acc" } },
    });
    const repo = restAuth({ post } as unknown as Parameters<
      typeof restAuth
    >[0]);

    const session = await repo.login({
      identifier: "basel_a",
      password: "Passw0rd!",
    });

    expect(post).toHaveBeenCalledWith("/auth/login", {
      identifier: "basel_a",
      password: "Passw0rd!",
    });
    expect(session.accessToken).toBe("acc");
  });
});
