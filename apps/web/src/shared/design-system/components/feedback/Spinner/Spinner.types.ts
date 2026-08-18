import type { ControlProps, NativeProps } from "../../shared";

/**
 * A presentational primitive rather than a control: it has no size, no state
 * and no label of its own. It takes its size from the text around it, so a host
 * changes it by changing its own font size.
 */
export interface SpinnerProps
  extends NativeProps<"span">,
    Pick<ControlProps, "color"> {}
