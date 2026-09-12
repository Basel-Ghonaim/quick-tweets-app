/**
 * The session repository's wire contract, locked via its injectable client —
 * no DOM, no network.
 */
import type { AuthUser } from "@shared/types";
import { describe, expect, it, vi } from "vitest";
import { restSession } from "./restSession";

const userDto = { id: 1, username: "ada" };
const expectedUser: AuthUser = { ...userDto };
const asClient = (client: unknown) => client as Parameters<typeof restSession>[0];

describe("restSession.refresh — returns the session", () => {
  it("POSTs to /auth/refresh (no body) and returns { user, accessToken }", async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, data: { user: userDto, accessToken: "tok-abc" } },
    });

    const session = await restSession(asClient({ post })).refresh();

    expect(post).toHaveBeenCalledWith("/auth/refresh");
    expect(session.accessToken).toBe("tok-abc");
    expect(session.user).toEqual(expectedUser);
  });
});

describe("restSession.logout — asks the server to end it", () => {
  it("POSTs to /auth/logout and resolves to nothing", async () => {
    const post = vi.fn().mockResolvedValue({ data: { success: true } });

    await expect(restSession(asClient({ post })).logout()).resolves.toBeUndefined();

    expect(post).toHaveBeenCalledWith("/auth/logout");
  });
});
