// Response interceptor — the refresh guard: a 401 without a session must not refresh.
import { describe, it, expect, vi } from "vitest";
import type { AxiosInstance } from "axios";

import { responseInterceptor, type TokenRefreshCallbacks } from "./response";

type Rejected = (error: unknown) => Promise<unknown>;

const setup = (getAccessToken?: () => string | null) => {
  let onRejected: Rejected = async () => undefined;

  // Callable stub: the interceptor re-issues the original request via client(config).
  const retry = vi.fn().mockResolvedValue({ data: "retried" });
  const client = Object.assign(retry, {
    interceptors: {
      response: {
        use: (_onOk: unknown, rejected: Rejected) => {
          onRejected = rejected;
        },
      },
    },
  }) as unknown as AxiosInstance;

  const callbacks: TokenRefreshCallbacks = {
    refreshToken: vi.fn().mockResolvedValue("new-token"),
    onTokenRefreshed: vi.fn(),
    onSessionExpired: vi.fn(),
  };

  responseInterceptor(client, callbacks, getAccessToken);
  return { run: (error: unknown) => onRejected(error), callbacks, retry };
};

const unauthorized = (url: string) => ({
  response: { status: 401, data: {} },
  config: { url, headers: {} },
});

describe("responseInterceptor — refresh guard", () => {
  it("does NOT refresh a 401 when there is no access token (failed login)", async () => {
    const { run, callbacks } = setup(() => null);

    await expect(run(unauthorized("/auth/login"))).rejects.toBeTruthy();

    expect(callbacks.refreshToken).not.toHaveBeenCalled();
    expect(callbacks.onSessionExpired).not.toHaveBeenCalled();
  });

  it("refreshes a 401 when a session exists (expired access token)", async () => {
    const { run, callbacks, retry } = setup(() => "stale-token");

    await run(unauthorized("/tweets"));

    expect(callbacks.refreshToken).toHaveBeenCalledOnce();
    expect(callbacks.onTokenRefreshed).toHaveBeenCalledWith("new-token");
    expect(retry).toHaveBeenCalledOnce();
  });

  it("still signals session-expired when the refresh endpoint itself 401s", async () => {
    const { run, callbacks } = setup(() => "stale-token");

    await expect(run(unauthorized("/auth/refresh"))).rejects.toBeTruthy();

    expect(callbacks.onSessionExpired).toHaveBeenCalledOnce();
    expect(callbacks.refreshToken).not.toHaveBeenCalled();
  });
});
