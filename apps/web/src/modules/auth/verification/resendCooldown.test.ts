import { describe, expect, it } from "vitest";
import {
  canResend,
  resendCooldownInitial as initial,
  resendCooldownReducer as reduce,
} from "./resendCooldown";
import { normaliseChallengeCode } from "./challengeCode";

describe("the resend cooldown", () => {
  it("starts open, because nothing has been sent yet", () => {
    expect(canResend(initial)).toBe(true);
  });

  it("takes its window from the answer rather than from a constant", () => {
    expect(reduce(initial, { type: "started", seconds: 40 }).secondsLeft).toBe(40);
  });

  it("closes while it counts, and opens when it reaches zero", () => {
    let state = reduce(initial, { type: "started", seconds: 2 });
    expect(canResend(state)).toBe(false);

    state = reduce(state, { type: "ticked" });
    expect(canResend(state)).toBe(false);

    state = reduce(state, { type: "ticked" });
    expect(canResend(state)).toBe(true);
  });

  it("reports the end once, so the wait is announced rather than repeated", () => {
    let state = reduce(initial, { type: "started", seconds: 1 });

    state = reduce(state, { type: "ticked" });
    expect(state.justEnded).toBe(true);

    state = reduce(state, { type: "ticked" });
    expect(state.justEnded).toBe(false);
  });

  it("never counts below zero", () => {
    const done = reduce(initial, { type: "ticked" });
    expect(done.secondsLeft).toBe(0);
  });
});

describe("normaliseChallengeCode", () => {
  it("raises case, so a code typed in lower case is not read as a wrong one", () => {
    expect(normaliseChallengeCode("7qk3mnp2xvzb")).toBe("7QK3MNP2XVZB");
  });

  it("drops the spacing and separators a reader copies with the code", () => {
    expect(normaliseChallengeCode("7QK3 MNP2-XVZB")).toBe("7QK3MNP2XVZB");
  });

  it("reads the dropped letters as the digits they are mistaken for", () => {
    expect(normaliseChallengeCode("IiLlOo")).toBe("111100");
  });

  it("refuses what the alphabet does not carry, U included — it resembles no digit", () => {
    expect(normaliseChallengeCode("U7@K")).toBe("7K");
  });
});
