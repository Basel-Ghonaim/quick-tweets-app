import type { ReactNode } from "react";
import type { FieldProps, NativeProps } from "../../shared";

export type InputVariant = "outlined" | "filled" | "underlined";

/**
 * A Field whose control is an Adorned Control: the affordances flanking it are
 * composed here, so a caller supplies a node per side and never a layout.
 */
export interface InputProps extends NativeProps<"input">, FieldProps {
  variant?: InputVariant;
  fullWidth?: boolean;
  /** Rendered before the control on the inline axis. */
  prefix?: ReactNode;
  /** Rendered after the control, alongside any affordance the field owns. */
  suffix?: ReactNode;
}
