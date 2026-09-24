import type { NativeProps } from "../../shared";

/**
 * The shape a placeholder takes, not what it stands in for. A `line` is a run
 * of text, a `circle` is something round beside it, and a `block` is whatever
 * the surface knows it is about to draw.
 */
export type SkeletonShape = "block" | "circle" | "line";

/**
 * A placeholder held where content will be. It reports nothing: the arrangement
 * that composes it says the surface is loading, because only that arrangement
 * knows what is coming.
 *
 * Its size is the caller's. A skeleton stands in for something whose dimensions
 * belong to the layout around it, and this layer cannot see that layout.
 */
export interface SkeletonProps extends Omit<NativeProps<"span">, "children"> {
  shape?: SkeletonShape;
}
