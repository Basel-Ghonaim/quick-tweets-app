/**
 * The third client exists for one shape the other two cannot express: an
 * endpoint that is anonymous and still needs the browser's credentials.
 *
 * Each property below is what distinguishes it from a sibling, so each is
 * asserted against that sibling rather than in isolation — a guard that only
 * described this client would pass while it silently became one of them.
 */

import { describe, expect, it, vi } from "vitest";
import type { AxiosRequestConfig, AxiosResponse } from "axios";

import { apiClient } from "./client";
import { publicCredentialedClient } from "./publicCredentialedClient";

/** Captures the config a request would have gone out with, without a network. */
const sent = async (config: AxiosRequestConfig = {}) => {
  const capture = vi.fn(
    async (c: AxiosRequestConfig): Promise<AxiosResponse> =>
      ({ data: null, status: 204, statusText: "", headers: {}, config: c }) as AxiosResponse,
  );

  const previous = publicCredentialedClient.defaults.adapter;
  publicCredentialedClient.defaults.adapter = capture as never;
  try {
    await publicCredentialedClient.get("/anywhere", config);
  } finally {
    publicCredentialedClient.defaults.adapter = previous;
  }

  return capture.mock.calls[0]![0];
};

describe("the credentials travel", () => {
  it("sends them, which is the whole reason this client exists", () => {
    expect(publicCredentialedClient.defaults.withCredentials).toBe(true);
  });

  it("and the public client still does not — the two are genuinely different", () => {
    expect(apiClient.defaults.withCredentials).not.toBe(true);
  });
});

describe("nothing authenticates", () => {
  /* A token attached here would be sent where none is read. The interceptor
     that would attach one is registered per client, so its absence is the
     assertion — not a header check that a future interceptor could pass. */
  it("registers no request interceptor, so nothing can attach a token", () => {
    const handlers = (
      publicCredentialedClient.interceptors.request as unknown as { handlers: unknown[] }
    ).handlers;

    expect(handlers.filter(Boolean)).toHaveLength(0);
  });

  it("carries no Authorization header on a real request", async () => {
    const config = await sent();

    const header = new Headers(
      Object.entries(config.headers ?? {}).filter(([, v]) => typeof v === "string") as [
        string,
        string,
      ][],
    );
    expect(header.get("Authorization")).toBeNull();
  });

  it("still lets a caller set one deliberately, rather than stripping it", async () => {
    const config = await sent({ headers: { Authorization: "Bearer explicit" } });

    expect(JSON.stringify(config.headers)).toContain("Bearer explicit");
  });
});

describe("it shares the base every client reads", () => {
  it("targets the same origin and timeout as the public client", () => {
    expect(publicCredentialedClient.defaults.baseURL).toBe(apiClient.defaults.baseURL);
    expect(publicCredentialedClient.defaults.timeout).toBe(apiClient.defaults.timeout);
  });
});
