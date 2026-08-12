/**
 * Barrel discipline.
 *
 * The published surface is a query and nothing else. Asserting the absence of
 * the commands means publishing one later has to be a deliberate edit here,
 * rather than something that quietly became reachable.
 */

import { describe, expect, it } from "vitest";

import * as published from "./index.js";

describe("the published surface", () => {
  it("offers the status query, as a factory and a ready instance", () => {
    expect(typeof published.createChannelVerificationStatus).toBe("function");
    expect(typeof published.channelVerificationStatus.statusOf).toBe("function");
    expect(typeof published.channelVerificationStatus.statusOfMany).toBe("function");
  });

  it("publishes no commands", () => {
    const exported = Object.keys(published);

    expect(exported).not.toContain("issue");
    expect(exported).not.toContain("confirm");
    expect(exported).not.toContain("createChannelVerificationService");
    expect(exported).not.toContain("channelVerificationService");
  });

  it("publishes no internals — no repository, no codes, no errors, no controller", () => {
    const exported = Object.keys(published);

    for (const internal of [
      "createChannelVerificationRepository",
      "mintChallengeCode",
      "challengeCode",
      "digestChallengeCode",
      "challengeCodeMatches",
      "ChannelVerificationError",
      "createChannelVerificationController",
      "channelVerificationRoutes",
    ]) {
      expect(exported).not.toContain(internal);
    }
  });

  it("exposes exactly the surface it means to", () => {
    expect(Object.keys(published).sort()).toEqual([
      "channelVerificationStatus",
      "createChannelVerificationStatus",
    ]);
  });
});
