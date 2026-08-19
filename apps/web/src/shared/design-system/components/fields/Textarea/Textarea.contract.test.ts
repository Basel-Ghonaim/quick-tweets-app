import { describe, expect, test } from "vitest";
import type { TextareaProps } from "./Textarea.types";

/**
 * The half of the contract a rendered test cannot reach.
 *
 * Growing with the content and being dragged by a handle answer the same
 * question, so the pair is unrepresentable rather than merely discouraged. The
 * only way to prove that holds is to write the calls that must not compile and
 * let the typecheck fail if either ever starts to.
 */
describe("Textarea's resize contract", () => {
  test("a growing control cannot also offer a handle", () => {
    // @ts-expect-error `resize` belongs only to the non-growing half. If this
    // directive ever reports as unused, the pair has become expressible.
    const both: TextareaProps = { autoResize: true, resize: "vertical" };

    expect(both.autoResize).toBe(true);
  });

  test("a ceiling belongs only to a control that grows", () => {
    // @ts-expect-error `maxRows` is meaningless without `autoResize`.
    const ceilingWithoutGrowth: TextareaProps = { maxRows: 6 };

    expect(ceilingWithoutGrowth.maxRows).toBe(6);
  });

  test("each half is expressible on its own", () => {
    const growing: TextareaProps = { autoResize: true, maxRows: 4 };
    const dragged: TextareaProps = { resize: "vertical" };

    expect(growing.maxRows).toBe(4);
    expect(dragged.resize).toBe("vertical");
  });
});
