import { describe, expect, test } from "vitest";
import type { ToggleButtonProps } from "./ToggleButton.types";

/** The half of the contract a rendered test cannot reach: what a caller may not
 *  say, which is only provable by writing the calls that must not compile. */
describe("ToggleButton's contract", () => {
  test("a caller cannot set the state the component reports", () => {
    const contradicting: ToggleButtonProps = {
      pressed: true,
      onPressedChange: () => {},
      children: "Bold",
      // @ts-expect-error removed from both halves. If this directive ever reports
      // as unused, a caller can contradict the state it handed in.
      "aria-pressed": false,
    };

    expect(contradicting.pressed).toBe(true);
  });

  test("an icon toggle cannot go unnamed", () => {
    // @ts-expect-error carrying no text, its name is required.
    const unnamed: ToggleButtonProps = {
      pressed: false,
      onPressedChange: () => {},
      icon: null,
    };

    expect(unnamed.pressed).toBe(false);
  });

  test("a toggle is one anatomy or the other, never both", () => {
    // @ts-expect-error an icon toggle takes no children.
    const both: ToggleButtonProps = {
      pressed: false,
      onPressedChange: () => {},
      icon: null,
      "aria-label": "Bold",
      children: "Bold",
    };

    expect(both.pressed).toBe(false);
  });

  test("each anatomy on its own is expressible", () => {
    const text: ToggleButtonProps = {
      pressed: false,
      onPressedChange: () => {},
      children: "Bold",
    };
    const icon: ToggleButtonProps = {
      pressed: true,
      onPressedChange: () => {},
      icon: null,
      "aria-label": "Bold",
    };

    expect([text.pressed, icon.pressed]).toEqual([false, true]);
  });
});
