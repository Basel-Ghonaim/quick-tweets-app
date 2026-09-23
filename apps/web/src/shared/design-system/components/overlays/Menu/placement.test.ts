import { describe, expect, test } from "vitest";
import { place } from "./placement";

/**
 * Where a surface goes is arithmetic over measured boxes, so it is proven here
 * rather than in a browser: the lane that renders can say a menu is on screen,
 * but not that it flipped for the right reason.
 */

const VIEWPORT = { width: 1000, height: 800 };
const SURFACE = { width: 240, height: 200 };

const triggerAt = (top: number, left: number, width = 40, height = 40) => ({
  top,
  left,
  bottom: top + height,
  right: left + width,
  width,
  height,
});

describe("menu placement", () => {
  test("sits after the trigger when there is room", () => {
    const at = place(triggerAt(100, 100), SURFACE, VIEWPORT, "block-end", "start", false);

    expect(at.side).toBe("block-end");
    expect(at.blockStart).toBe(148);
  });

  test("flips before the trigger when there is not", () => {
    // 40px of room below, 200px of surface: the preferred side cannot hold it.
    const at = place(triggerAt(740, 100), SURFACE, VIEWPORT, "block-end", "start", false);

    expect(at.side).toBe("block-start");
    expect(at.blockStart).toBe(740 - 8 - 200);
  });

  test("keeps the preferred side when neither fits, rather than jumping", () => {
    const tall = { width: 240, height: 780 };
    const at = place(triggerAt(400, 100), tall, VIEWPORT, "block-end", "start", false);

    expect(at.side).toBe("block-end");
  });

  test("aligns to the trigger's end edge when asked", () => {
    const at = place(triggerAt(100, 500), SURFACE, VIEWPORT, "block-end", "end", false);

    // The end edge is 540; the surface's 240 hangs back from it.
    expect(at.inlineStart).toBe(300);
  });

  test("shifts inward rather than hanging off the inline edge", () => {
    const at = place(triggerAt(100, 980), SURFACE, VIEWPORT, "block-end", "start", false);

    expect(at.inlineStart).toBe(VIEWPORT.width - 8 - SURFACE.width);
  });

  test("never shifts past the near edge either", () => {
    const at = place(triggerAt(100, -30), SURFACE, VIEWPORT, "block-end", "start", false);

    expect(at.inlineStart).toBe(8);
  });

  /**
   * The inline axis is measured from the edge the reader starts at, so the same
   * trigger produces a mirrored offset — and the stylesheet binds one property.
   */
  test("measures the inline offset from the reader's starting edge", () => {
    // Mid-viewport, so neither result is clamped and the mirroring is the only
    // thing the two can differ by.
    const trigger = triggerAt(100, 400);

    const ltr = place(trigger, SURFACE, VIEWPORT, "block-end", "start", false);
    const rtl = place(trigger, SURFACE, VIEWPORT, "block-end", "start", true);

    expect(ltr.inlineStart).toBe(trigger.left);
    expect(rtl.inlineStart).toBe(VIEWPORT.width - trigger.right);
  });

  test("the block axis does not mirror", () => {
    const trigger = triggerAt(100, 100);

    expect(place(trigger, SURFACE, VIEWPORT, "block-end", "start", true).blockStart).toBe(
      place(trigger, SURFACE, VIEWPORT, "block-end", "start", false).blockStart,
    );
  });
});
