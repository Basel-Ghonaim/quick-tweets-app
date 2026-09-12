/**
 * Characterization of the refreshSession capability.
 *
 * refreshSession is the thin adapter for the API client's refresh callback: it
 * delegates to `restSession().refresh()` (which now returns the full session) and
 * returns just the access token. `restSession` is mocked so the test asserts the
 * delegation + token extraction.
 */
import { describe, it, expect, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("./restSession", () => ({ restSession: () => ({ refresh }) }));

import { refreshSession } from "./refreshSession";

describe("refreshSession — returns the token from the refreshed session", () => {
  it("delegates to restSession().refresh() and returns its accessToken", async () => {
    refresh.mockResolvedValue({ accessToken: "delegated-token", user: { id: 1 } });

    const token = await refreshSession();

    expect(refresh).toHaveBeenCalledOnce();
    expect(token).toBe("delegated-token");
  });
});
