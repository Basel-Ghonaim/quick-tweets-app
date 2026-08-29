import { forwardRef, type ComponentProps, type FunctionComponent } from "react";
import { describe, expect, test } from "vitest";
import type { LinkAs } from "./Link.types";

/** The half of the contract a rendered test cannot reach: the navigating element
 *  is restricted by the type, so proving it means writing what must not compile. */
describe("Link's navigating element", () => {
  test("an adapter that forwards a ref satisfies it", () => {
    const Adapter = forwardRef<
      HTMLAnchorElement,
      ComponentProps<"a"> & { href: string }
    >(() => null);

    const as: LinkAs = Adapter;

    expect(as).toBe(Adapter);
  });

  test("an element demanding what a link never passes does not", () => {
    const Demanding: FunctionComponent<
      ComponentProps<"a"> & { href: string; tenantId: number }
    > = () => null;

    // @ts-expect-error `tenantId` is a prop Link cannot supply. If this directive
    // ever reports as unused, the restriction has been widened.
    const as: LinkAs = Demanding;

    expect(as).toBe(Demanding);
  });

  test("an element that is not a link does not", () => {
    const NotALink: FunctionComponent<{ count: number }> = () => null;

    // @ts-expect-error the anchor surface is the whole of the requirement.
    const as: LinkAs = NotALink;

    expect(as).toBe(NotALink);
  });
});
