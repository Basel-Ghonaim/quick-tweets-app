/**
 * Characterization of the refreshSession capability (#261, updated #258).
 *
 * refreshSession is the thin adapter for the API client's refresh callback: it
 * delegates to `restAuth().refresh()` (which now returns the full session) and
 * returns just the access token. `restAuth` is mocked so the test asserts the
 * delegation + token extraction.
 */
import { describe, it, expect, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("./restAuth", () => ({ restAuth: () => ({ refresh }) }));

import { refreshSession } from "./refreshSession";

describe("refreshSession — returns the token from the refreshed session (#261, #258)", () => {
  it("delegates to restAuth().refresh() and returns its accessToken", async () => {
    refresh.mockResolvedValue({ accessToken: "delegated-token", user: { id: 1 } });

    const token = await refreshSession();

    expect(refresh).toHaveBeenCalledOnce();
    expect(token).toBe("delegated-token");
  });
});
