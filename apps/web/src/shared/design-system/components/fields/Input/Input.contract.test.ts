import { describe, expect, test } from "vitest";
import type { InputProps } from "./Input.types";

/**
 * The half of the contract a rendered test cannot reach: an underline draws no boundary
 * for a shape to round, so the refusal is proved by the call that must not compile.
 */
describe("which variants take a shape", () => {
  test("a field with a boundary may be a pill", () => {
    const filled: InputProps = { variant: "filled", shape: "pill" };
    const outlined: InputProps = { variant: "outlined", shape: "pill" };
    const byDefault: InputProps = { shape: "pill" };

    expect([filled.shape, outlined.shape, byDefault.shape]).toEqual(["pill", "pill", "pill"]);
  });

  test("an underlined field takes no shape", () => {
    // @ts-expect-error an underline has no boundary to round. If this directive
    // ever reports as unused, the arm has been widened.
    const pill: InputProps = { variant: "underlined", shape: "pill" };

    expect(pill.variant).toBe("underlined");
  });

  test("not even the default one", () => {
    // @ts-expect-error `rounded` would be as false as `pill`: the radius is none.
    const rounded: InputProps = { variant: "underlined", shape: "rounded" };

    expect(rounded.variant).toBe("underlined");
  });

  test("the refusal holds for a password field too", () => {
    const password: InputProps = {
      type: "password",
      revealLabel: "Show password",
      variant: "filled",
      shape: "pill",
    };
    // @ts-expect-error the type's arm does not reopen what the variant's arm refused.
    const underlined: InputProps = { type: "password", revealLabel: "Show password", variant: "underlined", shape: "pill" };

    expect([password.shape, underlined.variant]).toEqual(["pill", "underlined"]);
  });
});
