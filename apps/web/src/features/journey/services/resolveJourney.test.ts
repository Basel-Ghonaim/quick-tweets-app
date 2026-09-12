import { describe, expect, it, vi } from "vitest";

import { createAppError } from "@shared/errors";
import { resolveJourney } from "./resolveJourney";
import type { JourneyState } from "../model";
import type { JourneyGateway } from "../gateway";

const state = (over: Partial<JourneyState> = {}): JourneyState => ({
  phase: "profile",
  profileOutcome: null,
  ...over,
});

const repoOf = (over: Partial<JourneyGateway> = {}): JourneyGateway => ({
  read: vi.fn(async () => state()),
  advance: vi.fn(async () => state()),
  ...over,
});

describe("asking where the reader belongs", () => {
  it("takes the phase the server answers", async () => {
    const repo = repoOf({ read: async () => state({ phase: "code", profileOutcome: "saved" }) });

    await expect(resolveJourney(repo)).resolves.toEqual({
      status: "resolved",
      state: { phase: "code", profileOutcome: "saved" },
    });
  });

  it("asks nothing further away from the verification step", async () => {
    const advance = vi.fn(async () => state());
    await resolveJourney(repoOf({ read: async () => state({ phase: "profile" }), advance }));

    expect(advance).not.toHaveBeenCalled();
  });
});

/* Only the server knows whether a challenge is outstanding, so the move is the
   question and its refusal is the answer. */
describe("arriving at the verification step", () => {
  it("goes to the code screen when the move is allowed", async () => {
    const repo = repoOf({
      read: async () => state({ phase: "verify", profileOutcome: "skipped" }),
      advance: async () => state({ phase: "code", profileOutcome: "skipped" }),
    });

    await expect(resolveJourney(repo)).resolves.toEqual({
      status: "resolved",
      state: { phase: "code", profileOutcome: "skipped" },
    });
  });

  it("stays on the ask when it is refused", async () => {
    const repo = repoOf({
      read: async () => state({ phase: "verify" }),
      advance: async () => {
        throw createAppError("conflict", "That step is not available.");
      },
    });

    await expect(resolveJourney(repo)).resolves.toEqual({
      status: "resolved",
      state: { phase: "verify", profileOutcome: null },
    });
  });
});

describe("a read that fails", () => {
  it("is not an answer of none", async () => {
    const repo = repoOf({
      read: async () => {
        throw createAppError("network", "Offline");
      },
    });

    await expect(resolveJourney(repo)).resolves.toEqual({
      status: "failed",
      unauthorized: false,
    });
  });

  it("tells an expired session apart from a broken network", async () => {
    const repo = repoOf({
      read: async () => {
        throw createAppError("unauthorized", "No session");
      },
    });

    await expect(resolveJourney(repo)).resolves.toEqual({
      status: "failed",
      unauthorized: true,
    });
  });
});
