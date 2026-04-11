import type { ComponentPropsWithRef, ReactNode } from "react";

export type InputVariant = "outlined" | "filled" | "underlined";
export type InputColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";
export type InputSize = "small" | "medium" | "large";

export interface InputProps extends Omit<
  ComponentPropsWithRef<"input">,
  "size" | "color"
> {
  variant?: InputVariant;
  color?: InputColor;
  inputSize?: InputSize; // use inputSize because HTML specifies size as an integer for width
  isInvalid?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  label?: string;
}
