/**
 * Characterization of the refreshSession capability (Issue #261).
 *
 * refreshSession is a thin public adapter that delegates to the auth
 * repository's refresh; it holds no HTTP logic or endpoint knowledge of its own.
 * This locks the delegation — whatever `restAuth().refresh()` resolves to is
 * what refreshSession returns. `restAuth` is mocked so the test asserts
 * delegation only; the endpoint contract itself is owned by restAuth.test.ts.
 */
import { describe, it, expect, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("./restAuth", () => ({ restAuth: () => ({ refresh }) }));

import { refreshSession } from "./refreshSession";

describe("refreshSession — thin delegating wrapper (#261)", () => {
  it("delegates to restAuth().refresh() and returns its result", async () => {
    refresh.mockResolvedValue("delegated-token");

    const token = await refreshSession();

    expect(refresh).toHaveBeenCalledOnce();
    expect(token).toBe("delegated-token");
  });
});
