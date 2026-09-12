import { describe, expect, it } from "vitest";
import { resendWindowAt, secondsUntilWindow } from "./resendWindow";

const NOW = 1_700_000_000_000;

describe("the resend window", () => {
  it("is an instant, so holding it does not shorten it", () => {
    const at = resendWindowAt(60, NOW);

    expect(at).toBe(NOW + 60_000);
    expect(secondsUntilWindow(at, NOW + 10_000)).toBe(50);
  });

  it("is absent when the server says nothing is running", () => {
    expect(resendWindowAt(0, NOW)).toBeNull();
    expect(secondsUntilWindow(null, NOW)).toBe(0);
  });

  it("never counts below zero once the wait has passed", () => {
    expect(secondsUntilWindow(resendWindowAt(5, NOW), NOW + 60_000)).toBe(0);
  });

  it("rounds a part second up, as the server does", () => {
    expect(secondsUntilWindow(NOW + 1_400, NOW)).toBe(2);
  });
});
