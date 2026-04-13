import type { ComponentPropsWithRef } from "react";

export type CheckboxColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";

export type CheckboxSize = "small" | "medium" | "large";

export interface CheckboxProps
  extends Omit<ComponentPropsWithRef<"input">, "size" | "color" | "type"> {
  /** Text label rendered beside the checkbox */
  label: string;
  color?: CheckboxColor;
  checkboxSize?: CheckboxSize;
  isInvalid?: boolean;
  /** Error message shown below the checkbox when isInvalid is true */
  errorMessage?: string;
}
