import type { NativeProps } from "../../shared";

/** Named rather than given in pixels, so a measurement stays a swap instead of
 *  hardening into the public API (foundation.md, values are provisional). */
export type AvatarSize =
  | "small"
  | "medium"
  | "large"
  | "xlarge"
  | "xxlarge";

/**
 * A picture in a circle, with a fallback when there is none. Presentational: it
 * is not a control, and a surface that makes one activate supplies the element.
 */
export interface AvatarProps extends Omit<NativeProps<"span">, "children"> {
  /** An already-resolved address. Absent or unreachable, the fallback shows. */
  src?: string;

  /** What the picture means, empty where it means nothing. Required rather than
   *  defaulted: a default is a word chosen in one language for every caller. */
  alt: string;

  size?: AvatarSize;
}
