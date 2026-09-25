import type { Tone } from "../../../foundations";
import type { NativeProps } from "../../shared";

/** Where the link sits, which decides its target floor. Nothing can check that a
 *  caller placed it accordingly -- the name is the rule. */
export type LinkPlacement = "standalone" | "in-text";

/** How the underline behaves. Every style but `none` declares the line and moves
 *  only its colour, because `text-decoration-line` cannot be animated. */
export type LinkUnderline = "none" | "always" | "hover" | "subtle";

/** A navigation, not a Control: none of the control vocabulary, and no disabled
 *  state -- an `<a>` without `href` leaves the focus order it would announce into. */
export interface LinkProps extends Omit<NativeProps<"a">, "href"> {
  href: string;
  /** A link announces itself, so unlike text it cannot default to inheriting. */
  tone?: Tone;
  placement?: LinkPlacement;
  underline?: LinkUnderline;
}
