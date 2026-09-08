import { describe, expect, it } from "vitest";
import {
  canResend,
  resendCooldownInitial as initial,
  resendCooldownReducer as reduce,
} from "./resendCooldown";

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
