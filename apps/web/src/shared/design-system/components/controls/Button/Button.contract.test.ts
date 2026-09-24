import { describe, expect, test } from "vitest";
import type { ButtonProps } from "./Button.types";

/**
 * The half of the contract a rendered test cannot reach: a destination refuses
 * every prop an action has and it cannot, so proving it means writing what must
 * not compile.
 *
 * Refused rather than ignored, because each of them would be a quiet lie. A link
 * has nothing to disable — an anchor without `href` leaves the focus order it
 * would announce into — it submits no form, and it cannot be busy, since
 * following it ends the page that would have shown the wait.
 */
describe("what a destination refuses", () => {
  test("an action may be disabled, be busy, and say so", () => {
    const action: ButtonProps = {
      disabled: true,
      isLoading: true,
      loadingText: "Submitting…",
      type: "submit",
    };

    expect(action.disabled).toBe(true);
  });

  test("a destination may not be disabled", () => {
    // @ts-expect-error a link has nothing to disable. If this directive ever
    // reports as unused, the arm has been widened.
    const destination: ButtonProps = { href: "/feed", disabled: true };

    expect(destination.href).toBe("/feed");
  });

  test("a destination may not be busy", () => {
    // @ts-expect-error following it ends the page that would show the wait.
    const destination: ButtonProps = { href: "/feed", isLoading: true };

    expect(destination.href).toBe("/feed");
  });

  test("a destination carries no submit behaviour", () => {
    // @ts-expect-error it submits no form, so it has no type to be.
    const destination: ButtonProps = { href: "/feed", type: "submit" };

    expect(destination.href).toBe("/feed");
  });
});
