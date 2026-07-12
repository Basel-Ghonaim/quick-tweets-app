/**
 * Characterization of the auth repository's refresh contract (Issue #261).
 *
 * `restAuth` owns the `/auth/refresh` HTTP call: it POSTs to that endpoint
 * through the injected client and returns `res.data.accessToken`. #261 extracts
 * a thin public `refreshSession` wrapper that delegates here, so `restAuth` must
 * remain the single owner of this contract. Locked via the repository's
 * injectable client — no DOM, no network.
 */
import { describe, it, expect, vi } from "vitest";
import { restAuth } from "./restAuth";

describe("restAuth.refresh — single owner of the refresh contract (#261)", () => {
  it("POSTs to /auth/refresh (no body) and returns the access token", async () => {
    const post = vi.fn().mockResolvedValue({ data: { accessToken: "tok-abc" } });
    const repo = restAuth({ post } as unknown as Parameters<typeof restAuth>[0]);

    const token = await repo.refresh();

    expect(post).toHaveBeenCalledWith("/auth/refresh");
    expect(token).toBe("tok-abc");
  });
});
