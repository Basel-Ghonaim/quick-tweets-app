import { describe, expect, it, vi } from "vitest";
import { createAppError } from "@shared/errors";
import type { RequestState } from "@shared/types";
import { executeVerification } from "./executeVerification";

const issued = { delivery: "accepted" as const, resendAvailableInSeconds: 60 };

/* The consumer's wording, standing in for it: this layer knows only that a map
   was given, never whose it is. */
const MESSAGES = {
  too_many_requests: "asked about too soon",
  rate_limit: "asked too often",
  bad_request: "that code is not valid",
};

const track = () => {
  const seen: RequestState[] = [];
  return { seen, set: vi.fn((next: RequestState) => seen.push(next)) };
};

describe("executeVerification", () => {
  it("reports the attempt through the state it was handed, and nothing else", async () => {
    const { seen, set } = track();

    await executeVerification(set, async () => issued);

    expect(seen.map((s) => s.status)).toEqual(["loading", "success"]);
  });

  it("leaves the state at the failure rather than at rest", async () => {
    const { seen, set } = track();

    await expect(
      executeVerification(set, async () => {
        throw createAppError("bad_request", "raw");
      }),
    ).rejects.toThrow();

    expect(seen.map((s) => s.status)).toEqual(["loading", "error"]);
  });

  it("tells the address cooldown apart from the client limiter", async () => {
    const cooled = track();
    const limited = track();

    await expect(
      executeVerification(
        cooled.set,
        async () => {
          throw createAppError("too_many_requests", "raw");
        },
        MESSAGES,
      ),
    ).rejects.toThrow();

    await expect(
      executeVerification(
        limited.set,
        async () => {
          throw createAppError("rate_limit", "raw");
        },
        MESSAGES,
      ),
    ).rejects.toThrow();

    expect(cooled.seen.at(-1)?.error?.message).toBe(MESSAGES.too_many_requests);
    expect(limited.seen.at(-1)?.error?.message).toBe(MESSAGES.rate_limit);
  });

  it("passes a failure through untouched when the map has nothing for it", async () => {
    const { seen, set } = track();

    await expect(
      executeVerification(
        set,
        async () => {
          throw createAppError("server", "raw");
        },
        MESSAGES,
      ),
    ).rejects.toThrow();

    expect(seen.at(-1)?.error?.message).toBe("raw");
  });
});
