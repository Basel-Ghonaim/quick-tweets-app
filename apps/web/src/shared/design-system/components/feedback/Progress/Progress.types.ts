import type { ControlProps, NativeProps } from "../../shared";

/** A bar reads along a line; a ring reads around one. The same fraction. */
export type ProgressShape = "linear" | "ring";

/**
 * How far along something is, drawn. It reports nothing: the surface that knows
 * what is progressing says so in words, because a fraction on its own tells a
 * reader neither what it measures nor whether it matters.
 */
export interface ProgressProps
  extends Omit<NativeProps<"span">, "children">,
    Pick<ControlProps, "color"> {
  /** How much is done, in the same terms as `max`. */
  value: number;

  /** The whole of it. A value past this draws as done rather than as more. */
  max: number;

  shape?: ProgressShape;
}
