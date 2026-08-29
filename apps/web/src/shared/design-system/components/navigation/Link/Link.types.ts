import type { ComponentProps, ComponentType } from "react";
import type { NativeProps } from "../../shared";

/** `in-text` is always underlined; `standalone` stands on its own. Which one is
 *  correct depends on placement, which nothing can check -- the name is the rule. */
export type LinkVariant = "standalone" | "in-text";

/** The navigating element, restricted by the props it must accept rather than by
 *  a list of tags, so a router's link qualifies without the layer importing one. */
export type LinkAs = "a" | ComponentType<ComponentProps<"a"> & { href: string }>;

/** A navigation, not a Control: none of the control vocabulary, and no disabled
 *  state -- an `<a>` without `href` leaves the focus order it would announce into. */
export interface LinkProps extends Omit<NativeProps<"a">, "href"> {
  href: string;
  as?: LinkAs;
  variant?: LinkVariant;
}
