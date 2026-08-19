import type { ControlProps, NativeProps } from "../../shared";

/**
 * A presentational primitive rather than a control: it has no size, no state
 * and no label of its own. It takes its size from the text around it, so a host
 * changes it by changing its own font size.
 *
 * **It is not Skeleton, and the two share no abstraction.** A Spinner reports
 * that an operation is running and can say nothing about how far along it is; a
 * Skeleton reports the shape content will take before it arrives. A surface that
 * knows its layout in advance reaches for the second, one that does not reaches
 * for this.
 *
 * So neither absorbs the other's responsibility or API: no `variant="skeleton"`,
 * no shared base, and no option that turns one into the other. Their only
 * relation is the boundary itself.
 */
export interface SpinnerProps
  extends NativeProps<"span">,
    Pick<ControlProps, "color"> {}
