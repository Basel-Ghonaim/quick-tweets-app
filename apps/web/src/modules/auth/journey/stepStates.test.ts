import { describe, expect, it } from "vitest";

import { stepStates } from "./stepStates";

describe("what the stepper reports", () => {
  it("marks the account step while registering", () => {
    expect(stepStates("account", null)).toEqual({
      account: "current",
      profile: "optional",
      verify: "optional",
    });
  });

  it("marks profile current once the account exists", () => {
    expect(stepStates("profile", null)).toEqual({
      account: "done",
      profile: "current",
      verify: "optional",
    });
  });

  it("reads a saved profile as done", () => {
    expect(stepStates("verify", "saved")).toMatchObject({
      profile: "done",
      verify: "current",
    });
  });

  /* The one distinction a path could never carry, and the reason the server
     holds it. */
  it("reads a skipped profile as skipped, not as done", () => {
    expect(stepStates("verify", "skipped")).toMatchObject({ profile: "skipped" });
  });

  it("keeps the verification step current on the code screen", () => {
    expect(stepStates("code", "saved")).toMatchObject({ verify: "current" });
  });

  it("leaves nothing current once the journey is over", () => {
    expect(stepStates("none", "skipped")).toEqual({
      account: "done",
      profile: "skipped",
      verify: "done",
    });
  });
});
