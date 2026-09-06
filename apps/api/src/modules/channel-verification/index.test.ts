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

  /* Widened once, deliberately: recovery produces evidence this capability
     owns the fact for, so the command that records it joined the surface. The
     two that have no in-process consumer still have not. */
  it("exposes exactly the surface it means to", () => {
    expect(Object.keys(published).sort()).toEqual([
      "channelVerificationProof",
      "channelVerificationStatus",
      "createChannelVerificationProof",
      "createChannelVerificationStatus",
    ]);
  });

  it("records a proof from evidence, and still publishes no challenge command", () => {
    expect(typeof published.channelVerificationProof.fromDeliveredCode).toBe("function");
    expect(Object.keys(published)).not.toContain("issue");
    expect(Object.keys(published)).not.toContain("confirm");
  });
});
