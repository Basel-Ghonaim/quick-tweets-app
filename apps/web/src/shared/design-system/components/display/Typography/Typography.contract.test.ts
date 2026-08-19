import { describe, expect, test } from "vitest";
import type { TypographyProps } from "./Typography.types";

/**
 * The half of the contract a rendered test cannot reach.
 *
 * A title style has to choose its element, because looking like a heading is
 * not what puts one in the document outline. That requirement is enforced by
 * the type, so the only way to prove it holds is to write the call that must
 * not compile — and let the typecheck fail if it ever starts to.
 */
describe("Typography's element requirement", () => {
  test("a title style cannot omit its element", () => {
    // @ts-expect-error `as` is required alongside a title variant. If this
    // directive ever reports as unused, the requirement has been relaxed.
    const withoutElement: TypographyProps = { variant: "heading-large" };

    expect(withoutElement.variant).toBe("heading-large");
  });

  test("a text style may omit both, and defaults", () => {
    const bare: TypographyProps = {};
    expect(bare.variant).toBeUndefined();
  });
});
