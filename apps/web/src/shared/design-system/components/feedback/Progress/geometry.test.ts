import { describe, expect, test } from "vitest";
import { RING_RADIUS, fraction, ringDash } from "./geometry";

/**
 * A ring's fill is arithmetic, and arithmetic is where it goes silently wrong:
 * a dasharray that is plausible at half way is the failure mode, because that
 * is the one a rendered story is most likely to be sampling.
 */

const WHOLE = 2 * Math.PI * RING_RADIUS;
const drawn = (dash: string) => Number(dash.split(" ")[0]);

describe("how much of the whole is done", () => {
  test("none of it, and all of it", () => {
    expect(fraction(0, 280)).toBe(0);
    expect(fraction(280, 280)).toBe(1);
  });

  test("part of the way", () => {
    expect(fraction(70, 280)).toBeCloseTo(0.25);
    expect(fraction(140, 280)).toBeCloseTo(0.5);
  });

  test("past the maximum it stays at the maximum", () => {
    // Overrunning is the consumer's to word; more than a full circle means
    // nothing, so the geometry refuses to draw it.
    expect(fraction(281, 280)).toBe(1);
    expect(fraction(1000, 280)).toBe(1);
  });

  test("below nothing it stays at nothing", () => {
    expect(fraction(-1, 280)).toBe(0);
  });

  test("a maximum of nothing is not a scale", () => {
    expect(fraction(5, 0)).toBe(0);
    expect(fraction(5, -1)).toBe(0);
  });
});

describe("the ring's dasharray", () => {
  test("names the length drawn, then the whole way round", () => {
    const [, whole] = ringDash(140, 280).split(" ");
    expect(Number(whole)).toBeCloseTo(WHOLE, 1);
  });

  test("draws nothing at the start and everything at the end", () => {
    expect(drawn(ringDash(0, 280))).toBe(0);
    expect(drawn(ringDash(280, 280))).toBeCloseTo(WHOLE, 1);
  });

  test("draws half the way round at half", () => {
    expect(drawn(ringDash(140, 280))).toBeCloseTo(WHOLE / 2, 1);
  });

  test("never draws more than the whole", () => {
    expect(drawn(ringDash(560, 280))).toBeCloseTo(WHOLE, 1);
  });

  test("scales with the radius it is drawn at", () => {
    const [, whole] = ringDash(1, 1, 20).split(" ");
    expect(Number(whole)).toBeCloseTo(2 * Math.PI * 20, 1);
  });
});
